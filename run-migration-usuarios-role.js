const db = require('./src/config/database');

console.log('🚀 Executando migração: Adicionar coluna ROLE em usuarios...\n');

try {
  // 1. Verificar se a coluna já existe
  const columns = db.prepare('PRAGMA table_info(usuarios)').all();
  const hasRole = columns.some(col => col.name === 'role');

  if (!hasRole) {
    console.log('📝 Adicionando coluna role...');
    db.exec("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'funcionario'");
    console.log('✅ Coluna role adicionada.');

    // 2. Migrar dados de funcao para role
    console.log('🔄 Migrando dados de funcao -> role...');
    
    // Mapeamento de legado
    db.exec(`UPDATE usuarios SET role = 'admin' WHERE funcao = 'admin'`);
    db.exec(`UPDATE usuarios SET role = 'gerente' WHERE funcao LIKE '%gerente%'`);
    // Outros ficam como 'funcionario' (default)
    
    console.log('✅ Dados migrados com sucesso.');
  } else {
    console.log('ℹ️ Coluna role já existe. Nenhuma alteração necessária.');
  }

} catch (error) {
  console.error('❌ Erro na migração:', error.message);
  // Não matar o processo, pois pode ser erro de "duplicate column" em race condition
}
