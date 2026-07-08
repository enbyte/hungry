const { readFileSync } = require('fs');

const { IR } = require('./infra/ir.js');
const { compile } = require('./infra/compiler.js');
const { execute } = require('./infra/executor.js');

const FILE = "script.js";
const src = readFileSync(FILE, {encoding: 'utf8'});
const ir = new IR(src, [
    // IR passes go here
]);

console.log(src);
let [bc, pool] = compile(ir, [
    // Compiler passes go here
]);
console.log('Executing...');
execute(bc, pool);