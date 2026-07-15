let { OPCODES } = require('./executor.js');
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst, RetInst, UnaryInst, GetArgumentInst, CallInst, ReturnInst } = require("./inst.js")

function calculateSlots(ir) {
    let slot = 0;
    function assignSlot(inst, doNull = false) {
        if (inst.slot == null) {
            inst.slot = doNull ? null : slot++;
        }
    }
    function assignNull(inst) {
        return assignSlot(inst, true)
    }
    for (let b of ir.blocks) {
        let vStack = [];
        for (let i of b.insts) {
            if (i instanceof UpsilonInst) {
                let phi = i.target;
                if (phi.slot != null) i.slot = phi.slot
                else i.slot = phi.slot = slot++;
            }
            switch (true) {
                case i instanceof ConstInst:
                    vStack.push(i.id);
                    break;
                case i instanceof GetArgumentInst:
                    vStack.push(i.id);
                    break;
                case i instanceof CallInst:
                    if (vStack.slice(-i.args.length).every((val, idx) => i.args.map(a => a.id)[idx] == val)) {
                        for (let j = 0; j < i.args.length; j++) {
                            vStack.pop();
                            assignNull(i.args[j])
                        }
                    } else {
                        for (let j = 0; j < i.args.length; j++) {
                            assignSlot(i.args[j])
                        }
                    }
                    vStack.push(i.id);
                    break;
                case i instanceof ReturnInst:
                    if (vStack.at(-1) == i.val.id) {
                        assignNull(i.val);
                        vStack.pop();
                    } else {
                        assignSlot(i.val);
                    }
                    break;
                case i instanceof BinaryInst:
                    if (vStack.at(-1) == i.right.id && vStack.at(-2) == i.left.id) {
                        assignNull(i.right);
                        assignNull(i.left);
                        vStack.pop(); vStack.pop();
                    } else {
                        assignSlot(i.right);
                        assignSlot(i.left);
                    }
                    vStack.push(i.id);
                    break;
                case i instanceof UnaryInst:
                    if (vStack.at(-1) == i.obj.id) {
                        assignNull(i.obj);
                        vStack.pop();
                    } else {
                        assignSlot(i.obj)
                    }
                    vStack.push(i.id);
                    break;
                case i instanceof PhiInst:
                    // vStack.push(i.id); // phis don't push: must load from slot
                    break;
                case i instanceof UpsilonInst:
                    if (!(vStack.at(-1) == i.val.id)) {
                        assignSlot(i.val);
                    } else {
                        assignSlot(i.val, true);
                        vStack.pop();
                    }
                    break;
                case i instanceof CondJumpInst:
                    if (!(vStack.at(-1) == i.cond.id)) {
                        assignSlot(i.cond);
                    } else {
                        assignSlot(i.cond, true)
                        vStack.pop();
                    }
                    break;
                case i instanceof JumpInst:
                    break;
                case i instanceof RetInst:
                    break;
                default:
                    throw new Error(`I can't calculateSlots for a ${i}!`)
            }
        }
    }
}

function getBinOpcode(op) {
    switch (op) {
        case '+':
            return OPCODES.ADD;
        case '-':
            return OPCODES.SUB;
        case '*':
            return OPCODES.MUL;
        case '/':
            return OPCODES.DIV;
        case '<<':
            return OPCODES.SHR;
        case '>>':
            return OPCODES.SHL;
        case '%':
            return OPCODES.MOD;
        case '<':
            return OPCODES.LT;
        case '>':
            return OPCODES.GT;
        case '<=':
            return OPCODES.LTE;
        case '>=':
            return OPCODES.GTE;
        case '==':
        case '===':
            return OPCODES.EQUALS;
        case '!=':
        case '!==':
            return OPCODES.NEQUALS;
        case '&':
            return OPCODES.BAND;
        case '^':
            return OPCODES.XOR;
        case '|':
            return OPCODES.BOR;
        case '&&':
            return OPCODES.AND;
        case '||':
            return OPCODES.OR;
        default:
            throw new Error(`I can't getOpcode of a ${op}!`);
    }
}

