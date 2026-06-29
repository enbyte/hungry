const { parse } = require("@babel/parser");
const { readFileSync } = require('fs');
const { IR } = require('./ir.js');

const FILE = "script.js";
const src = readFileSync(FILE, {encoding: 'utf8'});
const ir = new IR(src);

console.log(src);
console.log(ir.toString());