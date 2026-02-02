const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../database');
const dbPath = path.join(dbDir, 'sgva.db');

// Criar diretório se não existir
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Conectar ao banco de dados
const db = new Database(dbPath);
db.filePath = dbPath; // compartilhar caminho com outros módulos (ex.: backup)

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ Banco de dados conectado:', dbPath);

module.exports = db;
