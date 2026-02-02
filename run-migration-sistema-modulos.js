const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

console.log('🚀 Executando migração: sistema_modulos\n');

try {
  const migrationPath = path.join(__dirname, 'database', 'migrations', '006_create_sistema_modulos.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Lendo migração:', migrationPath);
  console.log('📝 SQL:', migrationSQL.substring(0, 100) + '...\n');
  
  db.exec(migrationSQL);
  
  console.log('✅ Migração executada com sucesso!');
  
  // Verificar se a tabela foi criada
  const result = db.prepare('SELECT * FROM sistema_modulos WHERE id = 1').get();
  console.log('\n📊 Configuração inicial:');
  console.log(result);
  
} catch (error) {
  console.error('❌ Erro ao executar migração:', error.message);
  process.exit(1);
}
