const db = require('./database');

console.log('Verificando tabela despesas...\n');

// Verificar estrutura da tabela
const tableInfo = db.prepare("PRAGMA table_info(despesas)").all();
console.log('Estrutura da tabela despesas:');
console.table(tableInfo);

// Verificar se há dados
const count = db.prepare("SELECT COUNT(*) as total FROM despesas").get();
console.log(`\nTotal de registros: ${count.total}`);

// Mostrar alguns registros se existirem
if (count.total > 0) {
    const records = db.prepare("SELECT * FROM despesas LIMIT 5").all();
    console.log('\nPrimeiros registros:');
    console.table(records);
}
