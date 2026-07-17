const { Effects, World, SSAState, Memory, Control, IO, Pure } = require('./effects.js');

class Inst {
    static id = 0;

    static getId() {
        return `%${Inst.id++}`;
    }

    constructor() {
        this.id = Inst.getId();
        this.operands = [];
        this.slot = null;
    }

    effects() {
        return Pure;
    }

    toString() {
        return `${this.id} = Inst()`;
    }
}

class BinaryInst extends Inst {
    constructor(op, left, right) {
        super();
        this.op = op;
        this.operands = [left, right];
    }
    get left() { return this.operands[0] }
    get right() { return this.operands[1] }

    toString() {
        return `${this.id} = ${this.op}(${this.left.id}, ${this.right.id});`
    }
}

class UnaryInst extends Inst {
    constructor(op, obj) {
        super();
        this.op = op;
        this.operands = [obj];
    }

    get obj() { return this.operands[0] }

    toString() {
        return `${this.id} = ${this.op}(${this.obj.id})`
    }
}

class ConstInst extends Inst {
    constructor(val) {
        super();
        this.val = val;
    }

    toString() {
        return `${this.id} = Const<${typeof this.val}>(${this.val});`
    }
}

class AssignmentInst extends Inst {
    constructor(iden, init) {
        super();
        this.iden = iden; // iden = str
        this.init = init;
        this.operands = [init];
    }

    get init() { return this.operands[0]; }
    set init(v) { this.operands[0] = v; }

    toString() {
        return `${this.id} = Assign(${this.iden} <- ${this.init.id})`
    }
}

class IdentifierRefInst extends Inst {
    constructor(name) {
        super();
        this.name = name;
    }

    toString() {
        return `${this.id} = Identifier(${this.name})`
    }
}

class CondJumpInst extends Inst {
    constructor(cond, target, alternate) {
        super();
        this.target = target;
        this.alternate = alternate;
        this.operands = [cond];
    }
    get cond() { return this.operands[0] }

    effects() {
        return new Effects([], [Control]);
    }

    toString() {
        return `${this.id} = JumpIf ${this.cond.id} -> ${this.target.id} else ${this.alternate.id}`
    }
}

class JumpInst extends Inst {
    constructor(target) {
        super();
        this.target_block = target;
    }

    effects() {
        return new Effects([], [Control]);
    }

    toString() {
        return `${this.id} = Jump -> ${this.target_block.id}`
    }
}

class PhiInst extends Inst {
    constructor(vari) {
        super();
        this.vari = vari;
    }

    effects() {
        return new Effects([SSAState], []);
    }

    toString() {
        return `${this.id} = Phi(^${this.vari});`
    }
}

class UpsilonInst extends Inst {
    constructor(val, target) {
        super();
        this.val = val;
        this.target = target;
    }

    effects() {
        return new Effects([], [SSAState]);
    }

    toString() {
        return `${this.id} = Upsilon(${this.val.id}, ^${this.target.id});`
    }
}

class UndefinedConstInst extends Inst {
    toString() {
        return `${this.id} = Undefined()`;
    }
}

class ReturnInst extends Inst {
    constructor(val) {
        super();
        this.operands = [val];
    }
    get val() { return this.operands[0] }
    set val(x) { this.operands[0] = x }

    effects() {
        return new Effects([], [Control]);
    }

    toString() {
        return `${this.id} = Return ${this.val.id}`
    }
}

class GetArgumentInst extends Inst {
    constructor(idx, name) {
        super();
        this.idx = idx;
        this.name = name
    }

    toString() {
        return `${this.id} = GetArgument(#${this.idx}, ^${this.name})`
    }
}

class CallInst extends Inst {
    constructor(name, args) {
        super();
        this.name = name;
        this.operands = [...args];

        this.calleeEntry = null;

        this.needsPop = true;
        
    }

    get args() { return this.operands }
    set args(x) { this.operands = x }

    effects() {
        return new Effects([World], [World]);
    }

    toString() {
        return `${this.id} = Call ${this.name}(${this.args.map(a => a.id).join(', ')})`
    }
}

class RetInst extends Inst {
    toString() {
        return `${this.id} = Return`
    }

    effects() {
        return new Effects([], [Control]);
    }
}

class ObjectInst extends Inst {
    effects() {
        return new Effects([], [Memory]);
    }

    toString() {
        return `${this.id} = Object {}`
    }
}

class ArrayInst extends Inst {
    effects() {
        return new Effects([], [Memory]);
    }

    toString() {
        return `${this.id} = Array []`
    }
}

class GetPropInst extends Inst {
    constructor(obj, prop) {
        super();
        this.operands = [obj, prop];
    }

    effects() {
        return new Effects([Memory], []);
    }

    toString() {
        return `${this.id} = GetProp ${this.prop.id} of ${this.obj.id}`
    }

    get obj() { return this.operands[0] };
    set obj(x) { this.operands[0] = x };
    get prop() { return this.operands[1] };
    set prop(x) { this.operands[1] = x };
}

class SetPropInst extends Inst {
    constructor(obj, prop, val) {
        super();
        this.operands = [obj, prop, val];
    }

    effects() {
        return new Effects([], [Memory]);
    }

    toString() {
        return `${this.id} = SetProp ${this.prop.id} of ${this.obj.id} to ${this.val.id}`
    }

    get obj() { return this.operands[0] };
    set obj(x) { this.operands[0] = x };
    get prop() { return this.operands[1] };
    set prop(x) { this.operands[1] = x };
    get val() { return this.operands[2] };
    set val(x) { this.operands[2] = x };
}

module.exports = {
    BinaryInst, UnaryInst, ConstInst, AssignmentInst, IdentifierRefInst, UndefinedConstInst,
    CondJumpInst, JumpInst, RetInst, ReturnInst, CallInst,
    PhiInst, UpsilonInst, GetArgumentInst,
    ObjectInst, ArrayInst, GetPropInst, SetPropInst
}
