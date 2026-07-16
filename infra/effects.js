class Effects {
    constructor(reads = [], writes = []) {
        this.reads = reads;
        this.writes = writes;
    }

    interferesWith(other) {
        for (const w of this.writes) {
            for (const r of other.reads) {
                if (interferes(w, r)) return true;
            }
        }
        for (const w of other.writes) {
            for (const r of this.reads) {
                if (interferes(w, r)) return true;
            }
        }
        for (const w of this.writes) {
            for (const ow of other.writes) {
                if (interferes(w, ow)) return true;
            }
        }
        return false;
    }
}

const Pure = new Effects();

class AbstractHeap {
    constructor(name, parent = null) {
        this.name = name;
        this.parent = parent;
        this.children = [];
        if (parent) {
            parent.children.push(this);
        }
    }
}

const World = new AbstractHeap('World');
const Memory = new AbstractHeap('Memory', World);
const SSAState = new AbstractHeap('SSAState', World);
const Control = new AbstractHeap('Control', World);
const IO = new AbstractHeap('IO', World);

let counter = 0;
function assignRanges(node) {
    node.pre = counter++;
    for (const c of node.children) assignRanges(c);
    node.post = counter++;
}
assignRanges(World);

function interferes(a, b) {
    return a.pre <= b.post && b.pre <= a.post;
}

module.exports = {
    AbstractHeap, Effects,
    Pure, World, Memory, SSAState, Control, IO
}