const db = require('./src/config/database');

console.log("Checking for presence/absence related tables...");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%presenc%' OR name LIKE '%faltas%')").all();

if (tables.length === 0) {
    console.log("❌ No tables found matching 'presenc%' or 'faltas%'");
} else {
    console.table(tables);
    tables.forEach(t => {
        console.log(`\nSchema for ${t.name}:`);
        console.table(db.prepare(`PRAGMA table_info(${t.name})`).all());
    });
}
