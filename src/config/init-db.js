const DespesaModel = require('../models/despesa.model');

console.log('\n🔧 Inicializando tabela de despesas...\n');

try {
  // Criar tabela de despesas
  DespesaModel.createTable();
  
  console.log('\n✅ Tabela de despesas criada/verificada com sucesso!\n');
} catch (error) {
  console.error('\n❌ Erro ao inicializar tabela de despesas:', error);
  process.exit(1);
}
