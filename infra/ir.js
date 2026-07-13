const { parse } = require("@babel/parser");
const t = require("@babel/types");
const { Block } = require("./block.js")
const { BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst, CondJumpInst, JumpInst, PhiInst, UpsilonInst, UndefinedConstInst, RetInst, ReturnInst, UnaryInst } = require("./inst.js");
const { IRFunction } = require("./function.js");

class IR {
    constructor(src, passes) {
        this.src = src;
        this.ast = parse(src).program.body;

        let fns = [];
        let top = [];
        for (let expr of this.ast) {
            if (t.isFunctionDeclaration(expr)) {
                fns.push(expr);
            } else {
                top.push(expr);
            }
        }

        console.log('top, fns len', top.length, fns.length);

        this.entry = new IRFunction('_entry', top, []);

        this.functions = [this.entry, ...fns.map(fn => new IRFunction(fn.id.name, fn.body.body, fn.params))]

        for (let f of this.functions) {
            console.log('doing stuff for', f.name);
            f.computeDominance();
            f.placePhis();
            f.rename();
                for (let b of f.blocks) {
                    let i = b.insts.at(-1);
                    if (!(
                        i instanceof RetInst ||
                        i instanceof ReturnInst ||
                        i instanceof JumpInst ||
                        i instanceof CondJumpInst
                    )) {
                        if (f.name == '_entry') {
                            b.insts.push(new RetInst());
                        } else {
                            b.insts.push(new ReturnInst(new UndefinedConstInst()));
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
