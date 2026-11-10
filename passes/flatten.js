const { Block } = require('../infra/block.js');
const { PhiInst, JumpInst, UpsilonInst, CondJumpInst, BinaryInst, UnaryInst, ConstInst, MaybeJumpInst, ReturnInst, RetInst } = require('../infra/inst.js');

const shuffle = arr => arr.sort(() => Math.random() - 0.5);

class ControlFlowFlattenPass { 
    constructor() {
    }

    assignBlockLabels(ir) {
        let numBlocks = 0;
        let label = 0
        for (let f of ir.functions) {
            for (let b of f.blocks) {
                b._cff_id = `_controlflow_id_${label++}`;
                numBlocks++;
            }
        }
        let maxValue = Math.pow(2, Math.ceil(Math.log2(numBlocks)));
        // 0 .. 255 for 129-255 blocks, etc - smaller values look more normal
        let vals = shuffle(Array.from({ length: maxValue }, (_, i) => i));
        for (let f of ir.functions) {
            for (let b of f.blocks) {
                b._cff_jump_tag = vals.pop();
            }
        }
    }

    rewriteBlock(block, state, dispatcher) {
        let jmp = block.insts.pop();
        if (jmp instanceof JumpInst) {
            let next = new ConstInst(jmp.target_block._cff_jump_tag);
            block.insts.push(next, new UpsilonInst(next, state),
                new JumpInst(dispatcher));
        } else if (jmp instanceof CondJumpInst) {
            // state = (!!cond * true_jump) + (!cond * false_jump)
            let cond = jmp.cond;
            let notCond = new UnaryInst('!', cond);
            let notNotCond = new UnaryInst('!', notCond);
            let tagT = new ConstInst(jmp.target._cff_jump_tag);
            let tagA = new ConstInst(jmp.alternate._cff_jump_tag);
            let first = new BinaryInst('*', notNotCond, tagT);
            let second = new BinaryInst('*', notCond, tagA);
            let sum = new BinaryInst('+', first, second);

            block.insts.push(...[
                notCond,
                notNotCond,
                tagT,
                tagA,
                first,
                second,
                sum,
                new UpsilonInst(sum, state),
                new JumpInst(dispatcher)
            ]);
        } else if (jmp instanceof ReturnInst
                || jmp instanceof RetInst
        ) {
            block.insts.push(jmp);
        } else {
            throw new Error(`Block ${block.id} doesn't end with a jump??`);
        }
    }

    transformFunction(fn) {
        let dispatcher = new Block();

        let state = new PhiInst('_cff_state');
        dispatcher.insts.push(state);
        
        let blocks = [...fn.blocks];
        let entry = fn.entry;

        let entryTag = new ConstInst(entry._cff_jump_tag);

        let prologue = new Block();
        prologue.insts.push(entryTag,
            new UpsilonInst(entryTag, state),
            new JumpInst(dispatcher)
        );

        for (let b of blocks) {
            this.rewriteBlock(b, state, dispatcher);
            let tag = new ConstInst(b._cff_jump_tag);
            let should_jump = new BinaryInst('==', state, tag);
            let jump = new MaybeJumpInst(should_jump, b);
            dispatcher.insts.push(tag, should_jump, jump);
        }
        
        dispatcher.insts.push(new JumpInst(entry));

        dispatcher.addChild(entry);
        prologue.addChild(dispatcher);

        fn.entry = prologue;
        fn.blocks.push(dispatcher, prologue);


        
    }

    transform(ir) {
        this.assignBlockLabels(ir);

        for (let f of ir.functions) {
            this.transformFunction(f);
        }
    }
}

module.exports = {
    ControlFlowFlattenPass
}