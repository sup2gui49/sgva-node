const db = require('../src/config/database');

console.log('🗑️  Removendo tabelas antigas de subsídios...\n');

try {
  // Desabilitar foreign keys temporariamente
  db.prepare('PRAGMA foreign_keys = OFF').run();
  
  db.prepare('DROP TABLE IF EXISTS folha_subsidios_detalhes').run();
  db.prepare('DROP TABLE IF EXISTS folhas_pagamento').run();
  db.prepare('DROP TABLE IF EXISTS funcionarios_subsidios').run();
  db.prepare('DROP TABLE IF EXISTS subsidios').run();
  db.prepare('DROP TABLE IF EXISTS irt_grupos_snapshots').run();
  db.prepare('DROP TABLE IF EXISTS irt_snapshot_meta').run();
  db.prepare('DROP TABLE IF EXISTS irt_grupos').run();
  db.prepare('DROP TABLE IF EXISTS categorias_funcionarios').run();
  db.prepare('DROP TABLE IF EXISTS funcionarios_historico').run();
  
  // Reabilitar foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();
  
  console.log('✅ Tabelas removidas com sucesso!');
  console.log('\n📋 Agora execute: node src/database/setup-folha-profissional.js\n');
} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  db.close();
}
