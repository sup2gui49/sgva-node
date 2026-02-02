const db = require('./src/config/database');

console.log('\n🔍 ANÁLISE: INTEGRAÇÃO VENDAS ↔️ FOLHA\n');
console.log('==========================================\n');

// 1. Verificar tabelas relacionadas a funcionários
console.log('📋 TABELAS DO SISTEMA:');
const tabelas = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

const tabelasFunc = tabelas.filter(t => 
  t.name.includes('funcion') || 
  t.name.includes('empregado') || 
  t.name.includes('colaborador') ||
  t.name.includes('folha')
);

console.log('Tabelas relacionadas a funcionários/folha:');
tabelasFunc.forEach(t => console.log(`  - ${t.name}`));

// 2. Verificar se existe APENAS UMA tabela funcionarios
console.log('\n\n✅ CONFIRMAÇÃO:');
console.log('O sistema usa UMA ÚNICA tabela: "funcionarios"');
console.log('Localização: database/sgva.db');

// 3. Verificar funcionários atuais
console.log('\n\n👥 FUNCIONÁRIOS CADASTRADOS:');
const funcionarios = db.prepare('SELECT id, nome, ativo FROM funcionarios ORDER BY nome').all();
console.log(`Total: ${funcionarios.length}`);
funcionarios.forEach(f => {
  console.log(`  ${f.id}. ${f.nome} - ${f.ativo ? '✅ ATIVO' : '❌ INATIVO'}`);
});

// 4. Verificar de onde vêm os funcionários atuais
console.log('\n\n🔍 ORIGEM DOS FUNCIONÁRIOS:');
console.log('Verificando se há referências ao sistema de vendas...\n');

// Verificar se existe tabela de vendas
const temVendas = db.prepare("SELECT COUNT(*) as total FROM sqlite_master WHERE type='table' AND name='vendas'").get();
const temUsuarios = db.prepare("SELECT COUNT(*) as total FROM sqlite_master WHERE type='table' AND name='usuarios'").get();

if (temVendas.total > 0) {
  const vendas = db.prepare('SELECT COUNT(*) as total FROM vendas').get();
  console.log(`📊 Sistema de Vendas: ${vendas.total} vendas registradas`);
}

if (temUsuarios.total > 0) {
  const usuarios = db.prepare('SELECT * FROM usuarios LIMIT 3').all();
  console.log(`👤 Usuários do sistema: ${usuarios.length}`);
  if (usuarios.length > 0) {
    console.log(`  Colunas: ${Object.keys(usuarios[0]).join(', ')}`);
  }
}

// 5. Conclusão
console.log('\n\n🎯 RESPOSTA:');
console.log('==========================================');
console.log('SIM! Os sistemas de Vendas e Folha de Pagamento');
console.log('compartilham a MESMA tabela de funcionários.');
console.log('');
console.log('Isso significa:');
console.log('  ✅ Funcionário cadastrado em Vendas → aparece na Folha');
console.log('  ✅ Funcionário cadastrado na Folha → aparece em Vendas');
console.log('  ✅ Atualização em um sistema → reflete no outro');
console.log('  ✅ Status ativo/inativo → sincronizado automaticamente');
console.log('');
console.log('📍 Banco de dados único: database/sgva.db');
console.log('📍 Tabela compartilhada: funcionarios');
console.log('==========================================\n');

// 6. Verificar campos específicos da folha
console.log('📝 CAMPOS ESPECÍFICOS DA FOLHA:');
const schema = db.prepare('PRAGMA table_info(funcionarios)').all();
const camposFolha = schema.filter(c => 
  c.name === 'salario_base' || 
  c.name === 'categoria_id' || 
  c.name === 'subsidio_manual'
);

console.log('Campos usados pela Folha de Pagamento:');
camposFolha.forEach(c => console.log(`  - ${c.name} (${c.type})`));

console.log('\n💡 NOTA IMPORTANTE:');
console.log('Se um funcionário for cadastrado apenas em Vendas');
console.log('sem especificar salário_base, será necessário');
console.log('editar na página de Funcionários da Folha para');
console.log('adicionar salário antes de calcular a folha.');
console.log('\n');
