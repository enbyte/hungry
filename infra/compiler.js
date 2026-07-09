let { OPCODES } = require('./executor.js');
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst, RetInst, UnaryInst } = require("./inst.js")

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

function calculateSlotsNoOpti(ir) {
    let slot = 0;
    function getSlot(inst) {
        if (inst.slot == null) {
            inst.slot = slot++;
        }
        return inst.slot;
    }

    
}

function compile(ir, passes) {
    let bytecode = [];
    let pool = [];

    calculateSlots(ir);
    // console.log(ir.toString());

    let defSites = new Set();
    for (let b of ir.blocks) {
        for (let i of b.insts) {
            if (i instanceof AssignmentInst) {
                defSites.add(i.target);
            }
        }
    }

    let slot = 1;
    

    let maxSlot = -1;
    for (let b of ir.blocks) {
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

    let blockLocs = {};
    for (let b of ir.blocks) {
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
                    default:
                        throw new Error(`Unimplemented inst compile ${i}`);
                }
                idx++;
            }
        }
    }
    for (let i = 0; i < bytecode.length; i++) {
        if (Object.keys(blockLocs).includes(bytecode[i])) {
            bytecode[i] = blockLocs[bytecode[i]]
        }
    }

    for (let pass of passes) {
        let [ir, bytecode, pool] = pass.transform(ir, bytecode, pool);
    }

    return [bytecode, pool];
}

module.exports = { compile };
