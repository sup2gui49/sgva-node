const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
const backupPath = path.join(__dirname, 'backups', `backup_antes_limpar_${Date.now()}.db`);

console.log('🧹 SCRIPT DE LIMPEZA PARA PRODUÇÃO\n');
console.log('Este script remove todos os dados de teste mas mantém:');
console.log('✓ Estrutura das tabelas');
console.log('✓ Configurações do sistema (IRT, INSS, etc.)');
console.log('✓ Subsídios padrão');
console.log('✓ Categorias de funcionários\n');

// Fazer backup antes de limpar
console.log('📦 Criando backup...');
fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Backup criado: ${backupPath}\n`);

const db = new Database(dbPath);

try {
  db.exec('BEGIN TRANSACTION');

  console.log('🗑️  Limpando dados de teste...\n');

  // 1. Limpar usuários (exceto criar um admin padrão depois)
  const totalUsuarios = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
  db.prepare('DELETE FROM usuarios').run();
  console.log(`✅ ${totalUsuarios} usuários removidos`);

  // 2. Limpar funcionários
  const totalFunc = db.prepare('SELECT COUNT(*) as total FROM funcionarios').get().total;
  db.prepare('DELETE FROM funcionarios').run();
  console.log(`✅ ${totalFunc} funcionários removidos`);

  // 3. Limpar folhas de pagamento
  const totalFolhas = db.prepare('SELECT COUNT(*) as total FROM folhas_pagamento').get().total;
  db.prepare('DELETE FROM folhas_pagamento').run();
  db.prepare('DELETE FROM folhas_mensais').run();
  db.prepare('DELETE FROM folha_pagamentos_status').run();
  db.prepare('DELETE FROM folha_subsidios_detalhes').run();
  console.log(`✅ ${totalFolhas} folhas de pagamento removidas`);

  // 4. Limpar vendas
  const totalVendas = db.prepare('SELECT COUNT(*) as total FROM vendas').get().total;
  db.prepare('DELETE FROM vendas').run();
  db.prepare('DELETE FROM vendas_itens').run();
  console.log(`✅ ${totalVendas} vendas removidas`);

  // 5. Limpar produtos
  const totalProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos').get().total;
  db.prepare('DELETE FROM produtos').run();
  console.log(`✅ ${totalProdutos} produtos removidos`);

  // 6. Limpar clientes
  const totalClientes = db.prepare('SELECT COUNT(*) as total FROM clientes').get().total;
  db.prepare('DELETE FROM clientes').run();
  console.log(`✅ ${totalClientes} clientes removidos`);

  // 7. Limpar despesas
  const totalDespesas = db.prepare('SELECT COUNT(*) as total FROM despesas').get().total;
  db.prepare('DELETE FROM despesas').run();
  console.log(`✅ ${totalDespesas} despesas removidas`);

  // 8. Resetar AUTO_INCREMENT (IDs começarão do 1)
  console.log('\n🔄 Resetando sequências de IDs...');
  db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('usuarios', 'funcionarios', 'folhas_pagamento', 'folhas_mensais', 
         'vendas', 'produtos', 'clientes', 'despesas', 'folha_pagamentos_status');
  console.log('✅ IDs resetados para começar do 1');

  // 9. Criar usuário admin padrão
  console.log('\n👤 Criando usuário administrador padrão...');
  const bcrypt = require('bcryptjs');
  const senhaHash = bcrypt.hashSync('admin123', 10);
  
  db.prepare(`
    INSERT INTO usuarios (nome, email, senha, funcao, role, ativo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('Administrador', 'admin@sistema.ao', senhaHash, 'admin', 'admin', 1);
  
  console.log('✅ Usuário criado:');
  console.log('   Email: admin@sistema.ao');
  console.log('   Senha: admin123');
  console.log('   ⚠️  ALTERE A SENHA AO FAZER LOGIN!');

  // 10. Resetar configurações da empresa
  console.log('\n🏢 Limpando dados da empresa...');
  db.prepare('DELETE FROM empresa').run();
  console.log('✅ Dados da empresa removidos (devem ser configurados no primeiro acesso)');

  db.exec('COMMIT');

  console.log('\n✅ LIMPEZA CONCLUÍDA COM SUCESSO!\n');
  console.log('📊 O que foi mantido:');
  
  const escaloes = db.prepare('SELECT COUNT(*) as total FROM irt_escaloes').get().total;
  const subsidios = db.prepare('SELECT COUNT(*) as total FROM subsidios').get().total;
  const categorias = db.prepare('SELECT COUNT(*) as total FROM categorias_funcionarios').get().total;
  
  console.log(`   ✓ ${escaloes} escalões de IRT`);
  console.log(`   ✓ ${subsidios} subsídios configurados`);
  console.log(`   ✓ ${categorias} categorias de funcionários`);
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('   1. Acesse o sistema com admin@sistema.ao / admin123');
  console.log('   2. Altere a senha do administrador');
  console.log('   3. Configure os dados da empresa');
  console.log('   4. Cadastre os funcionários');
  console.log('   5. Configure produtos e serviços (se aplicável)');
  
  console.log('\n💾 Backup anterior salvo em:');
  console.log(`   ${backupPath}\n`);

} catch (error) {
  db.exec('ROLLBACK');
  console.error('\n❌ Erro durante a limpeza:', error.message);
  console.log('⏮️  Rollback executado - nenhuma alteração foi feita');
  process.exit(1);
} finally {
  db.close();
}
