let OPCODES = {
    RET: 0x00,
    ADD: 0x01,
    LOAD_CONST: 0x02,
    JUMP: 0x03,
    JUMP_IF: 0x04,
    EQUALS: 0x05,
    STORE: 0x06,
    LOAD: 0x07,
    LT: 0x08
}

function execute(src, const_pool) {
    let stack = [];
    let slots = [];
    let pc = 0;
    let push = (x) => stack.push(x);
    let pop = () => stack.pop();
    while (pc < src.length) {
        let op = src[pc++];
        switch (op) {
            case OPCODES.ADD:
                push(pop() + pop());
                break;
            case OPCODES.RET:
                // console.log('return, stack=', stack, 'mem=', slots);
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
                let right = pop(); // some nonsense
                let left = pop();  // future me it's 1:14 am be grateful I didn't set > for .LT and go to sleep
                push(left < right); 
                break;
            default:
                throw new Error(`Unknown opcode ${op} at pc=${pc - 1}`);
        }
    }
    return stack;
}

module.exports = { OPCODES, execute };