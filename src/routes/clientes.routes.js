const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Listar todos os clientes
router.get('/', (req, res) => {
  try {
    const clientes = db.prepare('SELECT * FROM clientes ORDER BY nome').all();
    
    res.json({
      success: true,
      total: clientes.length,
      data: clientes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar clientes',
      error: error.message
    });
  }
});

// Buscar cliente por ID
router.get('/:id', (req, res) => {
  try {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar cliente',
      error: error.message
    });
  }
});

// Criar novo cliente
router.post('/', (req, res) => {
  try {
    const { nome, telefone, email, endereco } = req.body;
    
    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }
    
    // Verificar se cliente já existe pelo nome
    const existente = db.prepare('SELECT id FROM clientes WHERE LOWER(nome) = LOWER(?)').get(nome);
    if (existente) {
      return res.json({
        success: true,
        message: 'Cliente já existe',
        data: { id: existente.id }
      });
    }
    
    // Criar cliente
    const result = db.prepare(`
      INSERT INTO clientes (nome, telefone, email, endereco)
      VALUES (?, ?, ?, ?)
    `).run(nome, telefone || null, email || null, endereco || null);
    
    res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data: {
        id: result.lastInsertRowid,
        nome
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente',
      error: error.message
    });
  }
});

// Atualizar cliente
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, endereco } = req.body;
    
    const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    db.prepare(`
      UPDATE clientes 
      SET nome = ?, telefone = ?, email = ?, endereco = ?
      WHERE id = ?
    `).run(nome, telefone || null, email || null, endereco || null, id);
    
    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar cliente',
      error: error.message
    });
  }
});

// Deletar cliente
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: 'Cliente deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar cliente',
      error: error.message
    });
  }
});

module.exports = router;
