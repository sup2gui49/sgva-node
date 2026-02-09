
const db = require('./src/config/database');
const cols = db.prepare("PRAGMA table_info(turnos)").all();
console.log('Cols:', cols);
const turnos = db.prepare('SELECT * FROM turnos').all();
console.log('Data:', turnos);
