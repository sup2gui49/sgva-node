const db = require('./src/config/database');

console.log('PRODUTOS E SUAS CATEGORIAS:');
console.log('='.repeat(70));

const produtos = db.prepare(`
    SELECT p.id, p.nome, p.categoria_id, 
           cp.nome as cat_nome, 
           cp.taxa_iva_padrao, 
           cp.sujeito_iva
    FROM produtos p
    LEFT JOIN categorias_produtos cp ON p.categoria_id = cp.id
    LIMIT 10
`).all();

produtos.forEach(p => {
    const cat = p.cat_nome || 'SEM CATEGORIA';
    const taxa = p.taxa_iva_padrao || 0;
    const iva = p.sujeito_iva ? 'Sim' : 'Não';
    console.log(`[${p.id}] ${p.nome}`);
    console.log(`    Categoria: ${cat}`);
    console.log(`    Sujeito IVA: ${iva}`);
    console.log(`    Taxa: ${taxa}%`);
    console.log();
});
