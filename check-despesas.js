const db = require('better-sqlite3')('database/sgva.db');

const despesas = db.prepare(`
  SELECT * FROM despesas 
  WHERE categoria IN ('salarios', 'inss_patronal')
  ORDER BY data DESC
`).all();

console.log('\n📊 Despesas de Folha:\n');
despesas.forEach(d => {
  console.log(`Data: ${d.data}`);
  console.log(`Categoria: ${d.categoria}`);
  console.log(`Valor: ${d.valor} KZ`);
  console.log(`Descrição: ${d.descricao}`);
  console.log('---\n');
});

db.close();
