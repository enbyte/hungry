
function node(val, nxt) {
    let o = {value: val, next: nxt};
    return o;
}

// Build a linked list of item-objects: head -> a -> b -> c -> d -> null
let d = node({name: "d", price: 5, qty: 2}, null);
let c = node({name: "c", price: 3, qty: 12}, d);
let b = node({name: "b", price: 1, qty: 7}, c);
let a = node({name: "a", price: 2, qty: 3}, b);

let cur = a;
let total = 0;
while (cur != null) {
    let it = cur.value;
    let raw = it.price * it.qty;
    let disc;
    if (it.qty > 10) {
        disc = raw - ~~(raw / 10);
    } else if (it.qty > 5) {
        disc = raw - ~~(raw / 20);
    } else {
        disc = raw;
    }
    total += disc;
    cur = cur.next;
}

function sumTo(n) {
    if (n <= 0) {
        return 0;
    }
    return n + sumTo(n - 1);
}

let prod = 1;
for (let k = 1; k <= 4; k++) {
    prod *= k;
}

let probe = {a: 100, b: 200};
let key = "b";
let probed = probe[key];
probe[key] = probed + 5;
let probed2 = probe[key];
let probed3 = probe.b;
let probed4 = probe["b"];

total + sumTo(4) + prod + probed2 + probed3 + probed4 + 0;
