const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

console.log('=== SCHEMA subsidios_atribuidos ===');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='subsidios_atribuidos'").get();
console.log(schema ? schema.sql : 'Tabela não existe');

console.log('\n=== DADOS ===');
try {
  const dados = db.prepare('SELECT * FROM subsidios_atribuidos LIMIT 20').all();
  console.log(dados.length + ' registros');
  dados.forEach(d => console.log(d));
} catch(e) {
  console.log('Erro:', e.message);
}

db.close();
