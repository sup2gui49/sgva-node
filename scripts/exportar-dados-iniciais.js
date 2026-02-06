const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

console.log('📦 Exportando dados iniciais do banco local...');

// 1. Exportar Subsídios
try {
    const subsidios = db.prepare('SELECT * FROM subsidios WHERE ativo = 1').all();
    const subsidiosPath = path.join(__dirname, '../src/database/subsidios-default.json');
    
    // Remover IDs para evitar conflito de chave primária na importação
    const subsidiosClean = subsidios.map(({id, criado_em, atualizado_em, ...rest}) => rest);
    
    fs.writeFileSync(subsidiosPath, JSON.stringify(subsidiosClean, null, 2));
    console.log(`✅ ${subsidios.length} subsídios exportados para subsidios-default.json`);
} catch (error) {
    console.error('Erro ao exportar subsídios:', error.message);
}

// 2. Exportar Categorias
try {
    const categorias = db.prepare('SELECT * FROM categorias_funcionarios WHERE ativo = 1').all();
    const categoriasPath = path.join(__dirname, '../src/database/categorias-funcionarios-default.json');
    
    // Remover IDs
    const categoriasClean = categorias.map(({id, criado_em, ...rest}) => rest);
    
    fs.writeFileSync(categoriasPath, JSON.stringify(categoriasClean, null, 2));
    console.log(`✅ ${categorias.length} categorias exportadas para categorias-funcionarios-default.json`);
} catch (error) {
    console.error('Erro ao exportar categorias:', error.message);
}
