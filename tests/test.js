const { IR } = require('../infra/ir.js');
const { compile } = require('../infra/compiler.js');
const { execute } = require('../infra/executor.js');

const { join } = require('path');
const { readFileSync } = require('fs');

let read = (p) => readFileSync(join(__dirname, p)).toString();

function test(src, expectedLastStack, irPasses = [], compilerPasses = []) {
    let ir = new IR(src, irPasses);
    let [bc, pool] = compile(ir, compilerPasses);
    let stack = execute(bc, pool);
    return [stack.at(-1) === expectedLastStack, stack.at(-1)];
}

function runTestCases(testArr) {
    counter = 0;
    
    for (let i of testArr) {
        let code = i[0]; let res = i[1];
        console.log(`Testing case ${counter} (${code.slice(0, 50).replaceAll(/[\n\s]+/g, ' ')}${code.length > 50 ? '...' : ''})`);
        let t = test(code, res);
        if (t[0]) {
            console.log(`\t[+] Test ${counter++} passed!`);
            console.log(`\t[+] Expected value ${res}, got ${t[1]}`)
        } else {
            console.log(`\t[-] Test case ${counter++} failed :(`);
            console.log(`\t[-] Expected value: ${res}, instead got ${t[1]}`);
        }
    }
}

let tests = [
    [read('nesting.js'), 74],
    [read('nesting2.js'), 433],
    [read('control_flow.js'), 484],
    [read('factorial.js'), 120],
    [read('fib.js'), 88],
    [read('objects.js'), 6],
    [read('mega_object_slop.js'), 705],
    [read('mega_slop.js'), 318419],
    [read('arr.js'), 7]
]

runTestCases(tests);
