const db = require('./src/config/database');

console.log('\n=== VERIFICANDO TABELAS ===\n');

// Verificar tabela folhas_pagamento
try {
  const folhasInfo = db.prepare('PRAGMA table_info(folhas_pagamento)').all();
  if (folhasInfo.length > 0) {
    console.log('✅ Tabela folhas_pagamento existe');
    folhasInfo.forEach(c => console.log(`   - ${c.name} (${c.type})`));
  } else {
    console.log('❌ Tabela folhas_pagamento NÃO existe - Criando...');
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS folhas_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        total_funcionarios INTEGER DEFAULT 0,
        total_salario_base REAL DEFAULT 0,
        total_descontos REAL DEFAULT 0,
        total_salario_liquido REAL DEFAULT 0,
        total_inss_patronal REAL DEFAULT 0,
        total_custo_empresa REAL DEFAULT 0,
        calculado_em TEXT DEFAULT (datetime('now', 'localtime')),
        pago INTEGER DEFAULT 0,
        observacoes TEXT,
        UNIQUE(mes, ano)
      )
    `).run();
    
    console.log('✅ Tabela folhas_pagamento criada com sucesso');
  }
} catch (error) {
  console.error('❌ Erro:', error.message);
}

// Verificar categorias de despesas
console.log('\n=== CATEGORIAS DE DESPESAS ===\n');
const categorias = db.prepare("SELECT DISTINCT categoria FROM despesas").all();
console.log('Categorias existentes:', categorias.map(c => c.categoria).join(', '));

// Verificar se existe despesa de salários
const despesasSalarios = db.prepare("SELECT COUNT(*) as total FROM despesas WHERE categoria = 'salarios'").get();
console.log(`\nDespesas de salários: ${despesasSalarios.total}`);

const despesasINSS = db.prepare("SELECT COUNT(*) as total FROM despesas WHERE categoria = 'inss_patronal'").get();
console.log(`Despesas de INSS Patronal: ${despesasINSS.total}`);

console.log('\n✅ Verificação concluída\n');
