const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const rows = db
  .prepare('SELECT nome, descricao, encargos_especificos FROM categorias_funcionarios ORDER BY nome')
  .all();

if (!rows.length) {
  console.error('Nenhuma categoria encontrada em categorias_funcionarios.');
  process.exit(1);
}

const outputPath = path.join(__dirname, '../src/database/categorias-funcionarios-default.json');
fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf8');

console.log(`Categorias exportadas para: ${outputPath}`);
