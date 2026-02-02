const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini.service');
const authMiddleware = require('../middlewares/auth.middleware');

// Todas as rotas de IA requerem autenticação por segurança
router.use(authMiddleware);

router.post('/chat', async (req, res) => {
    try {
        const { mensagem } = req.body;
        
        if (!mensagem) {
            return res.status(400).json({
                success: false,
                message: 'A mensagem não pode estar vazia.'
            });
        }

        // Recuperar contexto do usuário logado (adicionado pelo middleware auth)
        const usuarioContexto = req.user ? `Nome: ${req.user.nome}, ID: ${req.user.id}` : 'Funcionário não identificado';

        const resposta = await geminiService.perguntarAoGemini(mensagem, usuarioContexto);

        res.json({
            success: true,
            resposta: resposta
        });

    } catch (error) {
        console.error('Erro na rota de chat:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno ao processar a mensagem.'
        });
    }
});

module.exports = router;