let a = 0;
let b = 1;
let c = 0;
let total = 0;
let outer = 0;

while (outer < 3) {
    let inner = 0;
    while (inner < 4) {
        if (inner == 2) {
            c = c + 1;
        }
        if (a < b) {
            total = total + a;
        }
        if (b < a) {
            total = total + b;
        }
        a = a + 1;
        b = b + 1;
        inner = inner + 1;
    }

    if (outer == 1) {
        while (c < 10) {
            c = c + 3;
        }
    }

    outer = outer + 1;
}

let x = 1;
let y = 1;
while (x < 6) {
    let z = x + y;
    y = x;
    x = z;
}

total + x;