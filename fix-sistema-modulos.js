const Database = require('better-sqlite3');
const path = require('path');

// Usar o mesmo caminho que o servidor usa
const dbPath = path.join(__dirname, 'database', 'sgva.db');
console.log(`Aplicando migração em: ${dbPath}\n`);

const db = new Database(dbPath);

try {
  // Verificar se a tabela existe
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='sistema_modulos'
  `).all();

  if (tables.length === 0) {
    console.log('❌ Tabela sistema_modulos NÃO existe. Criando...\n');
    
    const migration = `
      CREATE TABLE IF NOT EXISTS sistema_modulos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modulo TEXT NOT NULL UNIQUE,
        ativo INTEGER DEFAULT 1,
        configuracao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO sistema_modulos (modulo, ativo, configuracao) VALUES 
        ('vendas', 1, '{}'),
        ('folha', 1, '{}'),
        ('produtos', 1, '{}'),
        ('clientes', 1, '{}'),
        ('categorias', 1, '{}'),
        ('iva', 1, '{}'),
        ('empresa', 1, '{}');
    `;
    
    db.exec(migration);
    console.log('✅ Migração aplicada com sucesso!\n');
  } else {
    console.log('✅ Tabela sistema_modulos já existe!\n');
  }

  // Mostrar dados
  const data = db.prepare(`SELECT * FROM sistema_modulos`).all();
  console.log(`Total de módulos: ${data.length}`);
  console.log(data);

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  db.close();
}
