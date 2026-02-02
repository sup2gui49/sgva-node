const Database = require('better-sqlite3');
const fs = require('fs');

const dbs = ['./database/database.sqlite', './database/sgva.db'];

dbs.forEach(dbPath => {
    if (!fs.existsSync(dbPath)) {
        console.log(`DB not found: ${dbPath}`);
        return;
    }
    console.log(`\nChecking DB: ${dbPath}`);
    const db = new Database(dbPath);
    
    const tables = ['produtos', 'vendas', 'itens_venda', 'clientes', 'empresa'];
    for (const table of tables) {
        try {
            const cols = db.prepare(`PRAGMA table_info(${table})`).all();
            if (cols.length > 0) {
                console.log(`=== ${table} ===`);
                console.log(cols.map(c => `${c.name} (${c.type})`).join(', '));
            } else {
                 console.log(`=== ${table} (Not Found or Empty Schema) ===`);
            }
        } catch (e) {
            console.log(`Table ${table} error: ${e.message}`);
        }
    }
});
