const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

console.log('='.repeat(70));
console.log('MIGRAÇÃO: Popular categoria_id dos funcionários');
console.log('='.repeat(70));

// Mapeamento de categorias de texto para IDs
const MAPEAMENTO = {
    'CEO': 1,
    'GERENTE': 2,
    'Gerente': 2,
    'gerente': 2,
    'FINANCEIRO': 3,
    'Financeiro': 3,
    'RH': 4,
    'Recursos Humanos': 4,
    'VENDEDOR': 6,
    'Vendedor': 6,
    'vendedor': 6,
    'CAIXA': 6, // Comercial/Vendas
    'Caixa': 6,
    'ESTOQUISTA': 8, // Auxiliar/Operacional
    'Estoquista': 8,
    'ADMINISTRATIVO': 10,
    'Administrativo': 10
};

try {
    // 1. Ver estado atual
    console.log('\n1. ESTADO ATUAL:');
    const funcionarios = db.prepare('SELECT id, nome, categoria, categoria_id FROM funcionarios').all();
    funcionarios.forEach(f => {
        console.log(`  [${f.id}] ${f.nome.padEnd(25)} | categoria: ${(f.categoria || 'null').padEnd(18)} | categoria_id: ${f.categoria_id || 'NULL'}`);
    });

    // 2. Aplicar migração
    console.log('\n2. APLICANDO MIGRAÇÃO:');
    const updateStmt = db.prepare('UPDATE funcionarios SET categoria_id = ? WHERE id = ?');
    const beginTransaction = db.prepare('BEGIN TRANSACTION');
    const commitTransaction = db.prepare('COMMIT');
    
    beginTransaction.run();
    
    let atualizados = 0;
    let naoMapeados = 0;
    
    for (const func of funcionarios) {
        if (func.categoria && !func.categoria_id) {
            const categoriaId = MAPEAMENTO[func.categoria];
            if (categoriaId) {
                updateStmt.run(categoriaId, func.id);
                console.log(`  ✓ ${func.nome}: "${func.categoria}" → categoria_id=${categoriaId}`);
                atualizados++;
            } else {
                console.log(`  ✗ ${func.nome}: "${func.categoria}" não mapeado!`);
                naoMapeados++;
            }
        }
    }
    
    commitTransaction.run();
    
    // 3. Ver resultado
    console.log('\n3. RESULTADO:');
    console.log(`  Atualizados: ${atualizados}`);
    console.log(`  Não mapeados: ${naoMapeados}`);
    
    // 4. Verificar estado final
    console.log('\n4. ESTADO FINAL:');
    const funcionariosFinal = db.prepare(`
        SELECT f.id, f.nome, f.categoria, f.categoria_id, c.nome as categoria_nome
        FROM funcionarios f
        LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
    `).all();
    
    funcionariosFinal.forEach(f => {
        const status = f.categoria_id ? '✓' : '✗';
        console.log(`  ${status} [${f.id}] ${f.nome.padEnd(25)} | categoria_id: ${f.categoria_id || 'NULL'.padEnd(2)} | nome: ${f.categoria_nome || '-'}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('MIGRAÇÃO CONCLUÍDA!');
    console.log('='.repeat(70));
    
} catch (error) {
    console.error('ERRO:', error.message);
    db.prepare('ROLLBACK').run();
} finally {
    db.close();
}
