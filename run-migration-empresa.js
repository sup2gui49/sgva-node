const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
const migrationPath = path.join(__dirname, 'database', 'migrations', '005_create_empresa_table.sql');

console.log('🔄 Executando migration para tabela empresa...\n');

try {
    const db = sqlite3(dbPath);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    db.exec(sql);
    
    console.log('✅ Tabela empresa criada com sucesso!');
    
    // Verificar
    const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
    console.log('\n📊 Dados padrão inseridos:');
    console.log('   Nome:', empresa.nome);
    console.log('   NIF:', empresa.nif);
    console.log('   Endereço:', empresa.endereco);
    console.log('   Cidade:', empresa.cidade);
    console.log('   Telefone:', empresa.telefone);
    console.log('   Email:', empresa.email);
    
    db.close();
    console.log('\n✅ Migration concluída!\n');
} catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
}
