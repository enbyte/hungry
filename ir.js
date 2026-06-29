const { parse } = require("@babel/parser");
const t = require("@babel/types");
const { Block } = require("./block.js")
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst } = require("./inst.js")

function reversePostOrder(entry) {
    let visited = new Set();
    let po = [];

    function dfs(block) {
        if (visited.has(block)) {
            return;
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
    constructor(src) {
        this.src = src;
        this.ast = parse(src).program.body;


        this.entry = new Block();
        this.blocks = [this.entry];
        this.block = this.entry;

        this.lower();
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
            id = this.lowerStatement(stmt.id);
            inst = new AssignmentInst(id, init);
            this.block.insts.push(inst);
            return inst;
        } else if (t.isIdentifier(stmt)) {
            inst = new IdentifierRefInst(stmt.name);
            this.block.insts.push(inst);
            return inst;
        } else if (t.isAssignmentExpression(stmt)) {
            id = this.lowerStatement(stmt.left);
            init = this.lowerStatement(stmt.right);
            inst = new AssignmentInst(id, init);
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
                this.blocks.push(body);
                this.blocks.push(post);
                this.block.addChild(body);
                this.block.addChild(post);
                let cond = this.lowerStatement(expr.test);
                this.block.insts.push(new CondJumpInst(cond, body));
                this.block.insts.push(new JumpInst(post));
                this.block = body;
                this.lower(expr.consequent.body);
                this.block = post;
            } else {
                throw new Error(`Unimplemented top-level expression type ${expr.type}`);
            }
        }
    }

    computeDominance() {
        let [rpo, rpo_index] = reversePostOrder(this.entry);
        
        let idom = {};
        for (let block of rpo) {
            idom[block] = null;
        }



    }

    toString() {
        let s = "";
        for (let b of this.blocks) {
            s += `${b.id}:\n`
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