function getUnaryOpcode(op) {
    switch (op) {
        case '+':
            return OPCODES.NCONV;
        case '-':
            return OPCODES.NEG;
        case '~':
            return OPCODES.BNOT;
        default:
            throw new Error(`I can't getUnaryOpcode of a ${op}!`)
    }
}

function eliminateDeadOps(f) {
    for (let b of f.blocks) {
        for (let i of b.insts) {
            let consumed = false;
            for (let _b of f.blocks) {
                if (consumed) break;
                for (let _i of _b.insts) {
                    if (_i.operands.includes(i)) {
                        consumed = true;
                        break;
                    }
                    if (_i instanceof UpsilonInst && _i.val === i) {
                        consumed = true;
                        break;
                    }
                }
            }
            let isEndStack = (i instanceof BinaryInst && i.op == '+' && i.right instanceof ConstInst && i.right.val == 0);
            let isCtrlFlow = (i instanceof JumpInst ||
                              i instanceof CondJumpInst ||
                              i instanceof RetInst ||
                              i instanceof ReturnInst ||
                              i instanceof CallInst || // callInst can have side effects even if not consumed
                              i instanceof UpsilonInst ); // || i instanceof SideEffectInst
            
            if (!consumed && !isEndStack && !isCtrlFlow) {
                let idx = b.insts.indexOf(i);
                b.insts.splice(idx, 1);
            }
            if (i instanceof CallInst) {
                i.needsPop = !consumed;
            }
        }
    }
}

