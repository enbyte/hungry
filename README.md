# hungry

## What is this?
SSA IR for a subset of JavaScript built mostly according to the ideas of [this](https://gist.github.com/pizlonator/cf1e72b8600b1437dda8153ea3fdb963) document. 
I was inspired originally by the [google/jsir](https://github.com/google/jsir) project, but got frustrated with some limitations of that project, mostly driven by
it being built for different use cases than what I needed it for, and decided it would be a good idea to learn how to implement this stuff anyway. Unlike JSIR, 
this project doesn't support source-to-source transformations, but is proper SSA and is significantly easier to hack on as there is no building LLVM, C++ boilerplate, or hacks to get babel to run for AST parsing. The tradeoff is that this is much slower, does very few of the useful things JSIR can, and 
lacks all of the nice tooling that comes with LLVM and MLIR.

## Why is it called `hungry`?
1) I was hungry when naming this repo
2) 

## IR Design
Same as JSIR: the IR is effectively a traversal of the AST.
```
1 + 2 -> BinaryExpression { op: +, left: 1, right: 2 } ->
function _entry():
    %0 = Const(1)
    %1 = Const(2)
    %2 = +(%0, %1)
... do stuff with %2, etc ...
```
The lowerer splits the provided script into functions and then coalesces the remaining non-function statements into a pseudo function called "_entry". Each function is effectively its own sub-IR with its own CFG. The only special-cased insts that can jump between these IRs are `Call` and `Return`, whereas `Jump` and `CondJump` just flow between different blocks in a function. Each function splits its CFG into blocks, where every block is terminated by `Return`, `Jump`, or `CondJump`. `_entry` always ends with `Return`. When lowering, each function traverses the AST to build its little CFG, creating blocks as necessary when control flow appears. When finished, it does (i)dom calculations for each block, and then places phis corresponding to the iterated dominance frontier of each block's variable assignments. Then, it rewrites each assignment to be Upsilon-stores to the calculated phi. 

Objects are handled using an `ObjectInst` that just creates a blank `{}`, which future `SetProp` and `GetProp` insts can reference. To track side effects of object reads/writes, the compiler uses abstract heaps (`World`, `Memory`, `SSAState`, `IO`, etc) that can track interference between instructions to support good DCE/LICM (useless)/shuffling things around for obfuscation. This is the primary advantage that this project has of being much closer to the original JSLIR form that was part of JSIR before they removed it - it throws away all of the information that tethers it to the source which allows for more powerful non-source transforms. In essence, this project aims to be JSIR targeted at obfuscation instead of deobfuscation, sacrificing source-to-source but solving the issue JSIR has with symbols violating true SSA and making constant propagation janky. 

Due to the upsilons, compilation is tremendously easy, with the compiler basically just being a loop that emits the correct opcode for each `Inst` in each block, with a
virtual stack tracker to avoid using memory slots for things that are pushed onto the stack and immediately consumed (SSA values not immediately used get a tracked memory
slot). Register coloring coming soon, although since this is a toy it's only useful for obfuscation to clobber slots and make dynamic tracing harder.

## Todo
1) Support more language features. Next up:
  	- ~~Proper modeling of `Callables` so functions suck less~~
  	- Add support + short-circuiting for `LogicalExpression`s
   	- Add proper `CALL_BUILTIN` op so that constant pool encryption can actually work
  	- Little syntax sugars like `for ... of`, `??`, and `?.`, maybe spread op if it ever becomes necessary
2) Better pass infra, especially for compilation
3) Register coloring
4) Actually write obfuscating IR passes
5) Maybe optimize stuff, but it would be pretty hard to write a program that's slow when compiling 10 lines of js (I tried my best)
6) Come up with better project name

## Language feature support

| Feature | Is supported | warning about how it secretly doesn't work |
|---------|--------------|-----------------|
| literals | ✅          |
| while loops, if/else if/else, for loops | ✅ | no support for `for ... of` yet |
| binary, unary, and update operations | ✅ | ++ and -- don't distinguish prefix vs postfix and don't return their own values |
| variables | ✅ | variables are scoped to functions only and assignments don't return their value in-place |
| objects and arrays | ✅ | |
| functions that aren't secret classes | ✅ | default and variadic arguments aren't supported. for variadic arguments, pass as an array for functionally equivalent behavior |
| classes, including builtin ones (`new Uint8Array()`) | ❌ |
| async/await and generators | ❌ | |
| literally anything else | ❌ | `import/require`, weird edge cases like shadowing or patching globals don't work |

