function overall() {
    let x = 3;
    function inner() {
        x++;
    }
    inner();
    return x;
}

overall() + 0;