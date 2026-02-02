const db = require('./src/config/database');

console.log('\n====================================');
console.log('🔍 ANÁLISE DO BANCO DE DADOS SGVA');
console.log('====================================\n');

// 1. Listar todos os funcionários
console.log('📋 FUNCIONÁRIOS:');
console.log('─────────────────────────────────────');
const funcionarios = db.prepare(`
  SELECT 
    f.id, 
    f.nome, 
    f.salario_base,
    f.ativo,
    c.nome as categoria
  FROM funcionarios f
  LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
  ORDER BY f.nome
`).all();

funcionarios.forEach(f => {
  console.log(`ID: ${f.id} | ${f.nome} | ${f.salario_base.toLocaleString('pt-AO')} KZ | Categoria: ${f.categoria || 'N/A'} | Ativo: ${f.ativo ? '✓' : '✗'}`);
});

// 2. Verificar duplicados por nome
console.log('\n\n⚠️  FUNCIONÁRIOS DUPLICADOS (mesmo nome):');
console.log('─────────────────────────────────────');
const duplicados = db.prepare(`
  SELECT nome, COUNT(*) as quantidade
  FROM funcionarios
  GROUP BY nome
  HAVING COUNT(*) > 1
`).all();

if (duplicados.length > 0) {
  duplicados.forEach(d => {
    console.log(`❌ ${d.nome} - ${d.quantidade} registros`);
    const dups = db.prepare('SELECT id, salario_base, ativo FROM funcionarios WHERE nome = ?').all(d.nome);
    dups.forEach(dup => {
      console.log(`   └─ ID: ${dup.id} | Salário: ${dup.salario_base.toLocaleString('pt-AO')} KZ | Ativo: ${dup.ativo ? '✓' : '✗'}`);
    });
  });
} else {
  console.log('✅ Nenhum duplicado encontrado');
}

// 3. Verificar subsídios atribuídos
console.log('\n\n💰 SUBSÍDIOS CADASTRADOS:');
console.log('─────────────────────────────────────');
const subsidios = db.prepare('SELECT id, nome, tipo_subsidio, tipo_calculo, valor_padrao_empresa FROM subsidios').all();
subsidios.forEach(s => {
  const atribuicoes = db.prepare('SELECT COUNT(*) as total FROM funcionarios_subsidios WHERE subsidio_id = ? AND ativo = 1').get(s.id);
  console.log(`ID: ${s.id} | ${s.nome} (${s.tipo_subsidio}) | ${s.tipo_calculo} | ${s.valor_padrao_empresa} KZ | Atribuído a ${atribuicoes.total} funcionário(s)`);
});

// 4. Verificar folhas processadas
console.log('\n\n📊 FOLHAS PROCESSADAS:');
console.log('─────────────────────────────────────');
const folhas = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT funcionario_id) as funcionarios_unicos,
    COUNT(DISTINCT mes || '-' || ano) as meses_unicos
  FROM folhas_pagamento
`).get();
console.log(`Total de folhas: ${folhas.total}`);
console.log(`Funcionários com folha: ${folhas.funcionarios_unicos}`);
console.log(`Meses diferentes: ${folhas.meses_unicos}`);

// 5. Verificar categorias
console.log('\n\n🏷️  CATEGORIAS PROFISSIONAIS:');
console.log('─────────────────────────────────────');
const categorias = db.prepare(`
  SELECT 
    c.id, 
    c.nome,
    COUNT(f.id) as total_funcionarios
  FROM categorias_funcionarios c
  LEFT JOIN funcionarios f ON c.id = f.categoria_id AND f.ativo = 1
  GROUP BY c.id, c.nome
  ORDER BY total_funcionarios DESC
`).all();
categorias.forEach(c => {
  console.log(`${c.nome}: ${c.total_funcionarios} funcionário(s)`);
});

// 6. Tabelas do sistema
console.log('\n\n📁 TABELAS DO SISTEMA:');
console.log('─────────────────────────────────────');
const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tabelas.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as total FROM ${t.name}`).get();
  console.log(`${t.name}: ${count.total} registros`);
});

console.log('\n====================================\n');
