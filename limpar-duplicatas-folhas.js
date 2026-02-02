const db = require('better-sqlite3')('database/sgva.db');

console.log('🧹 Limpando Duplicatas de Folhas de Pagamento\n');

// Contar registros duplicados
const duplicatas = db.prepare(`
  SELECT mes, ano, funcionario_id, COUNT(*) as total
  FROM folhas_pagamento
  GROUP BY mes, ano, funcionario_id
  HAVING COUNT(*) > 1
`).all();

if (duplicatas.length === 0) {
  console.log('✅ Não há duplicatas no banco de dados');
  db.close();
  process.exit(0);
}

console.log(`❗ Encontradas ${duplicatas.length} entradas duplicadas:\n`);

duplicatas.forEach(d => {
  const func = db.prepare('SELECT nome FROM funcionarios WHERE id = ?').get(d.funcionario_id);
  console.log(`  ${func?.nome || 'ID ' + d.funcionario_id} - ${d.mes}/${d.ano}: ${d.total} registros`);
});

console.log('\n🔄 Mantendo apenas o registro mais recente de cada funcionário/mês/ano...\n');

// Para cada duplicata, manter apenas o mais recente
duplicatas.forEach(d => {
  // Buscar todos os IDs ordenados por data (mais recente primeiro)
  const registros = db.prepare(`
    SELECT id, calculado_em 
    FROM folhas_pagamento 
    WHERE mes = ? AND ano = ? AND funcionario_id = ?
    ORDER BY calculado_em DESC
  `).all(d.mes, d.ano, d.funcionario_id);
  
  // Manter o primeiro (mais recente), deletar os outros
  const manter = registros[0].id;
  const deletar = registros.slice(1).map(r => r.id);
  
  console.log(`  Mantendo ID ${manter}, deletando: [${deletar.join(', ')}]`);
  
  deletar.forEach(id => {
    db.prepare('DELETE FROM folhas_pagamento WHERE id = ?').run(id);
  });
});

// Verificar resultado
const aposLimpeza = db.prepare(`
  SELECT mes, ano, funcionario_id, COUNT(*) as total
  FROM folhas_pagamento
  GROUP BY mes, ano, funcionario_id
  HAVING COUNT(*) > 1
`).all();

console.log('\n✅ Limpeza concluída!');
console.log(`   Duplicatas restantes: ${aposLimpeza.length}`);

// Mostrar resumo final
const totalRegistros = db.prepare('SELECT COUNT(*) as total FROM folhas_pagamento').get();
console.log(`   Total de registros: ${totalRegistros.total}`);

db.close();
