const express = require('express');
const router = express.Router();
const CategoriasDespesasService = require('../services/categorias-despesas.service');
const auth = require('../middlewares/auth.middleware');

// Listar todas as categorias de despesas
router.get('/', async (req, res) => {
    try {
        const categorias = CategoriasDespesasService.getAll();
        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Erro ao listar categorias de despesas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Buscar categoria por ID
router.get('/:id', async (req, res) => {
    try {
        const categoria = CategoriasDespesasService.getById(req.params.id);
        
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'Categoria de despesa não encontrada'
            });
        }
        
        res.json({
            success: true,
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao buscar categoria de despesa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Criar nova categoria de despesa
router.post('/', async (req, res) => {
    try {
        // Validação temporariamente removida para testes
        // TODO: Adicionar sistema de autenticação completo

        // Validar dados obrigatórios
        if (!req.body.nome) {
            return res.status(400).json({
                success: false,
                message: 'Nome da categoria é obrigatório'
            });
        }

        const categoria = CategoriasDespesasService.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Categoria de despesa criada com sucesso',
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao criar categoria de despesa:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma categoria de despesa com este nome'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Atualizar categoria de despesa
router.put('/:id', async (req, res) => {
    try {
        // Auth temporariamente removida para testes

        // Validar dados obrigatórios
        if (!req.body.nome) {
            return res.status(400).json({
                success: false,
                message: 'Nome da categoria é obrigatório'
            });
        }

        const categoria = CategoriasDespesasService.update(req.params.id, req.body);
        
        res.json({
            success: true,
            message: 'Categoria de despesa atualizada com sucesso',
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao atualizar categoria de despesa:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma categoria de despesa com este nome'
            });
        }
        
        if (error.message.includes('não encontrada')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Deletar categoria de despesa (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        // Auth temporariamente removida para testes

        const result = CategoriasDespesasService.delete(req.params.id);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Erro ao deletar categoria de despesa:', error);
        
        if (error.message.includes('não encontrada')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('está sendo usada')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Buscar categorias por dedutibilidade no IRT
router.get('/irt/:dedutivel', auth, async (req, res) => {
    try {
        const { dedutivel } = req.params;
        
        if (!['true', 'false', '1', '0'].includes(dedutivel.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetro dedutível deve ser true/false ou 1/0'
            });
        }
        
        const isDedu = ['true', '1'].includes(dedutivel.toLowerCase());
        const categorias = CategoriasDespesasService.getByDedutivelIrt(isDedu);
        
        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Erro ao buscar categorias por dedutibilidade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Buscar categoria por código fiscal
router.get('/codigo/:codigo', auth, async (req, res) => {
    try {
        const categoria = CategoriasDespesasService.getByCodigoFiscal(req.params.codigo);
        
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'Categoria com este código fiscal não encontrada'
            });
        }
        
        res.json({
            success: true,
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao buscar categoria por código fiscal:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Obter estatísticas das categorias de despesas
router.get('/admin/stats', auth, async (req, res) => {
    try {
        // Validar permissão (só admin e gerente)
        if (req.user.tipo !== 'admin' && req.user.tipo !== 'gerente') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        
        const stats = CategoriasDespesasService.getStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Relatório completo de categorias (para admin)
router.get('/admin/relatorio', auth, async (req, res) => {
    try {
        // Validar permissão (só admin e gerente)
        if (req.user.tipo !== 'admin' && req.user.tipo !== 'gerente') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        
        const categorias = CategoriasDespesasService.getAllForReport();
        
        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

module.exports = router;