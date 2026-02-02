const db = require('better-sqlite3')('database/sgva.db');

console.log('🧪 Teste Rápido: Status de Pagamento\n');

// Limpar testes anteriores
console.log('1. Limpando registros de dezembro...');
db.prepare('DELETE FROM folha_pagamentos_status WHERE mes = 12 AND ano = 2025').run();
db.prepare('DELETE FROM folhas_pagamento WHERE mes = 12 AND ano = 2025').run();
console.log('   ✅ Limpo\n');

// Inserir folha manualmente
console.log('2. Inserindo folhas de teste...');
const insertFolha = db.prepare(`
  INSERT INTO folhas_pagamento (
    mes, ano, funcionario_id, salario_base, total_subsidios, 
    subsidios_isentos, subsidios_tributaveis, salario_bruto,
    inss_empregado, inss_patronal, deducao_fixa, rendimento_colectavel,
    irt, total_descontos, salario_liquido, calculado_em
  ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, 0, ?, ?, ?, ?, datetime('now', 'localtime'))
`);

const insertStatus = db.prepare(`
  INSERT OR REPLACE INTO folha_pagamentos_status (
    funcionario_id, mes, ano, status, valor_pago, pago_em
  ) VALUES (?, ?, ?, 'pago', ?, datetime('now', 'localtime'))
`);

// Inserir para funcionário ID 1
insertFolha.run(12, 2025, 1, 120000, 120000, 3600, 9600, 116400, 11640, 7560, 100200);
insertStatus.run(1, 12, 2025, 100200);

// Inserir para funcionário ID 2
insertFolha.run(12, 2025, 2, 3367624.61, 3367624.61, 101028.74, 269409.97, 3098195.64, 310819.56, 208547.73, 2579828.35);
insertStatus.run(2, 12, 2025, 2579828.35);

console.log('   ✅ 2 folhas inseridas\n');

// Verificar status
console.log('3. Verificando status no histórico...');
const folhas = db.prepare(`
  SELECT f.*, 
         func.nome as funcionario_nome,
         COALESCE(fps.status, 'pendente') as status_pagamento,
         fps.valor_pago,
         fps.pago_em
  FROM folhas_pagamento f
  JOIN funcionarios func ON f.funcionario_id = func.id
  LEFT JOIN folha_pagamentos_status fps ON 
    fps.funcionario_id = f.funcionario_id AND
    fps.mes = f.mes AND
    fps.ano = f.ano
  WHERE f.mes = 12 AND f.ano = 2025
`).all();

folhas.forEach(f => {
  console.log(`   ${f.funcionario_nome}: ${f.status_pagamento} (${f.salario_liquido.toLocaleString('pt-AO')} KZ)`);
});

if (folhas.every(f => f.status_pagamento === 'pago')) {
  console.log('\n✅ SUCESSO! Todos aparecem como "pago"');
} else {
  console.log('\n❌ ERRO! Alguns aparecem como "pendente"');
}

db.close();
