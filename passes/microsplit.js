const { Block } = require("../infra/block.js");
const { JumpInst, CondJumpInst, UpsilonInst } = require("../infra/inst.js");

class MicrosplitPass {
    constructor(config = {}) {
        this.config = { 
            minBlockSize: 2,
            maxBlockSize: 6,
            ...config
        }
    }

    spreadIntoN(block) {
        let initial = new Block();
        let final = new Block();

        initial.predecessors = block.predecessors;
        initial.idom = block.idom;
        initial.dominators = block.dominators;
        initial.domChildren = block.domChildren;
        initial.frontier = block.frontier;

        final.children = block.children;

        let sizes = [];
        let idx = 0;
        while (idx < block.insts.length) {
            let remaining = block.insts.length - idx;
            if (remaining <= 2 * this.config.minBlockSize) {
                sizes.push(remaining);
                break;
            }

            let maxSize = this.config.maxBlockSize > block.insts.length - idx ? block.insts.length - idx : this.config.maxBlockSize;
            let len = Math.floor(Math.random() * (maxSize - this.config.minBlockSize + 1)) + this.config.minBlockSize;
            if (len >= block.insts.length - idx) {
                len = block.insts.length - idx - 1;
            }
            sizes.push(len);
            idx += len;
        }


        if (sizes.length == 1) {
            return [block]; // unable to split
        }

        let merged = [];
        let i = 0;
        while (i < sizes.length) {
            let sz = sizes[i];
            i++;
            while (i < sizes.length) {
                let boundary = merged.reduce((a, b) => a + b, 0) + sz;
                if (block.insts[boundary - 1] instanceof UpsilonInst &&
                    block.insts[boundary] instanceof UpsilonInst) {
                    sz += sizes[i];
                    i++;
                } else {
                    break;
                }
            }
            merged.push(sz);
        }
        sizes = merged;

        if (sizes.length == 1) {
            return [block]; // unable to split
        }

        let offsets = [0];
        for (let s of sizes) {
            offsets.push(offsets.at(-1) + s);
        }

        initial.insts = block.insts.slice(0, offsets[1]);
        final.insts = block.insts.slice(offsets[sizes.length - 1], offsets[sizes.length]);

        let blocks = [initial, final];
        for (let k = 0; k < sizes.length - 2; k++) {
            blocks.splice(1, 0, new Block());
        }

        blocks[0].addChild(blocks[1]);
        blocks[0].insts.push(new JumpInst(blocks[1]))

        for (let i = 1; i < sizes.length - 1; i++) {
            let b = blocks[i]
            b.insts = block.insts.slice(offsets[i], offsets[i + 1]);
            b.insts.push(new JumpInst(blocks[i + 1]));
            b.addChild(blocks[i + 1]);
        }

        return blocks;
    }

    transform(ir) {
        for (let f of ir.functions) {
            let newBlocks = [];
            let allBlocks = [...f.blocks];
            for (let b of f.blocks) {
                if (b.insts.length <= 2 * this.config.minBlockSize) {
                    newBlocks.push(b);
                    continue;
                }
                let n = this.spreadIntoN(b);
                if (n.length == 1) {
                    newBlocks.push(b);
                    continue;
                }

                let first = n[0];
                let last = n[n.length - 1];

                for (let other of allBlocks) {
                    for (let i = 0; i < other.children.length; i++) {
                        if (other.children[i] === b) other.children[i] = first;
                    }
                    for (let i = 0; i < other.predecessors.length; i++) {
                        if (other.predecessors[i] === b) other.predecessors[i] = last;
                    }
                    for (let inst of other.insts) {
                        if (inst instanceof JumpInst && inst.target_block === b) {
                            inst.target_block = first;
                        } else if (inst instanceof CondJumpInst) {
                            if (inst.target === b) inst.target = first;
                            if (inst.alternate === b) inst.alternate = first;
                        }
                    }
                }

                if (f.entry === b) {
                    f.entry = first;
                }

                newBlocks.push(...n);
                allBlocks.push(...n);
            }
            f.blocks = newBlocks;
            f.dirty = true;
        }
    }
}

module.exports = {
    MicrosplitPass
}