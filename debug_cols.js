const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join('c:\\xampp\\htdocs\\sgva-node\\database\\sgva.db');
const db = new Database(dbPath);

const info = db.pragma('table_info(vendas)');
console.log('Vendas columns:', info.map(c => c.name));

const infoItens = db.pragma('table_info(itens_venda)');
console.log('Itens columns:', infoItens.map(c => c.name));
