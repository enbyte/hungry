let OPCODES = {
    RET: 0x00,
    ADD: 0x01,
    LOAD_CONST: 0x02,
    JUMP: 0x03,
    JUMP_IF: 0x04,
    EQUALS: 0x05,
    STORE: 0x06,
    LOAD: 0x07,
    LT: 0x08,
    SUB: 0x09,
    MUL: 0x0A,
    DIV: 0x0B,
    SHR: 0x0C,
    SHL: 0x0D,
    MOD: 0x0E,
    GT: 0x0F,
    LTE: 0x10,
    GTE: 0x11,
    NEQUALS: 0x12,
    BAND: 0x13,
    XOR: 0x14,
    BOR: 0x15,
    AND: 0x16,
    OR: 0x17,
    NCONV: 0x18,
    NEG: 0x19,
    BNOT: 0x1A,
    GET_ARG: 0x1B,
    CALL: 0x1C,
    RETURN: 0x1D,
    POP: 0x1E,
    NEW_OBJ: 0x1F,
    GET_PROP: 0x20,
    SET_PROP: 0x21,
    NEW_ARR: 0x22,
    CALL_INDIRECT: 0x23
}

function execute(src, const_pool, args=[], pc=0) {
    let stack = [];
    let slots = [];
    let push = (x) => stack.push(x);
    let pop = () => stack.pop();
    let r, l, obj, prop, val;
    while (pc < src.length) {
        let op = src[pc++];
        switch (op) {
            case OPCODES.ADD:
                push(pop() + pop());
                break;
            case OPCODES.SUB:
                [r, l] = [pop(), pop()];
                push(l - r);
                break;
            case OPCODES.MUL:
                push(pop() * pop());
                break;
            case OPCODES.DIV:
                [r, l] = [pop(), pop()];
                push(l / r);
                break;
            case OPCODES.SHR:
                [r, l] = [pop(), pop()];
                push(l << r);
                break;
            case OPCODES.SHL:
                [r, l] = [pop(), pop()];
                push(l >> r);
                break;
            case OPCODES.MOD:
                [r, l] = [pop(), pop()];
                push(l % r);
                break;
            case OPCODES.GT:
                [r, l] = [pop(), pop()];
                push(l > r);
                break;
            case OPCODES.LTE:
                [r, l] = [pop(), pop()];
                push(l <= r);
                break;
            case OPCODES.GTE:
                [r, l] = [pop(), pop()];
                push(l >= r);
                break;
            case OPCODES.NEQUALS:
                push(pop() != pop());
                break;
            case OPCODES.BAND:
                [r, l] = [pop(), pop()];
                push(l & r);
                break;
            case OPCODES.XOR:
                [r, l] = [pop(), pop()];
                push(l ^ r);
                break;
            case OPCODES.BOR:
                [r, l] = [pop(), pop()];
                push(l | r);
                break;
            case OPCODES.AND:
                [r, l] = [pop(), pop()];
                push(l && r);
                break;
            case OPCODES.OR:
                [r, l] = [pop(), pop()];
                push(l || r);
                break;
            case OPCODES.NCONV:
                push(+pop());
                break;
            case OPCODES.NEG:
                push(-pop());
                break;
            case OPCODES.BNOT:
                push(~pop());
                break;
            case OPCODES.RET:
                return stack;
            case OPCODES.LOAD_CONST:
                push(const_pool[src[pc++]]);
                break;
            case OPCODES.JUMP:
                pc = src[pc];
                break;
            case OPCODES.JUMP_IF:
                let cond = pop();
                let thenTarget = src[pc];
                let elseTarget = src[pc + 1];
                pc = cond ? thenTarget : elseTarget;
                break;
            case OPCODES.EQUALS:
                push(pop() == pop());
                break;
            case OPCODES.STORE:
                slots[src[pc++]] = pop();
                break;
            case OPCODES.LOAD:
                push(slots[src[pc++]]);
                break;
            case OPCODES.LT:
                [r, l] = [pop(), pop()] // some nonsense
                push(l < r); // future me it's 1:14 am be grateful I didn't set > for .LT and go to sleep
                break;
            case OPCODES.GET_ARG:
                push(args[src[pc++]]);
                break;
            case OPCODES.CALL: {
                let target = src[pc++];
                let arity = src[pc++];
                let args = [];
                while (arity--) {
                    args.unshift(pop());
                }
                push(execute(src, const_pool, args, target))
                break;
            }
            case OPCODES.CALL_INDIRECT: {
                let arity = src[pc++];
                let target = pop();
                let args = [];
                while (arity--) {
                    args.unshift(pop());
                }
                if (typeof target === 'function') {
                    push(target(...args));
                } else {
                    push(execute(src, const_pool, args, target));
                }
                break;
            }
            case OPCODES.RETURN:
                return pop();
            case OPCODES.POP: // popcode
                pop();
                break;
            case OPCODES.NEW_OBJ:
                push({});
                break;
            case OPCODES.NEW_ARR:
                push([]);
                break;
            case OPCODES.GET_PROP:
                [prop, obj] = [pop(), pop()];
                push(obj[prop]);
                break;
            case OPCODES.SET_PROP:
                [val, prop, obj] = [pop(), pop(), pop()];
                obj[prop] = val;
                break;
            default:
                throw new Error(`Unknown opcode ${op} at pc=${pc - 1}`);
        }
    }
    return stack;
}

module.exports = { OPCODES, execute };
