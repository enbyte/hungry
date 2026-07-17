const { RetInst, ReturnInst, CondJumpInst, JumpInst } = require('./inst.js');

class Block {
    static id = 0;

    constructor() {
        this.id = `b-${Block.id++}`;
        this.children = [];
        this.predecessors = [];
        this.insts = [];

        this.idom = null;
        this.dominators = [];
        this.domChildren = [];
        this.frontier = [];

    }

    addChild(child, updateChild = true) {
        this.children.push(child)
        updateChild && child.predecessors.push(this);
    }

    addChildren(...children) {
        for (let child of children) {
            this.addChild(child);
        }
    }

    isTerminated() {
        if (this.insts.length == 0) {
            return false;
        }
        let last = this.insts.at(-1);
        return last instanceof ReturnInst ||
            last instanceof RetInst ||
            last instanceof JumpInst ||
            last instanceof CondJumpInst;
    }

    toString() {
        return `${this.id}`;
    }
}

module.exports = {
    Block
}
