const sqlite3 = require('better-sqlite3');
const db = sqlite3('database/sgva.db');

console.log('\n=== VERIFICANDO DADOS NO BANCO ===\n');

// Listar tabelas
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tabelas existentes:', tables.map(t => t.name).join(', '));
console.log('');

// Verificar dados em cada tabela relevante
const tabelasParaVerificar = [
    'funcionarios',
    'folhas_pagamento',
    'folhas_mensais',
    'atribuicoes_subsidios',
    'historico_atribuicoes',
    'usuarios'
];

tabelasParaVerificar.forEach(tabela => {
    try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${tabela}`).get();
        console.log(`${tabela}: ${count.count} registro(s)`);
        
        if (count.count > 0) {
            const sample = db.prepare(`SELECT * FROM ${tabela} LIMIT 2`).all();
            console.log('  Exemplo:', JSON.stringify(sample[0], null, 2));
        }
    } catch (error) {
        console.log(`${tabela}: TABELA NÃO EXISTE`);
    }
});

db.close();
