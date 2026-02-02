const db = require('./src/config/database');

console.log('═══════════════════════════════════════════════════════════════');
console.log('ATRIBUIÇÃO DE CATEGORIAS AOS PRODUTOS SEM CATEGORIA');
console.log('═══════════════════════════════════════════════════════════════\n');

// Verificar produtos sem categoria
const semCategoria = db.prepare('SELECT id, nome FROM produtos WHERE categoria_id IS NULL').all();

console.log(`Encontrados ${semCategoria.length} produtos sem categoria:\n`);
semCategoria.forEach(p => console.log(`  [${p.id}] ${p.nome}`));

if (semCategoria.length === 0) {
    console.log('\n✓ Todos produtos já têm categoria!\n');
    process.exit(0);
}

console.log('\n\nATRIBUINDO categoria "Alimentação Geral" (id=1) como padrão...\n');

// Atribuir categoria padrão
const stmt = db.prepare('UPDATE produtos SET categoria_id = 1 WHERE categoria_id IS NULL');
const result = stmt.run();

console.log(`✓ ${result.changes} produtos atualizados!\n`);

// Verificar resultado
const verificacao = db.prepare(`
    SELECT p.id, p.nome, cp.nome as categoria, cp.taxa_iva_padrao
    FROM produtos p
    LEFT JOIN categorias_produtos cp ON p.categoria_id = cp.id
    WHERE p.id IN (${semCategoria.map(p => p.id).join(',')})
`).all();

console.log('RESULTADO:');
console.log('─'.repeat(70));
verificacao.forEach(p => {
    console.log(`✓ [${p.id}] ${p.nome}`);
    console.log(`  Categoria: ${p.categoria} (IVA: ${p.taxa_iva_padrao}%)`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Atribuição concluída! Todos produtos agora têm categoria.');
console.log('═══════════════════════════════════════════════════════════════');
