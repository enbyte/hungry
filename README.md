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
The lowerer splits the provided script into functions and then coalesces the remaining non-function statements into a pseudo function called "_entry". Each function is effectively its own sub-IR with its own CFG. The only special-cased insts that can jump between these IRs are `Call` and `Return`, whereas `Jump` and `CondJump` just flow between different blocks in a function. Each function splits its CFG into blocks, where every block is terminated by `Return`, `Jump`, or `CondJump`. `_entry` always ends with `Return`. When lowering, each function traverses the AST to build its little CFG, creating blocks as necessary when control flow appears. When finished, it does (i)dom calculations for each block, and then places phis corresponding to the iterated dominance frontier of each block's variable assignments. Then, it rewrites each assignment to instead of Upsilon-stores to the calculated phi. 

Objects are handled using an `ObjectInst` that just creates a blank `{}`, which future `SetProp` and `GetProp` insts can reference. To track side effects of object reads/writes, the compiler uses abstract heaps (`World`, `Memory`, `SSAState`, probably `IO` if I add console.log, etc) that can track interference between instructions to support good DCE/LICM (useless)/shuffling things around for obfuscation. This is the primary advantage that this project has of being much closer to the original JSLIR form that was part of JSIR before they removed it - it throws away all of the information that tethers it to the source which allows for more powerful non-source transforms. In essence, this project aims to be JSIR targeted at obfuscation instead of deobfuscation, sacrificing source-to-source but solving the issue JSIR has with symbols violating true SSA and making constant propagation janky. 

Due to the upsilons, compilation is tremendously easy, with the compiler basically just being a loop that emits the correct opcode for each `Inst` in each block, with a
virtual stack tracker to avoid using memory slots for things that are pushed onto the stack and immediately consumed (SSA values not immediately used get a tracked memory
slot). Register coloring coming soon, although since this is a toy it's only useful for obfuscation to clobber slots and make dynamic tracing harder.

## Todo
1) Support more language features
2) Better pass infra, especially for compilation
3) Register coloring
4) Actually write obfuscating IR passes
5) Maybe optimize stuff, but it would be pretty hard to write a program that's slow when compiling 10 lines of js (I tried my best)
6) Come up with better project name

## Language feature support

| Feature | Is supported |
|---------|--------------|
| literals | ✅          |
| while, if/else if/else, for loops | ✅ |
| binary, unary, and update operations | ✅ |
| variables (no scoping) | ✅ |
| objects | ✅ |
| calling functions (not including async, anonymous, arrow, or builtin functions) | ✅ |
| arrays (this is trivial, coming soon) | ❌ |
| literally anything else | ❌ |

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
        counter = counter + fib(i);
    }
    return counter;
}
fibSum(10) + 0;
```
produces the IR
```
 function _entry():
	b-0:
	  %0 = Const<number>(10);
	  %1 = Call fibSum(%0)
	  %2 = Const<number>(0);
	  %3 = +(%1, %2);
	  %45 = Return

function fib():
	b-1:
	  %4 = GetArgument(#0, ^n)
	  %6 = Const<number>(2);
	  %7 = <(%4, %6);
	  %8 = JumpIf %7 -> b-2 else b-4
	b-2:
	  %10 = Return %4
	b-3:
	  %48 = Return %47
	b-4:
	  %12 = Const<number>(1);
	  %13 = -(%4, %12);
	  %14 = Call fib(%13)
	  %16 = Const<number>(2);
	  %17 = -(%4, %16);
	  %18 = Call fib(%17)
	  %19 = +(%14, %18);
	  %20 = Return %19

function fibSum():
	b-5:
	  %21 = GetArgument(#0, ^n)
	  %22 = Const<number>(0);
	  %24 = Const<number>(0);
	  %52 = Upsilon(%24, ^%50);
	  %53 = Upsilon(%22, ^%49);
	  %26 = Jump -> b-6
	b-6:
	  %50 = Phi(^i);
	  %49 = Phi(^counter);
	  %29 = <(%50, %21);
	  %30 = JumpIf %29 -> b-7 else b-9
	b-7:
	  %33 = Call fib(%50)
	  %34 = +(%49, %33);
	  %36 = Jump -> b-8
	b-8:
	  %38 = Const<number>(1);
	  %39 = +(%50, %38);
	  %54 = Upsilon(%39, ^%50);
	  %55 = Upsilon(%34, ^%49);
	  %41 = Jump -> b-6
	b-9:
	  %43 = Return %49
  ```
The variable name references inside the Phi are vestigial but useful to keep for debugging. The phi/upsilon model basically gets rid of any headaches with SSA relating to phis, especially for what is just a virtualizing compiler that targets its own language, since no quirks of javascript really have to be emulated. The mystery `%47` that doesn't exist that's returned by `b-3` of `fib` is just a created `UndefinedConstInst` that wasn't added to the inst list. This block is obviously never reached, as every path through that function ends in a return statement that isn't the end of the function. 

## conclusion
Those who have suffered all the way through this document to the end will be pleased to learn that the earlier cliffhanger of my hunger was resolved after naming the repo
by eating some noodles. 

tl;dr the IR is a simple base right now but is very easy to extend, and will be updated soon/frequently with more stuff. Look out for a crackme
coming soon(-ish)! Contributions, suggestions, questions, etc are very welcome :)

