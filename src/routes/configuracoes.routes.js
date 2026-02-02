const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Criar tabela de configurações de relatórios
db.exec(`
  CREATE TABLE IF NOT EXISTS config_relatorios (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    titulo TEXT DEFAULT 'Relatório de Funcionários',
    subtitulo TEXT DEFAULT 'Listagem Completa',
    rodape TEXT DEFAULT 'Documento Confidencial',
    assinatura_gerente TEXT,
    cargo_gerente TEXT DEFAULT 'Gerente Geral',
    assinatura_rh TEXT,
    cargo_rh TEXT DEFAULT 'Diretor de RH',
    mostrar_foto INTEGER DEFAULT 1,
    mostrar_salario INTEGER DEFAULT 1,
    mostrar_contatos INTEGER DEFAULT 1,
    pdf_orientacao TEXT DEFAULT 'portrait',
    marca_dagua_tipo TEXT DEFAULT 'texto',
    marca_dagua_texto TEXT DEFAULT 'CONFIDENCIAL',
    marca_dagua_imagem TEXT,
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  );

  INSERT OR IGNORE INTO config_relatorios (id) VALUES (1);
`);

// GET - Obter configurações
router.get('/', (req, res) => {
    try {
        const config = db.prepare('SELECT * FROM config_relatorios WHERE id = 1').get();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT - Atualizar configurações
router.put('/', (req, res) => {
    try {
        const {
            titulo, subtitulo, rodape,
            assinatura_gerente, cargo_gerente,
            assinatura_rh, cargo_rh,
            mostrar_foto, mostrar_salario, mostrar_contatos,
            pdf_orientacao, marca_dagua_tipo, marca_dagua_texto, marca_dagua_imagem
        } = req.body;

        db.prepare(`
            UPDATE config_relatorios SET
                titulo = ?,
                subtitulo = ?,
                rodape = ?,
                assinatura_gerente = ?,
                cargo_gerente = ?,
                assinatura_rh = ?,
                cargo_rh = ?,
                mostrar_foto = ?,
                mostrar_salario = ?,
                mostrar_contatos = ?,
                pdf_orientacao = ?,
                marca_dagua_tipo = ?,
                marca_dagua_texto = ?,
                marca_dagua_imagem = ?,
                atualizado_em = datetime('now', 'localtime')
            WHERE id = 1
        `).run(
            titulo, subtitulo, rodape,
            assinatura_gerente, cargo_gerente,
            assinatura_rh, cargo_rh,
            mostrar_foto ? 1 : 0,
            mostrar_salario ? 1 : 0,
            mostrar_contatos ? 1 : 0,
            pdf_orientacao || 'portrait',
            marca_dagua_tipo || 'texto',
            marca_dagua_texto || 'CONFIDENCIAL',
            marca_dagua_imagem || null
        );

        res.json({ success: true, message: 'Configurações atualizadas com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;