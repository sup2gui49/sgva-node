const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='irt_grupos'").get();
console.log('=== SCHEMA irt_grupos ===');
console.log(schema.sql);

console.log('\n=== ESCALÕES ATIVOS ===');
const escaloes = db.prepare('SELECT * FROM irt_grupos WHERE ativo=1 ORDER BY ordem').all();
escaloes.forEach(e => {
  console.log(`${e.ordem}º Escalão: ${e.de} - ${e.ate || '∞'} | Parcela: ${e.parcela_fixa} | Taxa: ${e.taxa} | Excesso: ${e.excesso}`);
});

db.close();
