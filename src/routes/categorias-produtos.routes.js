const express = require('express');
const router = express.Router();
const CategoriasProdutosService = require('../services/categorias-produtos.service');
const auth = require('../middlewares/auth.middleware');

// Listar todas as categorias de produtos
router.get('/', async (req, res) => {
    try {
        const categorias = CategoriasProdutosService.getAll();
        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Erro ao listar categorias de produtos:', error);
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
        const categoria = CategoriasProdutosService.getById(req.params.id);
        
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'Categoria não encontrada'
            });
        }
        
        res.json({
            success: true,
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao buscar categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Criar nova categoria
router.post('/', async (req, res) => {
    try {
        // Validar dados obrigatórios
        if (!req.body.nome) {
            return res.status(400).json({
                success: false,
                message: 'Nome da categoria é obrigatório'
            });
        }

        // Validar tipo (produto ou servico)
        if (req.body.tipo && !['produto', 'servico'].includes(req.body.tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo deve ser "produto" ou "servico"'
            });
        }

        // Validar taxa de IVA
        if (req.body.taxa_iva_padrao !== undefined) {
            const taxa = parseFloat(req.body.taxa_iva_padrao);
            if (isNaN(taxa) || taxa < 0 || taxa > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Taxa de IVA deve ser um número entre 0 e 100'
                });
            }
        }

        const categoria = CategoriasProdutosService.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Categoria criada com sucesso',
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma categoria com este nome'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Atualizar categoria
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

        // Validar tipo (produto ou servico)
        if (req.body.tipo && !['produto', 'servico'].includes(req.body.tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo deve ser "produto" ou "servico"'
            });
        }

        // Validar taxa de IVA
        if (req.body.taxa_iva_padrao !== undefined) {
            const taxa = parseFloat(req.body.taxa_iva_padrao);
            if (isNaN(taxa) || taxa < 0 || taxa > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Taxa de IVA deve ser um número entre 0 e 100'
                });
            }
        }

        const categoria = CategoriasProdutosService.update(req.params.id, req.body);
        
        res.json({
            success: true,
            message: 'Categoria atualizada com sucesso',
            data: categoria
        });
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma categoria com este nome'
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

// Deletar categoria (soft delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Validar permissão (só admin pode deletar)
        // Auth temporariamente removida/opcional
        /*
        if (req.user.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem excluir categorias'
            });
        }
        */

        const result = CategoriasProdutosService.delete(req.params.id);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        
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

// Buscar categorias por tipo
router.get('/tipo/:tipo', auth, async (req, res) => {
    try {
        const { tipo } = req.params;
        
        if (!['produto', 'servico'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo deve ser "produto" ou "servico"'
            });
        }
        
        const categorias = CategoriasProdutosService.getByTipo(tipo);
        
        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Erro ao buscar categorias por tipo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Buscar categorias por taxa de IVA
router.get('/iva/:taxa', auth, async (req, res) => {
    try {
        const taxa = parseFloat(req.params.taxa);
        
        if (isNaN(taxa) || taxa < 0 || taxa > 100) {
            return res.status(400).json({
                success: false,
                message: 'Taxa de IVA deve ser um número válido entre 0 e 100'
            });
        }
        
        const categorias = CategoriasProdutosService.getByTaxaIva(taxa);
        
        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Erro ao buscar categorias por taxa de IVA:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Obter estatísticas das categorias
router.get('/admin/stats', auth, async (req, res) => {
    try {
        // Validar permissão (só admin e gerente)
        if (req.user.tipo !== 'admin' && req.user.tipo !== 'gerente') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        
        const stats = CategoriasProdutosService.getStats();
        
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

module.exports = router;
