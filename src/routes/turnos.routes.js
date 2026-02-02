const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

// Todas as rotas de turnos requerem autenticação
router.use(authMiddleware);

// Listar todos os turnos
router.get('/', (req, res) => {
    try {
        const turnos = db.prepare('SELECT * FROM turnos WHERE ativo = 1 ORDER BY nome').all();
        res.json({ success: true, data: turnos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Criar novo turno
router.post('/', authorize('admin', 'gerente'), (req, res) => {
    try {
        const { nome, entrada, saida, inicio_intervalo, fim_intervalo, tolerancia_entrada, tolerancia_saida, dias_semana } = req.body;
        
        if (!nome || !entrada || !saida) {
            return res.status(400).json({ success: false, message: 'Nome, Entrada e Saída são obrigatórios.' });
        }

        const diasJson = dias_semana ? JSON.stringify(dias_semana) : '[1,2,3,4,5]';

        const result = db.prepare(`
            INSERT INTO turnos (nome, entrada, saida, inicio_intervalo, fim_intervalo, tolerancia_entrada, tolerancia_saida, dias_semana)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(nome, entrada, saida, inicio_intervalo, fim_intervalo, tolerancia_entrada || 5, tolerancia_saida || 5, diasJson);

        res.json({ success: true, id: result.lastInsertRowid, message: 'Turno criado com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Atualizar turno
router.put('/:id', authorize('admin', 'gerente'), (req, res) => {
    try {
        const { nome, entrada, saida, inicio_intervalo, fim_intervalo, tolerancia_entrada, tolerancia_saida, dias_semana } = req.body;
        const { id } = req.params;

        const diasJson = dias_semana ? JSON.stringify(dias_semana) : null;

        let sql = `UPDATE turnos SET nome = ?, entrada = ?, saida = ?, inicio_intervalo = ?, fim_intervalo = ?, tolerancia_entrada = ?, tolerancia_saida = ?`;
        const params = [nome, entrada, saida, inicio_intervalo, fim_intervalo, tolerancia_entrada || 5, tolerancia_saida || 5];

        if (diasJson) {
            sql += `, dias_semana = ?`;
            params.push(diasJson);
        }

        sql += ` WHERE id = ?`;
        params.push(id);

        db.prepare(sql).run(...params);
        res.json({ success: true, message: 'Turno atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remover turno (soft delete)
router.delete('/:id', authorize('admin', 'gerente'), (req, res) => {
    try {
        const { id } = req.params;
        // Verificar se tem funcionários usando
        const uso = db.prepare('SELECT count(*) as qtd FROM funcionarios WHERE turno_id = ?').get(id);
        
        if (uso.qtd > 0) {
            return res.status(400).json({ success: false, message: 'Não é possível excluir este turno pois existem funcionários vinculados a ele.' });
        }

        db.prepare('UPDATE turnos SET ativo = 0 WHERE id = ?').run(id);
        res.json({ success: true, message: 'Turno removido com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
