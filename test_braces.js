const fs = require('fs');
try {
    const code = fs.readFileSync('public/app.js', 'utf8');
    let open = 0;
    let close = 0;
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === '{') open++;
        if (char === '}') close++;
    }
    console.log(`Open: ${open}, Close: ${close}, Diff: ${open - close}`);
} catch (e) {
    console.error(e);
}
