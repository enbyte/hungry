let outer = 0;
let inner = 0;
let trigger = 0;
let checksum = 0;

while (outer < 5) {
    inner = 0;

    while (inner < 5) {
        trigger = outer + inner;

        if (trigger == 4) {
            checksum = checksum + 10;
        }
        if (trigger == 7) {
            checksum = checksum + 20;
        }

        inner = inner + 1;
    }

    outer = outer + 1;
}


let k = 0;
let step = 0;

while (k < 10) {
    step = 0;

    if (k == 2) {
        step = 5;
    }
    if (k == 5) {
        step = 10;
    }
    if (k == 8) {
        step = 15;
    }

    while (0 < step) {
        checksum = checksum + k;
        step = step + 1;
        if (step == 6) {
            step = 0;
        }
        if (step == 11) {
            step = 0;
        }
        if (step == 16) {
            step = 0;
        }
    }

    k = k + 1;
}


let x = 0;
let y = 0;
let z = 0;

while (x < 3) {
    y = 0;
    while (y < 3) {
        z = 0;
        while (z < 3) {
            let sum = x + y;
            sum = sum + z;

            if (sum == 3) {
                checksum = checksum + 32;
            }

            z = z + 1;
        }
        y = y + 1;
    }
    x = x + 1;
}


checksum = checksum + outer; 
checksum = checksum + inner; 
checksum = checksum + k; 
checksum = checksum + x; 
checksum = checksum + y; 
checksum = checksum + z;
checksum = checksum + step; 
let expected_checksum = 358;
if (checksum == expected_checksum) {
    checksum = checksum + 75;
}
checksum + 0; // 433