# hungry


## What is this?
SSA IR for a subset of JavaScript built mostly according to the ideas of [this](https://gist.github.com/pizlonator/cf1e72b8600b1437dda8153ea3fdb963) document. 
I was inspired originally by the [google/jsir](https://github.com/google/jsir) project, but got frustrated with some limitations of that project, mostly driven by
it being built for different use cases than what I needed it for, and decided it would be a good idea to learn how to implement this stuff anyway. Unlike JSIR, 
this project doesn't support source-to-source transformations, but is significantly easier to hack on as there is no building LLVM, C++ boilerplate, or hacks to get
babel to run for AST parsing. The tradeoff is that this is much slower, does maybe 10% of the things JSIR can, and 
lacks all of the nice tooling that comes with LLVM and MLIR.

## Why is it called `hungry`?
1) I was hungry when naming this repo
2) 

## IR Design
Same as JSIR: the IR is effectively a traversal of the AST.
```
1 + 2 -> BinaryExpression { op: +, left: 1, right: 2 } ->
%0 = Const(1)
%1 = Const(2)
%2 = +(%0, %1)
... do stuff with %2, etc ...
```
The IR splits the CFG into blocks, where each block either `Jump`s or `CondJump`s to the next. When lowering, the IR traverses the AST and builds the CFG as it goes.
When finished, it does idom/dom calcs for each block.
Then, it places phis using iterated dominance frontier of each block's variable assignments, and then rewrites assignments to each variable to instead be Upsilon-stores to the 
calculated Phi. 

Due to the upsilons, compilation is tremendously easy, with the compiler basically just being a loop that emits the correct opcode for each `Inst` in each block, with a
virtual stack tracker to avoid using memory slots for things that are pushed onto the stack and immediately consumed (SSA values not immediately used get a tracked memory
slot). Register coloring coming soon, although since this is a toy it's only useful for obfuscation to clobber slots and make dynamic tracing harder.

## Todo
1) Support more than 4 language features
2) Better pass infra, especially for compilation
3) Register coloring
4) Actually write obfuscating IR passes
5) Maybe optimize stuff, but it would be pretty hard to write a program that's slow when compiling 10 lines of js (I tried my best)
6) Come up with better project name

## Language feature support

| Feature | Is supported |
|---------|--------------|
| literals | ✅          |
| while statement | ✅ |
| if statement | ✅ |
| binary operations | ✅ |
| variables (no scoping) | ✅ |
| other control flow, including else if and else | ❌ |
| objects | ❌ |
| calling functions | ❌ |
| literally anything else | ❌ |

## snippet
```javascript
let counter = 0;
let x = 0;
while (x < 10) {
    counter = counter + x;
    x = x + 1;
}
counter + 0;
```
produces the IR
```
b-0, doms [b-0], domChildren [b-1]:
  %0 = Const<number>(0)
  %2 = Const<number>(0)
  %24 = Upsilon(%2, ^%22)
  %25 = Upsilon(%0, ^%21)
  %4 = Jump -> b-1
b-1, doms [b-1, b-0], domChildren [b-3, b-2]:
  %22 = Phi(^x)
  %21 = Phi(^counter)
  %6 = Const<number>(10)
  %7 = <(%22, %6)
  %8 = JumpIf %7 -> b-2 else b-3
b-2, doms [b-2, b-1, b-0], domChildren []:
  %11 = +(%21, %22)
  %14 = Const<number>(1)
  %15 = +(%22, %14)
  %26 = Upsilon(%15, ^%22)
  %27 = Upsilon(%11, ^%21)
  %17 = Jump -> b-1
b-3, doms [b-3, b-1, b-0], domChildren []:
  %19 = Const<number>(0)
  %20 = +(%21, %19)
  %28 = Return
  ```
The variable name references inside the Phi are vestigial but useful to keep for debugging.
Note how `%24` and `%25` write relevant values into `%22` and `%21` to be accessed inside the loop.
Due to there being no functions, the `counter + 0` at the end functions as a nice way to test if code is working properly: `45` should be the last value on the stack
when the program is finished. This 7 line snippet covers every single feature that the lowerer has so far. It can handle lowering and compiling nesting, see `tests/` for 
what happens when you tell AI "generate a torture test for my IR compiler. It only supports adding and while loops." and then it frowns and spits out some slop.

## conclusion
Those who have suffered all the way through this document to the end will be pleased to learn that the earlier cliffhanger of my hunger was resolved after naming the repo
by eating some noodles. 

tl;dr the IR is a simple base right now but is very easy to extend, and will be updated soon/frequently with more stuff. Look out for a crackme
coming soon(-ish)! Contributions, suggestions, questions, etc are very welcome :)

