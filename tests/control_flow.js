let result = 0;

let x = 5;
let r = 0;
if (x > 3) { r = x + 1 } else { r = x - 1 }
result += r;

r = 0;
if (x > 10) { r = x + 1 } else { r = x - 1 }
result += r;

r = 0;
if (x > 10) { r = 1 } else if (x > 3) { r = 2 } else { r = 3 }
result += r;

x = 2;
r = 0;
if (x > 10) { r = 1 } else if (x > 3) { r = 2 } else { r = 3 }
result += r;

x = 20;
r = 0;
if (x > 10) { r = 1 } else if (x > 3) { r = 2 } else { r = 3 }
result += r;

x = 15;
r = 0;
if (x < 5) { r = 10 } else if (x < 10) { r = 20 } else if (x < 15) { r = 30 } else if (x < 20) { r = 40 } else { r = 50 }
result += r;

x = 5;
r = 0;
if (x > 10) { r = 100 }
result += r;

r = 0;
if (x > 3) { r = 100 }
result += r;

r = 0;
if (x > 3) { if (x > 4) { r = 1 } else { r = 2 } } else { r = 3 }
result += r;

let s = 0;
for (let i = 0; i < 5; i++) { s = s + i }
result +=  s;

s = 0;
for (let i = 0; i < 10; i = i + 2) { s = s + i }
result +=  s;

let i2 = 0;
s = 0;
for (; i2 < 3; i2 = i2 + 1) { s = s + i2 }
result +=  s;

s = 0;
for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j = j + 1) { s++ } }
result +=  s;

let last = 0;
for (let i = 0; i < 5; i++) { last = i }
result +=  last;

s = 0;
for (let i = 0; i < 3; ) { s = s + i; i++ }
result +=  s;

s = 0;
for (let i = 0; i < 2; i++) { for (let j = 0; j < 2; j = j + 1) { for (let k = 0; k < 2; k = k + 1) { s++ } } }
result +=  s;

s = 0;
for (let i = 0; i < 10; i++) { if (i > 5) { s++ } else { s = s + 2 } }
result +=  s;

s = 0;
for (let i = 0; i < 6; i++) { if (i < 2) { s++ } else if (i < 4) { s = s + 10 } else { s = s + 100 } }
result +=  s;

let acc = 1;
for (let i = 0; i < 5; i++) { acc = acc + acc }
result +=  acc;

result + 0;
