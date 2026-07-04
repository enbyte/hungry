let { OPCODES } = require('./executor.js');
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst, UndefinedConstInst } = require("./inst.js")

function compile(ir) {
    let phiGroups = {};
    let bytecode = [];
    let pool = [];
    for (let b of ir.blocks) {
        for (let i of b.insts) {
            if (i instanceof UpsilonInst) {
                let phi = i.target;
                if (Object.keys(phiGroups).includes(phi.id)) {
                    phiGroups[phi.id].push(i);
                } else {
                    phiGroups[phi.id] = [i, phi];
                }
            }
        }
    }

    let defSites = new Set();
    for (let b of ir.blocks) {
        for (let i of b.insts) {
            if (i instanceof AssignmentInst) {
                defSites.add(i.target);
            }
        }
    }

    let slot = 0;
    function getSlot(inst) {
        if (inst.slot === undefined) {
            inst.slot = slot++;
        }
        return inst.slot;
    }

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
                    bytecode.push(OPCODES.STORE, getSlot(i));
                    break;
                case i instanceof UpsilonInst:
                    bytecode.push(OPCODES.LOAD, getSlot(i.val))
                    bytecode.push(OPCODES.STORE, getSlot(i.target));
                    break;
                case i instanceof PhiInst:
                    // written by upsilons
                    break;
                case i instanceof BinaryInst:
                    bytecode.push(OPCODES.LOAD, getSlot(i.left));
                    bytecode.push(OPCODES.LOAD, getSlot(i.right));
                    if (i.op == '+') {
                        bytecode.push(OPCODES.ADD);
                    } else if (i.op == '==') {
                        bytecode.push(OPCODES.EQUALS);
                    } else if (i.op == '<') {
                        bytecode.push(OPCODES.LT);
                    } else {
                        throw new Error(`Unimplemented binary op ${i} ${i.op}`);
                    }
                    bytecode.push(OPCODES.STORE, getSlot(i));
                    break;
                case i instanceof CondJumpInst:
                    bytecode.push(OPCODES.LOAD, getSlot(i.cond));
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