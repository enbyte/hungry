const { parse } = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const { Block } = require("./block.js")
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst, UndefinedConstInst, RetInst, ReturnInst, UnaryInst } = require("./inst.js");
const { IRFunction } = require("./ir_function.js");

let transformNonAnonFnDecls = {
    FunctionDeclaration(path) {
        let name = path.node.id?.name;
        path.replaceWith(
            t.variableDeclaration('let', [t.variableDeclarator(
            path.node.id,
            t.functionExpression(
                null, // no id
                path.node.params,
                path.node.body,
                path.node.generator,
                path.node.async
            )
        )]));

        path.node.__evil_ass_annotation_name = name;
    }
}

let extractFnDeclsVisitor = {
    FunctionExpression: {
        exit(path, state) {
            let id = `__hoisted_$${IR.fnId++}_${path.node.__evil_ass_annotation_name ? path.node.__evil_ass_annotation_name : 'anonymous'}`
            state.hoisted.set(id, path.node);
            path.replaceWith(t.stringLiteral(`__NOT_A_STRING_FN_LITERAL_REF-${id}`));
            path.node.__evil_ass_i_am_a_secret_function_annotation = true;
        }
    }
}


class IR {

    static fnId = 0;

    constructor(src, passes) {

        this.src = src;
        this.raw = parse(src);

        const hoisted = new Map();

        traverse(this.raw, transformNonAnonFnDecls);
        traverse(this.raw, extractFnDeclsVisitor, null, { hoisted });


        this.ast = this.raw.program.body;

        console.log(generate(this.raw.program).code);


        this.entry = new IRFunction('_entry', this.ast, []);

        this.functions = [this.entry]; // , ...fns.map(fn => new IRFunction(fn.id.name, fn.body.body, fn.params))]

        for (let [name, node] of hoisted.entries()) {
            this.functions.push(new IRFunction(name, node.body.body, node.params));
        }

        console.log(`There are ${this.functions.length} functions to lower`)

        for (let f of this.functions) {
            f.computeDominance();
            f.placePhis();
            f.rename();
            for (let b of f.blocks) {
                if (!b.isTerminated()) {
                    if (f.name == '_entry') {
                        b.insts.push(new RetInst());
                    } else {
                        let ud = new UndefinedConstInst();
                        let ret = new ReturnInst(ud);
                        b.insts.push(ret);
                    }
                }
            }
        }

        for (let pass of passes) {
            pass.transform(this.ir)
        }
    }

    toString() {
        let s = "";
        for (let f of this.functions) {
            s += `${f.toString()}\n`
        }
        return s;
    }
}

module.exports = {
    IR
}
