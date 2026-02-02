const Database = require('better-sqlite3');

const db = new Database('./database/sgva.db');

const escaloes = [
  { ordem: 1, de: 0, ate: 100000, parcela: 0, taxa: 0, excesso: 0 },
  { ordem: 2, de: 100001, ate: 150000, parcela: 3000, taxa: 0.13, excesso: 100001 },
  { ordem: 3, de: 150001, ate: 200000, parcela: 12500, taxa: 0.16, excesso: 150001 },
  { ordem: 4, de: 200001, ate: 300000, parcela: 31250, taxa: 0.18, excesso: 200001 },
  { ordem: 5, de: 300001, ate: 500000, parcela: 49250, taxa: 0.19, excesso: 300001 },
  { ordem: 6, de: 500001, ate: 1000000, parcela: 87250, taxa: 0.2, excesso: 500001 },
  { ordem: 7, de: 1000001, ate: 1500000, parcela: 187249, taxa: 0.21, excesso: 1000001 },
  { ordem: 8, de: 1500001, ate: 2000000, parcela: 292249, taxa: 0.22, excesso: 1500001 },
  { ordem: 9, de: 2000001, ate: 2500000, parcela: 402249, taxa: 0.23, excesso: 2000001 },
  { ordem: 10, de: 2500001, ate: 5000000, parcela: 517249, taxa: 0.24, excesso: 2500001 },
  { ordem: 11, de: 5000001, ate: 10000000, parcela: 1117249, taxa: 0.245, excesso: 5000001 },
  { ordem: 12, de: 10000001, ate: null, parcela: 2342248, taxa: 0.25, excesso: 10000001 }
];

const transaction = db.transaction(() => {
  db.prepare('DELETE FROM irt_grupos').run();
  const insert = db.prepare(`
    INSERT INTO irt_grupos (ordem, de, ate, parcela_fixa, taxa, excesso, ativo)
    VALUES (@ordem, @de, @ate, @parcela, @taxa, @excesso, 1)
  `);
  escaloes.forEach(esc => insert.run(esc));
});

transaction();

console.log('IRT escalões atualizados com sucesso.');

db.close();