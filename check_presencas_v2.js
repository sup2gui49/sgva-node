const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db'); // Removed verbose for cleaner output

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

const presencasTable = tables.find(t => t.name === 'presencas');
if (presencasTable) {
    const cols = db.prepare("PRAGMA table_info(presencas)").all();
    console.log('Columns in presencas:', cols);
} else {
    console.log('Table presencas does NOT exist.');
}
