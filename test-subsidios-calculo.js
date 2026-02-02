const Database = require('better-sqlite3');
const db = new Database('./sgva.db');

console.log('=== TESTE DE CÁLCULO DE SUBSÍDIOS ===\n');

// 1. Listar funcionários
console.log('📋 FUNCIONÁRIOS:');
const funcionarios = db.prepare('SELECT * FROM funcionarios WHERE ativo = 1').all();
funcionarios.forEach(f => {
  console.log(`  - ID: ${f.id} | Nome: ${f.nome} | Categoria: ${f.categoria_id} | Salário: ${f.salario_base}`);
});

// 2. Listar subsídios
console.log('\n💰 SUBSÍDIOS:');
const subsidios = db.prepare('SELECT * FROM subsidios WHERE ativo = 1').all();
subsidios.forEach(s => {
  console.log(`  - ID: ${s.id} | Nome: ${s.nome} | Tipo: ${s.tipo_calculo} | Valor: ${s.valor} | Aplicar a: ${s.aplicar_a}`);
});

// 3. Listar atribuições
console.log('\n🔗 ATRIBUIÇÕES:');
const atribuicoes = db.prepare(`
  SELECT sa.*, s.nome as subsidio_nome, f.nome as funcionario_nome, c.nome as categoria_nome
  FROM subsidios_atribuidos sa
  LEFT JOIN subsidios s ON sa.subsidio_id = s.id
  LEFT JOIN funcionarios f ON sa.funcionario_id = f.id
  LEFT JOIN categorias_funcionarios c ON sa.categoria_id = c.id
`).all();

if (atribuicoes.length === 0) {
  console.log('  ⚠️ Nenhuma atribuição encontrada!');
} else {
  atribuicoes.forEach(a => {
    if (a.funcionario_id) {
      console.log(`  - Subsídio "${a.subsidio_nome}" → Funcionário "${a.funcionario_nome}"`);
    } else if (a.categoria_id) {
      console.log(`  - Subsídio "${a.subsidio_nome}" → Categoria "${a.categoria_nome}"`);
    }
  });
}

// 4. Simular função getSubsidiosFuncionario
console.log('\n🔍 TESTE DA FUNÇÃO getSubsidiosFuncionario:');
funcionarios.forEach(func => {
  console.log(`\n  Funcionário: ${func.nome} (ID: ${func.id}, Categoria: ${func.categoria_id})`);
  
  // Subsídios diretos
  const diretos = db.prepare(`
    SELECT s.*, sa.valor_especifico
    FROM subsidios s
    JOIN subsidios_atribuidos sa ON s.id = sa.subsidio_id
    WHERE sa.funcionario_id = ? AND s.ativo = 1
  `).all(func.id);
  
  // Subsídios por categoria
  const porCategoria = db.prepare(`
    SELECT s.*, sa.valor_especifico
    FROM subsidios s
    JOIN subsidios_atribuidos sa ON s.id = sa.subsidio_id
    WHERE sa.categoria_id = ? AND s.ativo = 1
  `).all(func.categoria_id);
  
  // Subsídios para todos
  const todos = db.prepare(`
    SELECT s.*, NULL as valor_especifico
    FROM subsidios s
    WHERE s.aplicar_a = 'todos' AND s.ativo = 1
  `).all();
  
  console.log(`    - Diretos: ${diretos.length}`);
  diretos.forEach(s => console.log(`      * ${s.nome}`));
  
  console.log(`    - Por Categoria: ${porCategoria.length}`);
  porCategoria.forEach(s => console.log(`      * ${s.nome}`));
  
  console.log(`    - Para Todos: ${todos.length}`);
  todos.forEach(s => console.log(`      * ${s.nome}`));
  
  const totalSubsidios = [...diretos, ...porCategoria, ...todos];
  const unicos = Array.from(new Map(totalSubsidios.map(s => [s.id, s])).values());
  
  console.log(`    ✅ TOTAL: ${unicos.length} subsídios aplicáveis`);
});

console.log('\n✅ Teste concluído!');
db.close();
