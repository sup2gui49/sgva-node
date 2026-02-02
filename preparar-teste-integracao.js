const db = require('better-sqlite3')('database/sgva.db');

console.log('🔍 Verificando Configuração de Módulos\n');

// Verificar configuração atual
const config = db.prepare('SELECT * FROM sistema_modulos WHERE id = 1').get();
console.log('📋 Configuração Atual:');
console.log('  Vendas Habilitado:', config.vendas_enabled ? 'Sim' : 'Não');
console.log('  Folha Habilitada:', config.folha_enabled ? 'Sim' : 'Não');
console.log('  Modo Integração:', config.integracao_modo);

// Limpar registros antigos de status de pagamento de dezembro
console.log('\n🧹 Limpando registros de teste anteriores...');
db.prepare('DELETE FROM folha_pagamentos_status WHERE mes = 12 AND ano = 2025').run();
db.prepare('DELETE FROM folhas_pagamento WHERE mes = 12 AND ano = 2025').run();
db.prepare("DELETE FROM despesas WHERE data LIKE '2025-12%'").run();

console.log('✅ Banco limpo para novo teste\n');

console.log('📝 Para testar:');
console.log('1. Configure integração para "nenhuma" no dashboard');
console.log('2. Calcule e confirme folha de dezembro');
console.log('3. Verifique que NÃO aparece aviso de saldo insuficiente');
console.log('4. Verifique que o status aparece como "pago" no histórico');

db.close();
