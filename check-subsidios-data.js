const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

console.log('=== SUBSÍDIOS ===');
const subsidios = db.prepare('SELECT * FROM subsidios WHERE ativo = 1').all();
console.log(`Total: ${subsidios.length} subsídios ativos\n`);
subsidios.forEach(s => {
  console.log(`ID: ${s.id} | Nome: ${s.nome}`);
  console.log(`  Tipo: ${s.tipo_calculo} | Valor: ${s.valor_padrao_empresa} | Percentual: ${s.percentual}%`);
  console.log(`  Aplicar a: ${s.aplicar_a} | Limite isenção: ${s.limite_isencao_fiscal}`);
  console.log('');
});

console.log('=== ATRIBUIÇÕES (funcionarios_subsidios) ===');
const atribuicoes = db.prepare(`
  SELECT fs.*, f.nome as funcionario, s.nome as subsidio
  FROM funcionarios_subsidios fs
  JOIN funcionarios f ON fs.funcionario_id = f.id
  JOIN subsidios s ON fs.subsidio_id = s.id
  WHERE fs.ativo = 1
`).all();
console.log(`Total: ${atribuicoes.length} atribuições\n`);
atribuicoes.forEach(a => {
  console.log(`${a.funcionario} → ${a.subsidio} (valor_especifico: ${a.valor_especifico || 'NULL'})`);
});

db.close();
