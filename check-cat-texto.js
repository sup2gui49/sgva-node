const db = require('./src/config/database');

console.log('VERIFICANDO CAMPO CATEGORIA (TEXTO):');
console.log('='.repeat(70));

const produtos = db.prepare('SELECT id, nome, categoria FROM produtos WHERE id IN (21, 22, 23)').all();

produtos.forEach(p => {
    console.log(`[${p.id}] ${p.nome}`);
    console.log(`    categoria (texto): "${p.categoria}"`);
});
