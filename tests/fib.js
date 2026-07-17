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