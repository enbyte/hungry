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
        return `${this.id} = ${this.op}(${this.left.id}, ${this.right.id}); slot = ${this.slot}`
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
        return `${this.id} = Const<${typeof this.val}>(${this.val}); slot = ${this.slot}`
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

    toString() {
        return `${this.id} = JumpIf ${this.cond.id} -> ${this.target.id} else ${this.alternate.id}`
    }
}

class JumpInst extends Inst {
    constructor(target) {
        super();
        this.target_block = target;
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

    toString() {
        return `${this.id} = Phi(^${this.vari}); slot = ${this.slot}`
    }
}

class UpsilonInst extends Inst {
    constructor(val, target) {
        super();
        this.val = val;
        this.target = target;
    }

    toString() {
        return `${this.id} = Upsilon(${this.val.id}, ^${this.target.id}); slot = ${this.slot}`
    }
}

class UndefinedConstInst extends Inst {
    toString() {
        return `${this.id} = Undefined()`;
    }
}

class RetInst extends Inst {
    toString() {
        return `${this.id} = Return`
    }
}

module.exports = {
    BinaryInst, UnaryInst, ConstInst, AssignmentInst, IdentifierRefInst, UndefinedConstInst, 
    CondJumpInst, JumpInst, RetInst,
    PhiInst, UpsilonInst,
}
