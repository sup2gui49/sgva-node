const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

console.log('='.repeat(60));
console.log('TESTE DE BANCO DE DADOS');
console.log('='.repeat(60));

// Listar tabelas
console.log('\n1. TABELAS NO BANCO:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(`  - ${t.name}`));

// Estrutura da tabela funcionarios
console.log('\n2. ESTRUTURA DA TABELA funcionarios:');
const schema = db.prepare('PRAGMA table_info(funcionarios)').all();
schema.forEach(col => {
    console.log(`  ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : '        '} ${col.dflt_value || ''}`);
});

// Contar funcionários
console.log('\n3. DADOS:');
const countFunc = db.prepare('SELECT COUNT(*) as total FROM funcionarios').get();
console.log(`  Total funcionários: ${countFunc.total}`);

// Testar campo categoria_id
const funcComCategoria = db.prepare('SELECT id, nome, categoria, categoria_id FROM funcionarios LIMIT 5').all();
console.log('\n4. AMOSTRA DE FUNCIONÁRIOS (categoria vs categoria_id):');
funcComCategoria.forEach(f => {
    console.log(`  ${f.nome.padEnd(25)} | categoria: ${(f.categoria || 'null').padEnd(15)} | categoria_id: ${f.categoria_id || 'null'}`);
});

// Testar tabela categorias_funcionarios
console.log('\n5. CATEGORIAS PROFISSIONAIS:');
try {
    const cats = db.prepare('SELECT id, nome FROM categorias_funcionarios').all();
    cats.forEach(c => console.log(`  [${c.id}] ${c.nome}`));
} catch (e) {
    console.log(`  Erro: ${e.message}`);
}

db.close();
console.log('\n' + '='.repeat(60));
