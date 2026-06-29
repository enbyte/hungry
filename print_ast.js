const { parse } = require("@babel/parser");
const { readFileSync } = require('fs');

const FILE = "script.js";
const src = readFileSync(FILE, {encoding: 'utf8'});
const ast = parse(src);

console.log(ast.program.body[1]);