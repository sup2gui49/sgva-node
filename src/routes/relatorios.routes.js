const express = require('express');
const router = express.Router();
const RelatoriosController = require('../controllers/relatorios.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de geração de relatórios - admin e gerente
router.get('/vendas', authorize('admin', 'gerente'), RelatoriosController.relatorioVendas);
router.get('/dre', authorize('admin', 'gerente'), RelatoriosController.relatorioDRE);
router.get('/despesas', authorize('admin', 'gerente'), RelatoriosController.relatorioDespesas);
router.get('/folha', authorize('admin', 'gerente'), RelatoriosController.relatorioFolha);

// Rota de download
router.get('/download/:filename', RelatoriosController.download);

module.exports = router;
