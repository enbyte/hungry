const { OPCODES } = require('./executor');



function disassemble(src, pool) {
    let idx = 0;

    while (idx < src.length) {
        let start = idx;
        let op = src[idx++];

        function log(what) {
            console.log(`${start.toString().padStart(4, '0')}: ${what}`);
        } // scoping :broken_heart:


        switch (op) {
            case OPCODES.ADD:
                log('ADD');
                break;
            case OPCODES.RET:
                log('HALT');
                break;
            case OPCODES.LOAD_CONST:
                let i = src[idx++]
                log(`LOAD_CONST idx=${i} (val=${pool[i]})`);
                break;
            case OPCODES.LT:
                log('LT');
                break;
            case OPCODES.GT:
                log('GT');
                break;
            case OPCODES.JUMP:
                log(`JMP ${src[idx++]}`);
                break;
            case OPCODES.JUMP_IF:
                log(`CJMP ${src[idx++]} else ${src[idx++]}`);
                break;
            case OPCODES.LOAD:
                log(`LOAD ${src[idx++]}`);
                break;
            case OPCODES.STORE:
                log(`STORE ${src[idx++]}`);
                break;
            case OPCODES.RETURN:
                log(`RET`);
                break;
            case OPCODES.CALL:
                log(`CALL ${src[idx++]} arity=${src[idx++]}`);
                break;
            case OPCODES.GET_ARG:
                log(`GET_ARG idx=${src[idx++]}`);
                break;
            case OPCODES.EQUALS:
                log('EQ');
                break;
            case OPCODES.MUL:
                log('MUL');
                break;
            case OPCODES.SUB:
                log('SUB');
                break;
            case OPCODES.DIV:
                log('DIV');
                break;
            case OPCODES.SHR:
                log('SHR');
                break;
            case OPCODES.SHL:
                log('SHL');
                break;
            case OPCODES.MOD:
                log('MOD');
                break;
            case OPCODES.LTE:
                log('LTE');
                break;
            case OPCODES.GTE:
                log('GTE');
                break;
            case OPCODES.NEQUALS:
                log('NEQ');
                break;
            case OPCODES.BAND:
                log('BAND');
                break;
            case OPCODES.XOR:
                log('XOR');
                break;
            case OPCODES.BOR:
                log('BOR');
                break;
            case OPCODES.AND:
                log('AND');
                break;
            case OPCODES.OR:
                log('OR');
                break;
            case OPCODES.NCONV:
                log('NCONV');
                break;
            case OPCODES.NEG:
                log('NEG');
                break;
            case OPCODES.BNOT:
                log('BNOT');
                break;
            case OPCODES.POP:
                log('POP');
                break;
            case OPCODES.SET_PROP:
                log('SET_PROP');
                break;
            case OPCODES.GET_PROP:
                log('GET_PROP');
                break;
            case OPCODES.NEW_OBJ:
                log('NEW_OBJ');
                break;
            case OPCODES.NEW_ARR:
                log('NEW_ARR');
                break;
            case OPCODES.CALL_INDIRECT:
                log(`CALL_INDIRECT arity=${src[idx++]}`);
                break;
            default:
                throw new Error(`I can't disassemble a ${op}!`);
        }
    }
}

module.exports = {
    disassemble
}