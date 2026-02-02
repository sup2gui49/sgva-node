const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

console.log('=== TODAS AS TABELAS ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(' -', t.name));

console.log('\n=== TABELAS COM SUBSÍDIOS ===');
const subsidioTables = tables.filter(t => t.name.toLowerCase().includes('subsid'));
subsidioTables.forEach(t => {
  console.log(`\nTabela: ${t.name}`);
  const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE name='${t.name}'`).get();
  console.log(schema.sql);
});

db.close();
