const fs = require('fs');
const code = fs.readFileSync('public/app.js', 'utf8');
let open = 0;
let close = 0;
for (let char of code) {
    if (char === '{') open++;
    if (char === '}') close++;
}
console.log(`Open: ${open}, Close: ${close}, Diff: ${open - close}`);
