const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'database', 'sgva.db');

function ensureEmpresaTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS empresa (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            nome TEXT NOT NULL,
            nif TEXT,
            endereco TEXT,
            cidade TEXT,
            telefone TEXT,
            email TEXT,
            website TEXT,
            logo_base64 TEXT,
            rodape_documentos TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        INSERT OR IGNORE INTO empresa (id, nome, nif, endereco, cidade, telefone, email, rodape_documentos)
        VALUES (
            1,
            'Sua Empresa Lda',
            '000000000',
            'Rua Principal, nº 123',
            'Luanda, Angola',
            '+244 900 000 000',
            'contato@suaempresa.ao',
            'Documento gerado pelo SGVA'
        );
    `);
}

// GET - Obter informações da empresa
router.get('/', (req, res) => {
    let db;
    try {
        console.log('📊 GET /api/empresa - Buscando dados da empresa...');
        console.log('📁 DB Path:', dbPath);
        
        db = new Database(dbPath);
        ensureEmpresaTable(db);
        const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();

        if (!empresa) {
            console.log('⚠️  Nenhuma empresa encontrada, criando registro padrão...');
            // Criar registro padrão se não existir
            const insert = db.prepare(`
                INSERT OR IGNORE INTO empresa (id, nome, nif, endereco, cidade, telefone, email, rodape_documentos)
                VALUES (1, 'Sua Empresa Lda', '000000000', 'Rua Principal, nº 123', 'Luanda, Angola', 
                        '+244 900 000 000', 'contato@suaempresa.ao', 'Documento gerado pelo SGVA')
            `);
            insert.run();
            
            const empresaCriada = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
            db.close();
            
            return res.json({
                success: true,
                data: empresaCriada
            });
        }

        db.close();
        console.log('✅ Empresa encontrada:', empresa.nome);
        
        res.json({
            success: true,
            data: empresa
        });
    } catch (error) {
        console.error('❌ Erro ao buscar empresa:', error);
        if (db) db.close();
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao buscar informações da empresa'
        });
    }
});

// PUT - Atualizar informações da empresa
router.put('/', (req, res) => {
    let db;
    try {
        console.log('📝 PUT /api/empresa - Atualizando dados da empresa...');
        
        const {
            nome,
            nif,
            endereco,
            cidade,
            telefone,
            email,
            website,
            logo_base64,
            rodape_documentos
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                success: false,
                error: 'Nome da empresa é obrigatório'
            });
        }

        db = new Database(dbPath);
        ensureEmpresaTable(db);
        
        // Verificar se registro existe
        const existe = db.prepare('SELECT id FROM empresa WHERE id = 1').get();
        
        if (!existe) {
            console.log('⚠️  Registro não existe, criando...');
            const insert = db.prepare(`
                INSERT INTO empresa (id, nome, nif, endereco, cidade, telefone, email, website, logo_base64, rodape_documentos)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            insert.run(nome, nif || null, endereco || null, cidade || null, telefone || null, 
                      email || null, website || null, logo_base64 || null, rodape_documentos || null);
        } else {
            console.log('📝 Atualizando registro existente...');
            const updateEmpresa = db.prepare(`
                UPDATE empresa 
                SET nome = ?,
                    nif = ?,
                    endereco = ?,
                    cidade = ?,
                    telefone = ?,
                    email = ?,
                    website = ?,
                    logo_base64 = ?,
                    rodape_documentos = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `);

            updateEmpresa.run(
                nome,
                nif || null,
                endereco || null,
                cidade || null,
                telefone || null,
                email || null,
                website || null,
                logo_base64 || null,
                rodape_documentos || null
            );
        }

        const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
        db.close();

        console.log('✅ Empresa atualizada:', nome);

        res.json({
            success: true,
            message: 'Informações da empresa atualizadas com sucesso',
            data: empresa
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar empresa:', error);
        if (db) db.close();
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao atualizar informações da empresa'
        });
    }
});

module.exports = router;
