const { parse } = require("@babel/parser");
const t = require("@babel/types");
const { Block } = require("./block.js")
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst, UndefinedConstInst, RetInst } = require("./inst.js")

function reversePostOrder(entry) {
    let visited = new Set();
    let po = [];

    function dfs(block) {
        if (visited.has(block)) {
            return; // the world if you could visited.has && return;:
        }

        visited.add(block);

        for (let child of block.children) {
            dfs(child);
        }

        po.unshift(block); // nooo unshift is O(n) what if you compiled a program with a gazillion blocks bro nooo
    }

    dfs(entry);

    let po_index = {};
    for (let i = 0; i < po.length; i++) {
        po_index[po[i]] = i;
    }
    return [po, po_index];
}
class IR {
    constructor(src, passes) {
        this.src = src;
        this.ast = parse(src).program.body;


        this.entry = new Block();
        this.blocks = [this.entry];
        this.block = this.entry;

        // console.log(`Entry id is ${this.entry.id}`);

        this.lower();
        this.computeDominance();
        this.placePhis();
        this.rename();
        this.nukeVestigialAssignmentsSoMuchExtraSlopGrrr();
        this.addRet();

        for (let pass of passes) {
            pass.transform(this.ir)
        }
    }

    getBlock(id) {
        return this.blocks.find(b => b.id == id);
    }

    lowerStatement(stmt) {
        let left, right, inst, init, id;
        if (t.isBinaryExpression(stmt)) {
            left = this.lowerStatement(stmt.left);
            right = this.lowerStatement(stmt.right);
            inst = new BinaryInst(stmt.operator, left, right);
            this.block.insts.push(inst);
            return inst;
        } else if (t.isLiteral(stmt)) {
            inst = new ConstInst(stmt.value);
            this.block.insts.push(inst);
            return inst;
        } else if (t.isVariableDeclarator(stmt)) {
            init = this.lowerStatement(stmt.init);
            inst = new AssignmentInst(stmt.id.name, init);
            this.block.insts.push(inst);
            return inst;
        } else if (t.isIdentifier(stmt)) {
            return new IdentifierRefInst(stmt.name);
        } else if (t.isAssignmentExpression(stmt)) {
            init = this.lowerStatement(stmt.right);
            inst = new AssignmentInst(stmt.left.name, init);
            this.block.insts.push(inst);
            return inst;
        } else {
            throw new Error(`Unimplemented expression type ${stmt.type}`);
        }
    }

    lower(target = this.ast) {
        for (let expr of target) { // [*Statement|VariableDeclaration, ...]
            if (t.isExpressionStatement(expr)) {
                this.lowerStatement(expr.expression)
            } else if (t.isVariableDeclaration(expr)) {
                for (let decl of expr.declarations) {
                    this.lowerStatement(decl);
                }
            } else if (t.isIfStatement(expr)) {
                let body = new Block();
                let post = new Block();

                this.blocks.push(body, post);
                this.block.addChildren(body, post);

                let cond = this.lowerStatement(expr.test);
                this.block.insts.push(new CondJumpInst(cond, body, post));
                this.block = body;
                this.lower(expr.consequent.body);

                this.block.insts.push(new JumpInst(post));
                this.block.addChild(post);
                this.block = post;
            } else if (t.isWhileStatement(expr)) {
                let cond = new Block();
                let body = new Block();
                let post = new Block();
                this.blocks.push(cond, body, post);

                this.block.addChild(cond);
                cond.addChildren(body, post);

                this.block.insts.push(new JumpInst(cond));
                this.block = cond;
                let test = this.lowerStatement(expr.test);
                this.block.insts.push(new CondJumpInst(test, body, post));

                this.block = body;
                this.lower(expr.body.body);
                this.block.insts.push(new JumpInst(cond));
                this.block.addChild(cond);

                this.block = post;
            } else {
                throw new Error(`Unimplemented top-level expression type ${expr.type}`);
            }
        }
    }

    addRet() {
        for (let b of this.blocks) {
            if (b.children.length == 0) {
                b.insts.push(new RetInst());
            }
        }
    }