function compile(ir, passes) {
    let bytecode = [];
    let pool = [];

    let fnByName = new Map();
    for (let f of ir.functions) {
        fnByName.set(f.name, f);
    }

    let blockLocs = {};

    for (let f of ir.functions) {
        eliminateDeadOps(f);
        calculateSlots(f);

        let defSites = new Set();
        for (let b of f.blocks) {
            for (let i of b.insts) {
                if (i instanceof AssignmentInst) {
                    defSites.add(i.target);
                }
                if (i instanceof CallInst) {
                    i.calleeEntry = fnByName.get(i.name).entry;
                }
            }
        }

        let maxSlot = -1;
        for (let b of f.blocks) {
            for (let i of b.insts) {
                if (i.slot != null) maxSlot = Math.max(maxSlot, i.slot);
                if (i instanceof UpsilonInst) {
                    if (i.val && i.val.slot != null) maxSlot = Math.max(maxSlot, i.val.slot);
                    if (i.target && i.target.slot != null) maxSlot = Math.max(maxSlot, i.target.slot);
                }
                for (let op of i.operands) {
                    if (op && op.slot != null) maxSlot = Math.max(maxSlot, op.slot);
                }
            }
        }
        let tempBase = maxSlot + 1;

        for (let b of f.blocks) {
            blockLocs[b.id] = bytecode.length;
            let insts = b.insts;
            let idx = 0;
            while (idx < insts.length) {
                let i = insts[idx];
                if (i instanceof UpsilonInst) {
                    let run = [];
                    while (idx < insts.length && insts[idx] instanceof UpsilonInst) {
                        run.push(insts[idx]);
                        idx++;
                    }

                    let writtenSlots = new Set();
                    let hasHazard = false;
                    for (let ups of run) {
                        if (ups.val.slot !== null && writtenSlots.has(ups.val.slot)) {
                            hasHazard = true;
                        }
                        writtenSlots.add(ups.target.slot);
                    }

                    if (!hasHazard) {
                        for (let ups of run) {
                            if (ups.val.slot !== null) {
                                bytecode.push(OPCODES.LOAD, ups.val.slot);
                            }
                            bytecode.push(OPCODES.STORE, ups.target.slot);
                        }
                    } else {
                        let temps = [];
                        for (let ups of run) {
                            let temp = tempBase + temps.length;
                            temps.push(temp);
                            if (ups.val.slot !== null) {
                                bytecode.push(OPCODES.LOAD, ups.val.slot);
                            }
                            bytecode.push(OPCODES.STORE, temp);
                        }
                        for (let j = 0; j < run.length; j++) {
                            bytecode.push(OPCODES.LOAD, temps[j]);
                            bytecode.push(OPCODES.STORE, run[j].target.slot);
                        }
                    }
                } else {
                    switch (true) {
                        case i instanceof ConstInst:
                            if (pool.includes(i.val)) {
                                bytecode.push(OPCODES.LOAD_CONST);
                                bytecode.push(pool.indexOf(i.val));
                            } else {
                                bytecode.push(OPCODES.LOAD_CONST);
                                bytecode.push(pool.length);
                                pool.push(i.val);
                            }
                            if (i.slot !== null) {
                                bytecode.push(OPCODES.STORE, i.slot);
                            }
                            break;
                        case i instanceof PhiInst:
                            break;
                        case i instanceof BinaryInst:
                            if (i.left.slot !== null) { bytecode.push(OPCODES.LOAD, i.left.slot); }
                            if (i.right.slot !== null) { bytecode.push(OPCODES.LOAD, i.right.slot); }
                            bytecode.push(getBinOpcode(i.op))
                            if (i.slot !== null) { bytecode.push(OPCODES.STORE, i.slot) };
                            break;
                        case i instanceof UnaryInst:
                            if (i.obj.slot !== null) {
                                bytecode.push(OPCODES.LOAD, i.obj.slot);
                            }
                            bytecode.push(getUnaryOpcode(i.op));
                            if (i.slot !== null) {
                                bytecode.push(OPCODES.STORE, i.slot);
                            }
                            break;
                        case i instanceof CondJumpInst:
                            if (i.cond.slot !== null) { bytecode.push(OPCODES.LOAD, i.cond.slot); }
                            bytecode.push(OPCODES.JUMP_IF);
                            bytecode.push(i.target.id);
                            bytecode.push(i.alternate.id);
                            break;
                        case i instanceof JumpInst:
                            bytecode.push(OPCODES.JUMP);
                            bytecode.push(i.target_block.id);
                            break;
                        case i instanceof RetInst:
                            bytecode.push(OPCODES.RET);
                            break;
                        case i instanceof GetArgumentInst:
                            bytecode.push(OPCODES.GET_ARG);
                            bytecode.push(i.idx)
                            if (i.slot !== null) {
                                bytecode.push(OPCODES.STORE, i.slot);
                            }
                            break;
                        case i instanceof CallInst:
                            for (let arg of i.args) {
                                if (arg.slot !== null) {
                                    bytecode.push(OPCODES.LOAD, arg.slot);
                                }
                            }
                            bytecode.push(OPCODES.CALL);
                            bytecode.push(i.calleeEntry.id);
                            bytecode.push(i.args.length);
                            if (i.slot !== null) {
                                bytecode.push(OPCODES.STORE, i.slot);
                            } else {
                                if (i.needsPop) {
                                    bytecode.push(OPCODES.POP);
                                }
                            }
                            break;
                        case i instanceof ReturnInst:
                            if (i.val.slot !== null) {
                                bytecode.push(OPCODES.LOAD, i.val.slot);
                            }
                            bytecode.push(OPCODES.RETURN);
                            break;
                        default:
                            throw new Error(`Unimplemented inst compile ${i}`);
                    }
                    idx++;
                }
            }
        }
    }

    for (let i = 0; i < bytecode.length; i++) {
        if (Object.keys(blockLocs).includes(bytecode[i])) {
            bytecode[i] = blockLocs[bytecode[i]]
        }
    }

    for (let pass of passes) {
        [ir, bytecode, pool] = pass.transform(ir, bytecode, pool);
    }

    return [bytecode, pool];
}

module.exports = { compile };
