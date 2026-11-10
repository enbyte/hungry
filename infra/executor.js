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
    NOT: 0x25,
    GET_ARG: 0x1B,
    CALL: 0x1C,
    RETURN: 0x1D,
    POP: 0x1E,
    NEW_OBJ: 0x1F,
    GET_PROP: 0x20,
    SET_PROP: 0x21,
    NEW_ARR: 0x22,
    CALL_INDIRECT: 0x23,
    JUMP_MAYBE: 0x24
}

function execute(src, const_pool, args=[], pc=0) {
    let execStack = [{ pc, slots: [], stack: [], args }];
    let r, l, obj, prop, val;

    while (execStack.length > 0) {
        let f = execStack[execStack.length - 1];
        if (f.pc >= src.length) {
            execStack.pop();
            if (execStack.length === 0) return f.stack;
            continue;
        }

        let op = src[f.pc++];
        switch (op) {
            case OPCODES.ADD:
                f.stack.push(f.stack.pop() + f.stack.pop());
                break;
            case OPCODES.SUB:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l - r);
                break;
            case OPCODES.MUL:
                f.stack.push(f.stack.pop() * f.stack.pop());
                break;
            case OPCODES.DIV:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l / r);
                break;
            case OPCODES.SHR:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l << r);
                break;
            case OPCODES.SHL:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l >> r);
                break;
            case OPCODES.MOD:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l % r);
                break;
            case OPCODES.GT:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l > r);
                break;
            case OPCODES.LTE:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l <= r);
                break;
            case OPCODES.GTE:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l >= r);
                break;
            case OPCODES.NEQUALS:
                f.stack.push(f.stack.pop() != f.stack.pop());
                break;
            case OPCODES.BAND:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l & r);
                break;
            case OPCODES.XOR:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l ^ r);
                break;
            case OPCODES.BOR:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l | r);
                break;
            case OPCODES.AND:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l && r);
                break;
            case OPCODES.OR:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l || r);
                break;
            case OPCODES.NOT:
                f.stack.push(!f.stack.pop());
                break;
            case OPCODES.NCONV:
                f.stack.push(+f.stack.pop());
                break;
            case OPCODES.NEG:
                f.stack.push(-f.stack.pop());
                break;
            case OPCODES.BNOT:
                f.stack.push(~f.stack.pop());
                break;
            case OPCODES.RET:
                execStack.pop();
                if (execStack.length === 0) return f.stack;
                break;
            case OPCODES.LOAD_CONST:
                f.stack.push(const_pool[src[f.pc++]]);
                break;
            case OPCODES.JUMP:
                f.pc = src[f.pc];
                break;
            case OPCODES.JUMP_IF: {
                let cond = f.stack.pop();
                let thenTarget = src[f.pc];
                let elseTarget = src[f.pc + 1];
                f.pc = cond ? thenTarget : elseTarget;
                break;
            }
            case OPCODES.JUMP_MAYBE: {
                let cond = f.stack.pop();
                let target = src[f.pc];
                f.pc = cond ? target : f.pc + 1;
                break;
            }
            case OPCODES.EQUALS:
                f.stack.push(f.stack.pop() == f.stack.pop());
                break;
            case OPCODES.STORE:
                f.slots[src[f.pc++]] = f.stack.pop();
                break;
            case OPCODES.LOAD:
                f.stack.push(f.slots[src[f.pc++]]);
                break;
            case OPCODES.LT:
                r = f.stack.pop(); l = f.stack.pop();
                f.stack.push(l < r);
                break;
            case OPCODES.GET_ARG:
                f.stack.push(f.args[src[f.pc++]]);
                break;
            case OPCODES.CALL: {
                let target = src[f.pc++];
                let arity = src[f.pc++];
                let callArgs = [];
                while (arity--) callArgs.unshift(f.stack.pop());
                execStack.push({ pc: target, slots: [], stack: [], args: callArgs });
                break;
            }
            case OPCODES.CALL_INDIRECT: {
                let arity = src[f.pc++];
                let target = f.stack.pop();
                let callArgs = [];
                while (arity--) callArgs.unshift(f.stack.pop());
                if (typeof target === 'function') {
                    f.stack.push(target(...callArgs));
                } else {
                    execStack.push({ pc: target, slots: [], stack: [], args: callArgs });
                }
                break;
            }
            case OPCODES.RETURN: {
                let retval = f.stack.pop();
                execStack.pop();
                if (execStack.length > 0) {
                    execStack[execStack.length - 1].stack.push(retval);
                } else {
                    return retval;
                }
                break;
            }
            case OPCODES.POP:
                f.stack.pop();
                break;
            case OPCODES.NEW_OBJ:
                f.stack.push({});
                break;
            case OPCODES.NEW_ARR:
                f.stack.push([]);
                break;
            case OPCODES.GET_PROP:
                prop = f.stack.pop(); obj = f.stack.pop();
                f.stack.push(obj[prop]);
                break;
            case OPCODES.SET_PROP:
                val = f.stack.pop(); prop = f.stack.pop(); obj = f.stack.pop();
                obj[prop] = val;
                break;
            default:
                throw new Error(`Unknown opcode ${op} at pc=${f.pc - 1}`);
        }
    }
    return [];
}

module.exports = { OPCODES, execute };
