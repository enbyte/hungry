class Block {
    static id = 0;

    constructor() {
        this.id = `b-${Block.id++}`;
        this.children = [];
        this.predecessors = [];
        this.dominators = [];
        this.insts = [];
    }

    addChild(child, updateChild = true) {
        this.children.push(child)
        updateChild && child.predecessors.push(this);
    }
}

module.exports = {
    Block
}