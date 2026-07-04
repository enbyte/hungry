const { parse } = require("@babel/parser");
const { readFileSync } = require('fs');
const { IR } = require('./ir.js');
const { compile } = require('./compiler.js');
const { execute } = require('./executor.js');
const { exec } = require("child_process");

const FILE = "script.js";
const src = readFileSync(FILE, {encoding: 'utf8'});
const ir = new IR(src);

console.log(src);
console.log(ir.toString());
let [bc, pool] = compile(ir);
console.log('Executing...');
execute(bc, pool);