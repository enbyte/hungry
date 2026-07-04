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

    toString() {
        return `${this.id}, doms [${this.dominators.map(x => x.id).join(', ')}], domChildren [${this.domChildren.map(x => x.id).join(', ')}]`;
    }
}

module.exports = {
    Block
}