    computeDominance() {
        let [rpo, rpo_index] = reversePostOrder(this.entry);

        let idom = new Map();
        for (let block of rpo) {
            idom.set(block, null);
        }

        idom.set(this.entry, this.entry);

        function intersect(b1, b2) {
            let finger1 = b1;
            let finger2 = b2;
            while (rpo_index[finger1] != rpo_index[finger2]) {
                while (rpo_index[finger1] > rpo_index[finger2]) {
                    finger1 = idom.get(finger1);
                }
                while (rpo_index[finger2] > rpo_index[finger1]) {
                    finger2 = idom.get(finger2);
                }
            }
            return finger1;
        }

        let updated = true;
        while (updated) {
            updated = false;
            for (let block of rpo.slice(1)) { // no entry
                let processed = [];
                for (let p of block.predecessors) {
                    if (idom.get(p) != null) {
                        processed.push(p);
                    }
                }

                if (processed.length == 0) {
                    continue;
                }

                let new_idom = processed[0];
                for (let proc of processed.slice(1)) {
                    new_idom = intersect(proc, new_idom);
                }

                if (idom.get(block) != new_idom) {
                    idom.set(block, new_idom);
                    updated = true;
                }

            }
        }

        for (let [block, dom] of idom.entries()) {
            block.idom = dom;
            block.dominators.push(block);
            if (dom !== block) block.dominators.push(dom); // prevent entry from listing itself twice

            if (block !== this.entry) {
                dom.domChildren.push(block);   // immediate dominator only, once
            }

            while (dom != this.entry) {
                block.dominators.push(idom.get(dom));
                dom = idom.get(dom);
            }
        }

        let frontiers = new Map();

        let runner;
        for (let block of this.blocks) {
            if (block.predecessors.length >= 2) {
                for (let pred of block.predecessors) {
                    runner = pred;
                    while (runner != block.idom) {
                        if (frontiers.has(runner)) {
                            frontiers.get(runner).push(block);
                        } else {
                            frontiers.set(runner, [block]);
                        }
                        runner = idom.get(runner);
                    }
                }
            }
        }

        for (let [block, frontier] of frontiers) {
            block.frontier = frontier;
        }
    }

    computeAssignments() {
        let defs = new Map();
        for (let block of this.blocks) {
            for (let inst of block.insts) {
                if (inst instanceof AssignmentInst) {
                    if (!defs.has(inst.iden)) {
                        defs.set(inst.iden, [block]);
                    } else if (!defs.get(inst.iden).includes(block)) {
                        defs.get(inst.iden).push(block);
                    }
                }
            }
        }

        return defs;
    }

    placePhis() {
        let hasPlacedPhi = new Map();
        let assgn = this.computeAssignments();
        for (let [vari, blocks] of assgn) {
            hasPlacedPhi.set(vari, []);
            while (blocks.length > 0) {
                let b = blocks.pop();
                for (let y of b.frontier) {
                    if (!hasPlacedPhi.get(vari).includes(y)) {
                        y.insts.unshift(new PhiInst(vari));
                        hasPlacedPhi.get(vari).push(y);
                        if (!blocks.includes(y)) {
                            blocks.push(y);
                        }
                    }
                }
            }
        }
    }

    rename() {
        this.assgn = this.computeAssignments();

        this.stack = new Map();
        this.undef = new UndefinedConstInst();
        for (let vari of this.assgn.keys()) {
            this.stack.set(vari, [this.undef]);
        }

        this.renameBlock(this.entry);
    }

    renameBlock(b) {
        let mark = {};
        for (let vari of this.assgn.keys()) {
            mark[vari] = this.stack.get(vari).length;
        }

        for (let i of b.insts) {
            if (i instanceof PhiInst) {
                this.stack.get(i.vari).push(i);
            } else {
                for (let j = 0; j < i.operands.length; j++) {
                    let op = i.operands[j];
                    if (op instanceof IdentifierRefInst) {
                        i.operands[j] = this.stack.get(op.name).at(-1);
                    }
                }
                if (i instanceof AssignmentInst) {
                    this.stack.get(i.iden).push(i.init);
                }
            }
        }

        for (let s of b.children) {
            for (let p of s.insts) {
                if (p instanceof PhiInst) {
                    let ups = new UpsilonInst(this.stack.get(p.vari).at(-1), p);
                    b.insts.splice(b.insts.length - 1, 0, ups);
                }
            }
        }

        for (let c of b.domChildren) {
            this.renameBlock(c);
        }

        for (let [vari, stack] of this.stack) {
            stack.length = mark[vari];
        }

    }

    nukeVestigialAssignmentsSoMuchExtraSlopGrrr() {
        for (let b of this.blocks) {
            b.insts = b.insts.filter(inst => !(inst instanceof AssignmentInst));
        }
    }

    toString() {
        let s = "";
        for (let b of this.blocks) {
            s += `${b.toString()}:\n`
            for (let inst of b.insts) {
                s += '  ' + inst.toString() + '\n';
            }
        }
        return s;
    }
}

module.exports = {
    IR
}
