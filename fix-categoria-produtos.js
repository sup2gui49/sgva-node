const db = require('./src/config/database');

console.log('═══════════════════════════════════════════════════════════════');
console.log('MAPEAMENTO CORRETO: categoria (texto) → categoria_id');
console.log('═══════════════════════════════════════════════════════════════\n');

// Mapeamento de categorias
const MAPEAMENTO = {
    'Alimentação Básica (produto - 7% IVA)': 2,        // Alimentação Básica
    'Serviços Profissionais (servico - 14% IVA)': 10,  // Serviços Profissionais
    'Alimentação Geral': 1,
    'Bebidas': 3,
    'Bebidas Alcoólicas': 4,
    'Padaria e Confeitaria': 5,
    'Produtos de Limpeza': 6,
    'Material de Escritório': 7,
    'Equipamentos': 8,
    'Serviços Gerais': 9,
    'Serviços Isentos': 11,
    'Tecnologia': 12
};

// Buscar produtos com categoria_id incorreta
const produtos = db.prepare(`
    SELECT p.id, p.nome, p.categoria, p.categoria_id,
           cp.nome as cat_atual
    FROM produtos p
    LEFT JOIN categorias_produtos cp ON p.categoria_id = cp.id
    WHERE p.categoria IS NOT NULL
`).all();

console.log('PRODUTOS E SUAS CATEGORIAS:');
console.log('─'.repeat(70));

let atualizados = 0;
const updates = [];

produtos.forEach(p => {
    const catTexto = p.categoria;
    const catIdCorreta = MAPEAMENTO[catTexto];
    
    if (catIdCorreta && catIdCorreta !== p.categoria_id) {
        console.log(`[${p.id}] ${p.nome}`);
        console.log(`  Texto: "${catTexto}"`);
        console.log(`  Atual: ${p.cat_atual || 'NULL'} (id=${p.categoria_id})`);
        console.log(`  ➜ Será: categoria_id=${catIdCorreta}`);
        console.log();
        
        updates.push({ id: p.id, categoria_id: catIdCorreta });
    }
});

if (updates.length === 0) {
    console.log('\n✓ Todos produtos já estão corretos!\n');
} else {
    console.log(`\n\nAPLICANDO ${updates.length} atualizações...\n`);
    
    const stmt = db.prepare('UPDATE produtos SET categoria_id = ? WHERE id = ?');
    const transaction = db.transaction((items) => {
        for (const item of items) {
            stmt.run(item.categoria_id, item.id);
        }
    });
    
    transaction(updates);
    
    console.log(`✓ ${updates.length} produtos atualizados!\n`);
    
    // Verificar resultado
    console.log('RESULTADO FINAL:');
    console.log('─'.repeat(70));
    
    const ids = updates.map(u => u.id).join(',');
    const verificacao = db.prepare(`
        SELECT p.id, p.nome, p.categoria,
               cp.nome as cat_nome, cp.taxa_iva_padrao
        FROM produtos p
        LEFT JOIN categorias_produtos cp ON p.categoria_id = cp.id
        WHERE p.id IN (${ids})
    `).all();
    
    verificacao.forEach(p => {
        console.log(`✓ [${p.id}] ${p.nome}`);
        console.log(`  Categoria: ${p.cat_nome} (IVA: ${p.taxa_iva_padrao}%)`);
    });
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Mapeamento concluído!');
console.log('═══════════════════════════════════════════════════════════════');
