const { readFileSync } = require('fs');

const { IR } = require('./infra/ir.js');
const { compile } = require('./infra/compiler.js');
const { execute } = require('./infra/executor.js');
const { disassemble } = require('./infra/disassemble.js');
const { argv } = require('process');

const FILE = argv[2];
const src = readFileSync(FILE, {encoding: 'utf8'});

const ir = new IR(src, [
    // IR passes go here
]);

console.log("Produced ir is:\n" + ir.toString());

let [bc, pool] = compile(ir, [
    // Compiler passes go here
]);

disassemble(bc, pool);

console.log('Executing...');
console.log(execute(bc, pool));

