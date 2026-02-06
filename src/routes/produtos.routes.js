const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

const ALLOWED_UPDATE_FIELDS = new Set([
  'nome',
  'categoria',
  'categoria_id',
  'tipo',
  'descricao',
  'unidade_medida',
  'custo_unitario',
  'preco_venda',
  'estoque',
  'estoque_minimo',
  'ativo',
  'codigo',
  'sujeito_iva',
  'taxa_iva'
]);

// Auth temporariamente removida para testes
// router.use(authMiddleware);

// Listar todos os produtos - todos podem ver
router.get('/', (req, res) => {
  try {
    const { categoria, ativo } = req.query;
    
    let sql = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    
    // Por padrão, mostrar apenas produtos ativos
    if (ativo !== undefined) {
      sql += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    } else {
      sql += ' AND ativo = 1';
    }
    
    if (categoria) {
      sql += ' AND categoria = ?';
      params.push(categoria);
    }
    
    sql += ' ORDER BY nome';
    
    const produtos = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      total: produtos.length,
      data: produtos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar produtos',
      error: error.message
    });
  }
});

// Buscar produto por ID
router.get('/:id', (req, res) => {
  try {
    const produto = db.prepare(`
      SELECT p.*, 
             cp.nome as categoria_nome, 
             cp.taxa_iva_padrao, 
             cp.sujeito_iva,
             cp.tipo as categoria_tipo
      FROM produtos p
      LEFT JOIN categorias_produtos cp ON p.categoria_id = cp.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: produto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produto',
      error: error.message
    });
  }
});

// Criar produto - auth temporariamente removida
router.post('/', (req, res) => {
  try {
    const {
      nome,
      categoria,
      categoria_id,
      tipo,
      unidade_medida,
      custo_unitario,
      preco_venda,
      estoque,
      estoque_minimo
    } = req.body;
    
    // Validação
    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome do produto é obrigatório'
      });
    }

    // Se categoria não veio mas categoria_id veio, tentar buscar nome da categoria?
    // Ou permitir que categoria seja string vazia se categoria_id estiver presente?
    // Para simplificar, vamos aceitar categoria como opcional se categoria_id existir
    
    // Verificar duplicado
    const duplicate = db.prepare(`SELECT id FROM produtos WHERE LOWER(nome) = LOWER(?)`).get(nome);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Já existe um produto com este nome'
      });
    }
    
    // Validação robusta de Categoria
    let final_categoria_id = categoria_id;
    
    // Tentar recuperar ID pelo nome se não informado ou verificar se existe
    if (final_categoria_id) {
        const catExists = db.prepare('SELECT id FROM categorias_produtos WHERE id = ?').get(final_categoria_id);
        if (!catExists) {
            console.warn(`Categoria ID ${final_categoria_id} não encontrado. Tentando buscar por nome '${categoria}'...`);
            const catByName = db.prepare('SELECT id FROM categorias_produtos WHERE nome = ?').get(categoria);
            if (catByName) {
                final_categoria_id = catByName.id;
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: `Categoria selecionada inválida (ID: ${final_categoria_id}) e nome não encontrado.` 
                });
            }
        }
    } else if (categoria) {
        // Se não tem ID mas tem nome (ex: vindo de importação simples), tenta achar ID
        const catByName = db.prepare('SELECT id FROM categorias_produtos WHERE nome = ?').get(categoria);
        if (catByName) {
             final_categoria_id = catByName.id;
        }
    }

    const result = db.prepare(`
      INSERT INTO produtos 
      (nome, categoria, categoria_id, tipo, unidade_medida, custo_unitario, preco_venda, estoque, estoque_minimo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome,
      categoria || '',
      final_categoria_id || null,
      tipo || 'produto',
      unidade_medida || 'un',
      custo_unitario || 0,
      preco_venda || 0,
      estoque || 0,
      estoque_minimo || 0
    );
    
    res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso!',
      data: {
        id: result.lastInsertRowid,
        ...req.body
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar produto: ' + error.message,
      error: error.message
    });
  }
});

// Atualizar produto - auth temporariamente removida
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar se produto existe
    const produto = db.prepare('SELECT id FROM produtos WHERE id = ?').get(id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    // Construir query dinâmica apenas com colunas permitidas
    const fields = Object.keys(updates).filter(field => ALLOWED_UPDATE_FIELDS.has(field));
    const values = fields.map(field => updates[field]);
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido para atualizar',
        allowed_fields: Array.from(ALLOWED_UPDATE_FIELDS)
      });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE produtos SET ${setClause}, atualizado_em = datetime('now', 'localtime') WHERE id = ?`;
    
    db.prepare(sql).run(...values, id);
    
    res.json({
      success: true,
      message: 'Produto atualizado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar produto',
      error: error.message
    });
  }
});

// Deletar produto (soft delete) - auth temporariamente removida
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const produto = db.prepare('SELECT id FROM produtos WHERE id = ?').get(id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    db.prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: 'Produto deletado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar produto',
      error: error.message
    });
  }
});

// Atualizar estoque
router.patch('/:id/estoque', (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade, operacao } = req.body; // operacao: 'adicionar' ou 'remover'
    
    if (!quantidade || !operacao) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade e operação são obrigatórios'
      });
    }
    
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    let novoEstoque = produto.estoque;
    
    if (operacao === 'adicionar') {
      novoEstoque += parseFloat(quantidade);
    } else if (operacao === 'remover') {
      novoEstoque -= parseFloat(quantidade);
      if (novoEstoque < 0) {
        return res.status(400).json({
          success: false,
          message: 'Estoque insuficiente'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Operação inválida. Use "adicionar" ou "remover"'
      });
    }
    
    db.prepare('UPDATE produtos SET estoque = ? WHERE id = ?').run(novoEstoque, id);
    
    res.json({
      success: true,
      message: 'Estoque atualizado com sucesso!',
      data: {
        produto: produto.nome,
        estoque_anterior: produto.estoque,
        novo_estoque: novoEstoque
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estoque',
      error: error.message
    });
  }
});

module.exports = router;
