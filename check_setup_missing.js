const db = require('./src/config/database');

console.log("Checking for 'presencas' and 'turnos' tables...");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name = 'presencas' OR name = 'turnos')").all();

if (tables.length === 0) {
    console.log("❌ Neither table found.");
} else {
    console.table(tables);
    tables.forEach(t => {
        console.log(`\nSchema for ${t.name}:`);
        console.table(db.prepare(`PRAGMA table_info(${t.name})`).all());
    });
}
