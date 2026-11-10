const { IR } = require('../infra/ir.js');
const { compile } = require('../infra/compiler.js');
const { execute } = require('../infra/executor.js');

const { join } = require('path');
const { readFileSync } = require('fs');

const { MicrosplitPass } = require("../passes/microsplit.js");
const { ControlFlowFlattenPass } = require("../passes/flatten.js");

let read = (p) => readFileSync(join(__dirname, p)).toString();

function test(src, expectedLastStack, irPasses = [], compilerPasses = []) {
    let ir = new IR(src, irPasses);
    let [bc, pool] = compile(ir, compilerPasses);
    let stack = execute(bc, pool);
    return [stack.at(-1) === expectedLastStack, stack.at(-1)];
}

function runTestCases(testArr) {
    let counter = 0;
    let failures = 0;
    
    for (let i of testArr) {
        let code = i[0]; let res = i[1];
        console.log(`Testing case ${counter} (${code.slice(0, 50).replaceAll(/[\n\s]+/g, ' ')}${code.length > 50 ? '...' : ''})`);
        let t;
        try {
            t = test(code, res, [new ControlFlowFlattenPass()]);
        } catch (e) {
            console.log(`\x1b[1;31m${e} in when testing test case ${testArr.indexOf(i)}, expecting ${res}!!\x1b[0m`);
            t = [false, '\x1b[1;31m<An error occurred while running this test case>\x1b[0m'] // is formatting escapes in the error code tuff chat
        }
        if (t[0]) {
            console.log(`\t[+] Test ${counter++} passed!`);
            console.log(`\t[+] Expected value ${res}, got ${t[1]}`)
        } else {
            console.log(`\t[-] Test case ${counter++} failed :(`);
            console.log(`\t[-] Expected value: ${res}, instead got ${t[1]}`);
            failures++;
        }
    }

    if (failures == 0) {
        console.log('✅😍😇❤️😁😎🤩\x1b[1;92m All tests passed!\x1b[0m');
    } else {
        console.log(`❌😥👿💔☹️🤓😵\x1b[1;91m ${failures} test(s) failed :((\x1b[0m`);
    }
}

let tests = [
    [read('nesting.js'), 74],
    [read('nesting2.js'), 433],
    [read('control_flow.js'), 484],
    [read('factorial.js'), 120],
    [read('fib.js'), 88],
    [read('builtin.js'), 67], // this should print hello tooter grumple poomp
    [read('mega_object_slop.js'), 705],
    [read('mega_slop.js'), 318419],
    [read('ultimate_slop.js'), 4575]
]

runTestCases(tests);
