const db = require('./src/config/database');

console.log('═══════════════════════════════════════════════════════════════');
console.log('SINCRONIZAÇÃO: categoria (texto) → categorias_funcionarios');
console.log('═══════════════════════════════════════════════════════════════\n');

// Buscar estado atual
const funcionarios = db.prepare(`
    SELECT f.id, f.nome, f.categoria, f.categoria_id, c.nome as cat_nome
    FROM funcionarios f
    LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
`).all();

console.log('ESTADO ATUAL:');
console.log('─'.repeat(70));
funcionarios.forEach(f => {
    const match = f.categoria === f.cat_nome ? '✓' : '✗';
    console.log(`${match} [${f.id}] ${f.nome}`);
    console.log(`   Campo texto: "${f.categoria}"`);
    console.log(`   Categoria vinculada: "${f.cat_nome}" (id=${f.categoria_id})`);
});

console.log('\n\nATUALIZANDO campo "categoria" com nome da categoria vinculada...\n');

// Atualizar campo categoria com o nome da categoria vinculada
const stmt = db.prepare(`
    UPDATE funcionarios 
    SET categoria = (
        SELECT nome 
        FROM categorias_funcionarios 
        WHERE id = funcionarios.categoria_id
    )
    WHERE categoria_id IS NOT NULL
`);

const result = stmt.run();

console.log(`✓ ${result.changes} funcionários atualizados!\n`);

// Verificar resultado
const atualizados = db.prepare(`
    SELECT f.id, f.nome, f.categoria, c.nome as cat_nome
    FROM funcionarios f
    LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
`).all();

console.log('RESULTADO FINAL:');
console.log('─'.repeat(70));
atualizados.forEach(f => {
    const match = f.categoria === f.cat_nome ? '✓' : '✗';
    console.log(`${match} [${f.id}] ${f.nome}: "${f.categoria}"`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Sincronização concluída!');
console.log('═══════════════════════════════════════════════════════════════');
