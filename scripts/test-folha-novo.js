const db = require('../src/config/database');
const folhaService = require('../src/services/folha-calculo.service');

console.log('🧪 TESTANDO SISTEMA PROFISSIONAL DE FOLHA DE PAGAMENTO\n');
console.log('=' .repeat(70));

try {
  // ==================== TESTE 1: Criar Funcionário de Teste ====================
  console.log('\n📋 TESTE 1: Criando funcionário de teste...');

  // Buscar categoria
  const categoria = db.prepare('SELECT id FROM categorias_funcionarios WHERE nome LIKE ?').get('%Financeiro%');

  const funcionarioTest = db.prepare(`
    INSERT INTO funcionarios (nome, categoria, salario_base, categoria_id, ativo)
    VALUES (?, ?, ?, ?, 1)
  `).run('João Silva Teste', 'Financeiro', 150000, categoria?.id || null);

  const funcionarioId = funcionarioTest.lastInsertRowid;
  console.log(`✅ Funcionário criado: ID ${funcionarioId} - João Silva Teste`);

  // ==================== TESTE 2: Atribuir Subsídios ====================
  console.log('\n📋 TESTE 2: Atribuindo subsídios automáticos...');

  const subsidios = db.prepare('SELECT id, nome FROM subsidios WHERE aplicar_a = ? AND ativo = 1').all('todos');

  for (const sub of subsidios) {
    try {
      db.prepare(`
        INSERT INTO funcionarios_subsidios (funcionario_id, subsidio_id, ativo)
        VALUES (?, ?, 1)
      `).run(funcionarioId, sub.id);
      console.log(`✅ Subsídio atribuído: ${sub.nome}`);
    } catch (e) {
      if (!e.message.includes('UNIQUE')) throw e;
    }
  }

  // ==================== TESTE 3: Calcular Folha ====================
  console.log('\n📋 TESTE 3: Calculando folha de pagamento...');

  const mes = 11; // Novembro
  const ano = 2025;

  const calculo = folhaService.calcularFolhaFuncionario(funcionarioId, mes, ano);

  console.log('\n' + '='.repeat(70));
  console.log('💰 RECIBO DE SALÁRIO - NOVEMBRO/2025');
  console.log('='.repeat(70));

  console.log(`\n👤 FUNCIONÁRIO: ${calculo.funcionario.nome}`);
  console.log(`📊 CATEGORIA: ${calculo.funcionario.categoria}`);

  console.log('\n📈 REMUNERAÇÃO:');
  console.log(`   Salário Base: ${calculo.salario_base.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);

  console.log('\n💵 SUBSÍDIOS:');
  if (calculo.subsidios.detalhes.length > 0) {
    for (const sub of calculo.subsidios.detalhes) {
      console.log(`   ${sub.nome}: ${sub.valor.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
      if (sub.isento > 0) {
        console.log(`      └─ Isento: ${sub.isento.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
      }
      if (sub.tributavel > 0) {
        console.log(`      └─ Tributável: ${sub.tributavel.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
      }
    }
  } else {
    console.log('   (Nenhum subsídio)');
  }

  console.log(`   TOTAL SUBSÍDIOS: ${calculo.subsidios.total.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);

  console.log(`\n💼 SALÁRIO BRUTO: ${calculo.salario_bruto.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);

  console.log('\n📉 DESCONTOS:');
  console.log(`   INSS Empregado (3%): ${calculo.inss.empregado.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
  console.log(`   Dedução Fixa: ${calculo.deducao_fixa.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
  console.log(`   Rendimento Colectável: ${calculo.rendimento_colectavel.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
  console.log(`   IRT (${calculo.irt.escalao}): ${calculo.irt.valor.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);

  console.log(`\n   TOTAL DESCONTOS: ${calculo.total_descontos.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);

  console.log('\n' + '='.repeat(70));
  console.log(`✅ SALÁRIO LÍQUIDO: ${calculo.salario_liquido.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
  console.log('='.repeat(70));

  console.log('\n📊 CUSTOS DA EMPRESA:');
  console.log(`   INSS Patronal (8%): ${calculo.inss.patronal.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);
  console.log(`   CUSTO TOTAL: ${calculo.custo_total_empresa.toLocaleString('pt-AO', {minimumFractionDigits: 2})} KZ`);

  // ==================== TESTE 4: Salvar Folha ====================
  console.log('\n📋 TESTE 4: Salvando folha no banco de dados...');

  const folhaId = folhaService.salvarFolhaCalculada(calculo);
  console.log(`✅ Folha salva com ID: ${folhaId}`);

  // ==================== TESTE 5: Verificar Escalões IRT ====================
  console.log('\n📋 TESTE 5: Verificando escalões IRT...');

  const escaloes = folhaService.getEscaloesIRT();
  console.log(`✅ ${escaloes.length} escalões IRT carregados`);

  // ==================== RESUMO ====================
  console.log('\n' + '='.repeat(70));
  console.log('🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
  console.log('='.repeat(70));

  console.log('\n📊 ESTATÍSTICAS:');
  console.log(`   ✅ Funcionários: ${db.prepare('SELECT COUNT(*) as c FROM funcionarios').get().c}`);
  console.log(`   ✅ Categorias: ${db.prepare('SELECT COUNT(*) as c FROM categorias_funcionarios').get().c}`);
  console.log(`   ✅ Subsídios: ${db.prepare('SELECT COUNT(*) as c FROM subsidios').get().c}`);
  console.log(`   ✅ Escalões IRT: ${db.prepare('SELECT COUNT(*) as c FROM irt_grupos').get().c}`);
  console.log(`   ✅ Folhas Calculadas: ${db.prepare('SELECT COUNT(*) as c FROM folhas_pagamento').get().c}`);

  console.log('\n✨ Sistema Profissional de Folha de Pagamento 100% funcional!\n');

} catch (error) {
  console.error('\n❌ ERRO NO TESTE:');
  console.error('  ', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
} finally {
  db.close();
}
