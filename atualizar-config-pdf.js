const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'folha.db');
const db = new Database(dbPath);

console.log('🔄 Atualizando tabela de configurações de relatórios...\n');

try {
    // Verificar se as colunas já existem
    const tableInfo = db.prepare("PRAGMA table_info(config_relatorios)").all();
    const colunas = tableInfo.map(col => col.name);
    
    console.log('📋 Colunas atuais:', colunas.join(', '));
    
    const novasColunas = [
        { nome: 'pdf_orientacao', tipo: 'TEXT DEFAULT "portrait"' },
        { nome: 'marca_dagua_tipo', tipo: 'TEXT DEFAULT "texto"' },
        { nome: 'marca_dagua_texto', tipo: 'TEXT DEFAULT "CONFIDENCIAL"' },
        { nome: 'marca_dagua_imagem', tipo: 'TEXT' }
    ];
    
    let adicionadas = 0;
    
    for (const coluna of novasColunas) {
        if (!colunas.includes(coluna.nome)) {
            console.log(`➕ Adicionando coluna: ${coluna.nome}`);
            db.prepare(`ALTER TABLE config_relatorios ADD COLUMN ${coluna.nome} ${coluna.tipo}`).run();
            adicionadas++;
        } else {
            console.log(`✓ Coluna ${coluna.nome} já existe`);
        }
    }
    
    console.log(`\n✅ Atualização concluída! ${adicionadas} colunas adicionadas.`);
    
    // Mostrar configuração atual
    const config = db.prepare('SELECT * FROM config_relatorios WHERE id = 1').get();
    console.log('\n📊 Configuração atual:');
    console.log('  - Orientação PDF:', config.pdf_orientacao || 'portrait');
    console.log('  - Tipo de Marca d\'água:', config.marca_dagua_tipo || 'texto');
    console.log('  - Texto da Marca d\'água:', config.marca_dagua_texto || 'CONFIDENCIAL');
    console.log('  - Imagem da Marca d\'água:', config.marca_dagua_imagem ? 'Definida' : 'Não definida');
    
} catch (error) {
    console.error('❌ Erro ao atualizar:', error.message);
} finally {
    db.close();
}
