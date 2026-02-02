const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// GET /monitor?data=YYYY-MM-DD&turno_id=X
router.get('/monitor', (req, res) => {
    try {
        const { data, turno_id } = req.query;
        if (!data) {
            return res.status(400).json({ success: false, message: 'Data é obrigatória' });
        }

        // Descobrir o dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
        const dateParts = data.split('-');
        const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const diaSemana = dateObj.getDay();

        // Buscar funcionários do turno
        let sqlFunc = `
            SELECT f.id, f.nome, f.foto, f.turno_id, f.trabalha_fds, t.dias_semana
            FROM funcionarios f
            LEFT JOIN turnos t ON f.turno_id = t.id
            WHERE f.ativo = 1
        `;
        const paramsFunc = [];
        
        if (turno_id) {
            sqlFunc += ` AND f.turno_id = ?`;
            paramsFunc.push(turno_id);
        }

        const todosFunc = db.prepare(sqlFunc).all(...paramsFunc);

        // Filtrar funcionários baseado no dia da semana
        const funcionarios = todosFunc.filter(func => {
            // Se trabalha finais de semana, sempre mostrar
            if (func.trabalha_fds === 1) return true;

            // Se não tem turno definido ou dias_semana, não mostrar
            if (!func.dias_semana) return false;

            try {
                const diasArray = JSON.parse(func.dias_semana);
                // Verificar se o dia atual está nos dias de trabalho do turno
                return Array.isArray(diasArray) && diasArray.includes(diaSemana);
            } catch (e) {
                console.error('Erro ao parsear dias_semana:', e);
                return false;
            }
        });

        // Buscar presenças
        const presencas = db.prepare(`
            SELECT * FROM presencas 
            WHERE data = ?
        `).all(data);

        const result = funcionarios.map(func => {
            const presenca = presencas.find(p => p.funcionario_id === func.id);
            return {
                id: func.id,
                nome: func.nome,
                foto: func.foto,
                turno_id: func.turno_id,
                presenca: presenca || null
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /registrar
router.post('/registrar', (req, res) => {
    try {
        const { funcionario_id, data, horario, tipo, observacao, turno_id } = req.body;
        // tipo: 'entrada' ou 'saida'

        let presenca = db.prepare('SELECT * FROM presencas WHERE funcionario_id = ? AND data = ?').get(funcionario_id, data);

        if (!presenca) {
            // Create
            if (tipo === 'entrada') {
                const stmt = db.prepare(`
                    INSERT INTO presencas (funcionario_id, data, entrada_registrada, status, observacao, turno_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                stmt.run(funcionario_id, data, horario, 'presente', observacao || '', turno_id);
            } else {
                // Creating on exit (forgot entry?)
                const stmt = db.prepare(`
                    INSERT INTO presencas (funcionario_id, data, saida_registrada, status, observacao, turno_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                stmt.run(funcionario_id, data, horario, 'presente', observacao || '', turno_id);
            }
        } else {
            // Update
            if (tipo === 'entrada') {
                db.prepare(`UPDATE presencas SET entrada_registrada = ?, observacao = COALESCE(?, observacao) WHERE id = ?`)
                  .run(horario, observacao, presenca.id);
            } else {
                 db.prepare(`UPDATE presencas SET saida_registrada = ?, observacao = COALESCE(?, observacao) WHERE id = ?`)
                  .run(horario, observacao, presenca.id);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
