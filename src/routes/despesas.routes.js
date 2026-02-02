const express = require('express');
const router = express.Router();
const DespesasController = require('../controllers/despesas.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de despesas - Apenas admin e gerente podem visualizar
router.get('/', authorize('admin', 'gerente'), DespesasController.listar);
router.get('/resumo', authorize('admin', 'gerente'), DespesasController.resumo);
router.get('/categorias', authorize('admin', 'gerente'), DespesasController.categorias);
router.get('/:id', authorize('admin', 'gerente'), DespesasController.buscarPorId);

// Apenas admin pode criar, editar e deletar
router.post('/', authorize('admin'), DespesasController.criar);
router.put('/:id', authorize('admin'), DespesasController.atualizar);
router.patch('/:id/pagar', authorize('admin'), DespesasController.marcarComoPaga);
router.delete('/:id', authorize('admin'), DespesasController.deletar);

module.exports = router;
