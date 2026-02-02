const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
console.log(`Verificando banco: ${dbPath}`);

const db = new Database(dbPath);

// Verificar se a tabela sistema_modulos existe
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='sistema_modulos'
`).all();

console.log('\nTabela sistema_modulos existe?', tables.length > 0);

if (tables.length > 0) {
  // Verificar estrutura
  const structure = db.prepare(`PRAGMA table_info(sistema_modulos)`).all();
  console.log('\nEstrutura da tabela:');
  console.log(structure);
  
  // Verificar dados
  const data = db.prepare(`SELECT * FROM sistema_modulos`).all();
  console.log(`\nRegistros encontrados: ${data.length}`);
  console.log(data);
} else {
  console.log('\n❌ Tabela sistema_modulos NÃO existe!');
  console.log('Executando migração...\n');
  
  // Criar a tabela
  const migration = `
    CREATE TABLE IF NOT EXISTS sistema_modulos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modulo TEXT NOT NULL UNIQUE,
      ativo INTEGER DEFAULT 1,
      configuracao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Inserir módulos padrão
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
  console.log('✅ Migração executada com sucesso!');
  
  // Verificar novamente
  const newData = db.prepare(`SELECT * FROM sistema_modulos`).all();
  console.log(`\nRegistros criados: ${newData.length}`);
  console.log(newData);
}

db.close();
console.log('\n✅ Verificação concluída!');
