const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

const cols = db.prepare("PRAGMA table_info(funcionarios)").all();
console.log(cols.map(c => c.name));
