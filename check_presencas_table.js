const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Tables:', tables.map(t => t.name));
    
    // Check columns of presencas if it exists
    if (tables.find(t => t.name === 'presencas')) {
        db.all("PRAGMA table_info(presencas)", [], (err, cols) => {
            console.log('Columns in presencas:', cols);
        });
    } else {
        console.log('Table presencas does NOT exist.');
    }
});
