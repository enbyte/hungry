let { OPCODES } = require('./executor.js');
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst } = require("./inst.js")

function calculateSlots(ir) {
    let slot = 0;
    function assignSlot(inst, doNull = false) {
        if (inst.slot == null) {
            inst.slot = doNull ? null : slot++;
        }
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
                        assignSlot(i.right, true);
                        assignSlot(i.left, true);
                        vStack.pop(); vStack.pop();
                    } else {
                        assignSlot(i.right);
                        assignSlot(i.left);
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
                default:
                    throw new Error(`I can't calculateSlots for a ${i}!`)
            }
        }
    }
}

function compile(ir) {
    let bytecode = [];
    let pool = [];

    calculateSlots(ir);
    console.log(ir.toString());

    let defSites = new Set();
    for (let b of ir.blocks) {
        for (let i of b.insts) {
            if (i instanceof AssignmentInst) {
                defSites.add(i.target);
            }
        }
    }

    let slot = 1;
    

    let blockLocs = {};
    for (let b of ir.blocks) {
        blockLocs[b.id] = bytecode.length;
        for (let i of b.insts) {
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
                case i instanceof UpsilonInst:
                    if (i.val.slot !== null) {
                        bytecode.push(OPCODES.LOAD, i.val.slot);
                    };
                    bytecode.push(OPCODES.STORE, i.target.slot);
                    break;
                case i instanceof PhiInst:
                    // written by upsilons
                    break;
                case i instanceof BinaryInst:
                    if (i.left.slot !== null) { bytecode.push(OPCODES.LOAD, i.left.slot); }
                    if (i.right.slot !== null) { bytecode.push(OPCODES.LOAD, i.right.slot); }
                    if (i.op == '+') {
                        bytecode.push(OPCODES.ADD);
                    } else if (i.op == '==') {
                        bytecode.push(OPCODES.EQUALS);
                    } else if (i.op == '<') {
                        bytecode.push(OPCODES.LT);
                    } else {
                        throw new Error(`Unimplemented binary op ${i} ${i.op}`);
                    }
                    if (i.slot !== null) { bytecode.push(OPCODES.STORE, i.slot) };
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
                default:
                    throw new Error(`Unimplemented inst compile ${i}`);
            }
        }
    }
    for (let i = 0; i < bytecode.length; i++) {
        if (Object.keys(blockLocs).includes(bytecode[i])) {
            bytecode[i] = blockLocs[bytecode[i]]
        }
    }
    return [bytecode, pool];
}

module.exports = { compile };