### fundamental limitations
1) Non-builtin functions are compiled and aren't objects. Thus, `this`-referencing functions won't work, as well as stuff like `.toString()` (since the functions have been compiled and don't really have "bodies" anymore).
2) Any calls to `eval` beyond those that are the most simple imaginable (those that reference or modify program state) will break, for obvious reasons.

## snippet
```javascript
function fib(n) {
    if (n < 2) {
        return n;
    } else {
        return fib(n - 1) + fib(n - 2);
    }
}

function fibSum(n) {
    let counter = 0;
    for (let i = 0; i < n; i++) {
        counter += fib(i);
    }
    return counter;
}

fibSum(10) + 0;
```
produces the IR
```
function _entry():
	b-0:
	  %0 = CallableRef -> fib
	  %2 = CallableRef -> fibSum
	  %4 = Const<number>(10);
	  %6 = Call %2(%4)
	  %7 = Const<number>(0);
	  %8 = +(%6, %7);
	  %54 = Return

function fib():
	b-1:
	  %9 = GetArgument(#0, ^n)
	  %11 = Const<number>(2);
	  %12 = <(%9, %11);
	  %13 = JumpIf %12 -> b-2 else b-4
	b-2:
	  %15 = Return %9
	b-3:
	  %59 = Return %58
	b-4:
	  %56 = CallableRef -> fib
	  %57 = CallableRef -> fib
	  %17 = Const<number>(1);
	  %18 = -(%9, %17);
	  %20 = Call %56(%18)
	  %22 = Const<number>(2);
	  %23 = -(%9, %22);
	  %25 = Call %57(%23)
	  %26 = +(%20, %25);
	  %27 = Return %26

function fibSum():
	b-5:
	  %28 = GetArgument(#0, ^n)
	  %29 = Const<number>(0);
	  %31 = Const<number>(0);
	  %63 = Upsilon(%31, ^%61);
	  %64 = Upsilon(%29, ^%60);
	  %33 = Jump -> b-6
	b-6:
	  %61 = Phi(^i);
	  %60 = Phi(^counter);
	  %36 = <(%61, %28);
	  %37 = JumpIf %36 -> b-7 else b-9
	b-7:
	  %65 = CallableRef -> fib
	  %40 = Call %65(%61)
	  %40 = Call %65(%61)
	  %43 = +(%60, %40);
	  %45 = Jump -> b-8
	b-8:
	  %47 = Const<number>(1);
	  %48 = +(%61, %47);
	  %66 = Upsilon(%48, ^%61);
	  %67 = Upsilon(%43, ^%60);
	  %50 = Jump -> b-6
	b-9:
	  %52 = Return %60
  ```
The variable name references inside the Phi are vestigial but useful to keep for debugging. The phi/upsilon model basically gets rid of any headaches with SSA relating to phis, especially for what is just a virtualizing compiler that targets its own language, since no quirks of javascript really have to be emulated. The mystery `%58` that doesn't exist that's returned by `b-3` of `fib` is just a created `UndefinedConstInst` that wasn't added to the inst list. This block is obviously never reached, as every path through that function ends in a return statement that isn't the end of the function. Functions aren't directly referenced by name but instead by Insts (see `%56` and `%57`), which can then be used as normal SSA values before ultimately pushing the necessary bytecode location or builtin onto the stack. 

## testing
Tests can be run with `node tests/test.js`. Most tests are either random examples of things that broke the lowerer/compiler previously, or slop resulting from a prompt roughly equivalent to "here are all the ops I support, generate the most comprehensive test that tests all of them interacting," with the expected value being the result of pasting into browser console. To lower, compile, disassemble, and execute a file of your choice, `node run.js <file>`. The <x> + 0 pattern is specifically not removed by the dead code eliminator so you can obtain a value and then push it onto the stack at the end of your program (which is easier to check in tests than hooking `console.log`).

## conclusion
Those who have suffered all the way through this document to the end will be pleased to learn that the earlier cliffhanger of my hunger was resolved after naming the repo
by eating some noodles. 

tl;dr the IR is a simple base right now but is very easy to extend, and will be updated soon/frequently with more stuff. Look out for a crackme
coming soon(-ish)! Contributions, suggestions, questions, etc are very welcome :)

