
function add(a, b) {
    return a + b;
}

function bitStuff(a, b) {
    let x = a & b;
    let y = a | b;
    let z = a ^ b;
    let w = ~a;
    let s = a << 2;
    let r = b >> 1;
    return x + y + z + w + s + r;
}

function cmpChain(a, b, c, d) {
    let p = (a < b) + (b <= c) + (c > d) + (d >= a);
    let q = (a == b) + (a === c) + (a != d) + (a !== b);
    return p + q;
}

function fusedMath(a, b, c, d) {
    return (a + b) * (c - d) / 2 + -(b * d) + +(c) + ~(d);
}

function unfusedMath(a, b, c, d) {
    let p = a + b;
    let extra = add(a, b);
    let q = c - d;
    return p * q + extra;
}

function callFusion(a, b, c, d) {
    return add(a + b, c - d);
}

function callNoFusion(a, b, c, d) {
    let x = a + b;
    let y = c - d;
    let junk = add(a, b);
    return add(x, y) + junk;
}

function fib(n) {
    if (n < 2) {
        return n;
    } else {
        return fib(n - 1) + fib(n - 2);
    }
}

function fibIter(n) {
    let a = 0;
    let b = 1;
    let i = 0;
    while (i < n) {
        let t = a + b;
        a = b;
        b = t;
        i = i + 1;
    }
    return a;
}

function rotate3(n) {
    let a = 1;
    let b = 2;
    let c = 3;
    let i = 0;
    while (i < n) {
        let t = c;
        c = b;
        b = a;
        a = t;
        i = i + 1;
    }
    return a + b * 10 + c * 100;
}

function diamond(x) {
    let y = 0;
    if (x > 0) {
        y = x + 1;
    } else {
        y = x - 1;
    }
    return y;
}

function nestedControl(n) {
    let total = 0;
    let i = 0;
    while (i < n) {
        if (i % 2 == 0) {
            total = total + i;
        } else {
            if (i % 3 == 0) {
                total = total - i;
            } else {
                total = total + i * 2;
            }
        }
        i = i + 1;
    }
    return total;
}

function manyArgs(a, b, c, d, e, f) {
    return a + b - c + d - e + f;
}


let base = 7;
let acc = 0;
let n = 10;

acc = fib(n); // fib n broken
acc = acc + fibIter(n);
acc = acc + rotate3(n);
acc = acc + diamond(base);
acc = acc + nestedControl(n);
acc = acc + bitStuff(base, n);
acc = acc + cmpChain(base, n, acc, 3);
acc = acc + fusedMath(base, n, acc, 2);
acc = acc + unfusedMath(base, n, acc, 2);
acc = acc + callFusion(base, n, acc, 2);
acc = acc + callNoFusion(base, n, acc, 2);
acc = acc + manyArgs(1, 2, 3, 4, 5, 6);

acc + 0;

