const db = require('./src/config/database');

console.log('🚀 Executando migração: Adicionar coluna funcionario_id em usuarios...\n');

try {
  const columns = db.prepare('PRAGMA table_info(usuarios)').all();
  const hasFuncionarioId = columns.some(col => col.name === 'funcionario_id');

  if (!hasFuncionarioId) {
    console.log('📝 Adicionando coluna funcionario_id...');
    db.exec(`ALTER TABLE usuarios ADD COLUMN funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL`);
    console.log('✅ Coluna funcionario_id adicionada.');
  } else {
    console.log('ℹ️ Coluna funcionario_id já existe. Nenhuma alteração necessária.');
  }
} catch (error) {
  console.error('❌ Erro na migração:', error.message);
}
