const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
console.log(`Corrigindo estrutura da tabela sistema_modulos em: ${dbPath}\n`);

const db = new Database(dbPath);

try {
  // Deletar tabela antiga
  db.exec(`DROP TABLE IF EXISTS sistema_modulos`);
  console.log('✅ Tabela antiga removida\n');

  // Criar com estrutura correta
  db.exec(`
    CREATE TABLE sistema_modulos (
      id INTEGER PRIMARY KEY DEFAULT 1,
      vendas_enabled INTEGER DEFAULT 1,
      folha_enabled INTEGER DEFAULT 1,
      integracao_modo TEXT DEFAULT 'bidirecional',
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      updated_at DATETIME DEFAULT (datetime('now','localtime'))
    );

    INSERT INTO sistema_modulos (id, vendas_enabled, folha_enabled, integracao_modo)
    VALUES (1, 1, 1, 'bidirecional');
  `);

  console.log('✅ Tabela criada com estrutura correta!\n');

  // Verificar
  const data = db.prepare('SELECT * FROM sistema_modulos').all();
  console.log('Dados:', data);

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  db.close();
}
