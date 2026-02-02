const db = require('./src/config/database');

console.log('\n=== ESTRUTURA TABELA PRODUTOS ===');
const produtosInfo = db.prepare('PRAGMA table_info(produtos)').all();
produtosInfo.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
});

console.log('\n=== ESTRUTURA CONFIG_FINANCEIRA ===');
const configInfo = db.prepare('PRAGMA table_info(config_financeira)').all();
configInfo.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
});

console.log('\n=== DADOS CONFIG_FINANCEIRA ===');
const configData = db.prepare('SELECT * FROM config_financeira').all();
console.log(configData);

console.log('\n=== CATEGORIAS DE PRODUTOS (primeiras 10) ===');
const cats = db.prepare('SELECT id, nome, tipo, taxa_iva_padrao, sujeito_iva FROM categorias_produtos LIMIT 10').all();
cats.forEach(c => {
    console.log(`[${c.id}] ${c.nome} - Tipo: ${c.tipo} - IVA: ${c.taxa_iva_padrao}% - Sujeito: ${c.sujeito_iva}`);
});

console.log('\n=== PRODUTOS (primeiros 5) ===');
const prods = db.prepare('SELECT id, nome, tipo, categoria_id, preco_venda FROM produtos LIMIT 5').all();
prods.forEach(p => {
    console.log(`[${p.id}] ${p.nome} - Tipo: ${p.tipo} - Categoria: ${p.categoria_id} - Preço: ${p.preco_venda} KZ`);
});
