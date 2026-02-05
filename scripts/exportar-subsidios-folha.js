const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const rows = db
  .prepare(`
    SELECT
      nome,
      descricao,
      tipo_calculo,
      tipo_subsidio,
      valor_padrao_empresa,
      percentual,
      limite_isencao_fiscal,
      meses_pagamento,
      parcelas,
      incide_inss,
      incide_irt,
      aplicar_a,
      categoria_aplicavel
    FROM subsidios
    WHERE ativo = 1
    ORDER BY tipo_subsidio, nome
  `)
  .all();

if (!rows.length) {
  console.error('Nenhum subsidio encontrado em subsidios.');
  process.exit(1);
}

const outputPath = path.join(__dirname, '../src/database/subsidios-default.json');
fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf8');

console.log(`Subsidios exportados para: ${outputPath}`);
