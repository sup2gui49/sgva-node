const db = require('better-sqlite3')('database/sgva.db');

const mes = '12';
const resultSal = db.prepare("DELETE FROM despesas WHERE categoria = 'salarios' AND strftime('%m', data) = ?").run(mes);
const resultInss = db.prepare("DELETE FROM despesas WHERE categoria = 'inss_patronal' AND strftime('%m', data) = ?").run(mes);

console.log(`✅ Removidas ${resultSal.changes} despesas de salários`);
console.log(`✅ Removidas ${resultInss.changes} despesas de INSS patronal`);
db.close();
