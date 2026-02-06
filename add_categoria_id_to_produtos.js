const db = require('./src/config/database');

console.log('Verificando tabela produtos...');

try {
    const tableInfo = db.prepare('PRAGMA table_info(produtos)').all();
    const hasCategoriaId = tableInfo.some(col => col.name === 'categoria_id');

    if (!hasCategoriaId) {
        console.log('Adicionando coluna categoria_id em produtos...');
        db.exec('ALTER TABLE produtos ADD COLUMN categoria_id INTEGER REFERENCES categorias_produtos(id)');
        console.log('✅ Coluna categoria_id adicionada com sucesso.');
    } else {
        console.log('ℹ️ Coluna categoria_id já existe.');
    }

    console.log('Verificação concluída.');
} catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
}
