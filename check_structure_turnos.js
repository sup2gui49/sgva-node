const db = require('./src/config/database');

try {
    const infos = db.prepare("PRAGMA table_info(funcionarios)").all();
    console.log('--- Colunas da Tabela Funcionarios ---');
    console.log(infos.map(c => c.name).join(', '));
    
    // Verificar se existe tabela de turnos
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%turno%'").all();
    console.log('\n--- Tabelas de Turno ---');
    console.log(tables.map(t => t.name).join(', ') || 'Nenhuma encontrada');

} catch (err) {
    console.error(err.message);
}
