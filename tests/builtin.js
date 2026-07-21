function printObj(fn, obj) {
    let y = fn;
    let x = obj;
    y(x);
}

function print(obj) {
    let f = console.log;
    f("Hello there,", obj.name);
}

let myObjs = [
    {name: 'tooter'},
    {name: 'grumple'},
    {name: 'poomp'}
]

for (let i = 0; i < myObjs.length; i++) {
    printObj(print, myObjs[i]);
}