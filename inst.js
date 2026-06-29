class Inst {
    static id = 0;

    static getId() {
        return `%${Inst.id++}`;
    }

    constructor() {
        this.id = Inst.getId();
    }

    toString() {
        return `${this.id} = Inst()`;
    }
}

class BinaryInst extends Inst {
    constructor(op, left, right) {
        super();
        this.op = op;
        this.left = left;
        this.right = right;
    }

    toString() {
        return `${this.id} = ${this.op}(${this.left.id}, ${this.right.id})`
    }
}

class ConstInst extends Inst {
    constructor(val) {
        super();
        this.val = val;
    }

    toString() {
        return `${this.id} = Const<${typeof this.val}>(${this.val})`
    }
}

class AssignmentInst extends Inst {
    constructor(iden, init) {
        super();
        this.iden = iden;
        this.init = init;
    }

    toString() {
        return `${this.id} = Assign(${this.iden.id} -> ${this.init.id})`
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
    constructor(cond, target) {
        super();
        this.cond = cond;
        this.target_block = target;
    }

    toString() {
        return `${this.id} = JumpIf ${this.cond.id} -> ${this.target_block.id}`
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

module.exports = {
    BinaryInst, ConstInst, AssignmentInst, IdentifierRefInst,
    CondJumpInst, JumpInst
}