const Database = require('better-sqlite3');
const db = new Database('./database/sgva.db');

const abono = db.prepare(`
  SELECT id, nome, incide_inss, incide_irt, limite_isencao_fiscal, percentual
  FROM subsidios 
  WHERE nome LIKE '%Abono%' OR nome LIKE '%Família%'
`).get();

console.log('=== Abono de Família ===');
console.log('ID:', abono.id);
console.log('Nome:', abono.nome);
console.log('Percentual:', abono.percentual + '%');
console.log('incide_inss:', abono.incide_inss, '(1=sim, 0=não)');
console.log('incide_irt:', abono.incide_irt, '(1=sim, 0=não)');
console.log('limite_isencao_fiscal:', abono.limite_isencao_fiscal);

console.log('\n❌ PROBLEMA: incide_irt=1 significa que está sendo tributado!');
console.log('✅ SOLUÇÃO: Deve ser incide_irt=0 para ser isento de IRT');

db.close();
