
const db = require('./src/config/database');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'presencas'").get();
console.log(row.sql);
