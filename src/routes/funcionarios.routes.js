const express = require('express');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const router = express.Router();
const db = require('../config/database');
const JWT_SECRET = getJwtSecret();

const SETORES_VALIDOS = new Set(['CAIXA', 'RH', 'CEO', 'GERENTE']);

const ensureSetorHistoryTable = (() => {
  let ensured = false;
  return () => {
    if (ensured) return;
    db.exec(`
      CREATE TABLE IF NOT EXISTS funcionarios_setor_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        funcionario_id INTEGER NOT NULL,
        setor_anterior TEXT,
        setor_novo TEXT,
        alterado_por TEXT,
        alterado_em TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
      )
    `);
    ensured = true;
  };
})();

ensureSetorHistoryTable();

function getUserFromAuthHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) return null;
  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    return {
      id: decoded.id,
      nome: decoded.nome,
      role: decoded.role || decoded.funcao || 'funcionario'
    };
  } catch (error) {
    return null;
  }
}

function enforceSetorPermission(req, res) {
  const user = getUserFromAuthHeader(req);
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Token não fornecido ou inválido'
    });
    return null;
  }

  const role = String(user.role || '').toLowerCase();
  const allowed = new Set(['admin', 'administrador', 'gerente', 'gerencia', 'ceo', 'diretor', 'diretora']);
  if (!allowed.has(role)) {
    res.status(403).json({
      success: false,
      message: 'Apenas admin, gerente ou direcao podem distribuir setores'
    });
    return null;
  }

  return user;
}

function normalizeSetor(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().toUpperCase();
}

function validarSetor(value) {
  if (!value) return true;
  return SETORES_VALIDOS.has(value);
}

function registrarHistoricoSetor(funcionarioId, setorAnterior, setorNovo, user) {
  if (setorAnterior === setorNovo) return;
  db.prepare(`
    INSERT INTO funcionarios_setor_historico (funcionario_id, setor_anterior, setor_novo, alterado_por)
    VALUES (?, ?, ?, ?)
  `).run(
    funcionarioId,
    setorAnterior || null,
    setorNovo || null,
    user?.nome || user?.id || null
  );
}

// Garante que a tabela possua colunas opcionais usadas pela UI mais recente
const ensureFuncionarioColumns = (() => {
  let ensured = false;
  return () => {
    if (ensured) return;
    const existing = db.prepare('PRAGMA table_info(funcionarios)').all().map(col => col.name);
    const optionalColumns = [
      { name: 'nif', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'telefone', type: 'TEXT' },
      { name: 'data_admissao', type: 'TEXT' },
      { name: 'turno_id', type: 'INTEGER' },
      { name: 'foto', type: 'TEXT' },
      { name: 'documento', type: 'TEXT' },
      { name: 'trabalha_fds', type: 'INTEGER DEFAULT 0' },
      { name: 'setor', type: 'TEXT' }
    ];

    optionalColumns.forEach(column => {
      if (!existing.includes(column.name)) {
        db.prepare(`ALTER TABLE funcionarios ADD COLUMN ${column.name} ${column.type}`).run();
      }
    });

    if (!existing.includes('categoria_id')) {
      db.prepare('ALTER TABLE funcionarios ADD COLUMN categoria_id INTEGER').run();
    }

    ensured = true;
  };
})();

ensureFuncionarioColumns();

function resolveCategoriaNome(categoriaId) {
  if (!categoriaId) {
    return 'Sem categoria';
  }

  try {
    const categoria = db.prepare('SELECT nome FROM categorias_funcionarios WHERE id = ?').get(categoriaId);
    return categoria ? categoria.nome : 'Sem categoria';
  } catch (error) {
    console.warn('Aviso: Não foi possível resolver categoria_id:', categoriaId, error.message);
    return 'Sem categoria';
  }
}

// ==================== CRUD FUNCIONÁRIOS ====================

// Listar todos os funcionários
router.get('/', (req, res) => {
  try {
    const funcionarios = db.prepare(`
      SELECT 
        f.*,
        c.nome as categoria_nome
      FROM funcionarios f
      LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
      ORDER BY f.nome
    `).all();

    res.json({
      success: true,
      total: funcionarios.length,
      data: funcionarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar funcionários',
      error: error.message
    });
  }
});

// Buscar funcionário por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const funcionario = db.prepare(`
      SELECT 
        f.*,
        c.nome as categoria_nome
      FROM funcionarios f
      LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
      WHERE f.id = ?
    `).get(id);

    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    res.json({
      success: true,
      data: funcionario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar funcionário',
      error: error.message
    });
  }
});

// Criar novo funcionário
router.post('/', (req, res) => {
  try {
    const {
      nome,
      salario_base,
      categoria_id,
      ativo,
      nif,
      email,
      telefone,
      data_admissao,
      turno_id,
      foto,
      documento,
      trabalha_fds,
      setor
    } = req.body;

    if (!nome || !salario_base) {
      return res.status(400).json({
        success: false,
        message: 'Nome e salário base são obrigatórios'
      });
    }

    const setorNormalizado = normalizeSetor(setor);
    if (setorNormalizado !== null) {
      const user = enforceSetorPermission(req, res);
      if (!user) return;
      if (!validarSetor(setorNormalizado)) {
        return res.status(400).json({
          success: false,
          message: 'Setor inválido'
        });
      }
    }

    const categoriaNome = resolveCategoriaNome(categoria_id);

    const result = db.prepare(`
      INSERT INTO funcionarios (nome, categoria, salario_base, categoria_id, ativo, data_admissao, nif, email, telefone, turno_id, foto, documento, trabalha_fds, setor)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now', 'localtime')), ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome,
      categoriaNome,
      salario_base,
      categoria_id || null,
      ativo !== undefined ? ativo : 1,
      data_admissao || null,
      nif || null,
      email || null,
      telefone || null,
      turno_id || 1,
      foto || null,
      documento || null,
      trabalha_fds ? 1 : 0,
      setorNormalizado
    );

    if (setorNormalizado !== null) {
      const user = getUserFromAuthHeader(req);
      registrarHistoricoSetor(result.lastInsertRowid, null, setorNormalizado, user);
    }

    res.status(201).json({
      success: true,
      message: 'Funcionário criado com sucesso',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar funcionário',
      error: error.message
    });
  }
});

// Atualizar funcionário
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar se funcionário existe
    const existe = db.prepare('SELECT id, setor FROM funcionarios WHERE id = ?').get(id);
    if (!existe) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    let setorNormalizado;
    if (updates.setor !== undefined) {
      const user = enforceSetorPermission(req, res);
      if (!user) return;
      setorNormalizado = normalizeSetor(updates.setor);
      if (!validarSetor(setorNormalizado)) {
        return res.status(400).json({
          success: false,
          message: 'Setor inválido'
        });
      }
    }

    // Construir query dinamicamente baseado nos campos enviados
    const campos = [];
    const valores = [];

    if (updates.nome !== undefined) {
      campos.push('nome = ?');
      valores.push(updates.nome);
    }
    if (updates.salario_base !== undefined) {
      campos.push('salario_base = ?');
      valores.push(updates.salario_base);
    }
    if (updates.categoria_id !== undefined) {
      const categoriaNome = resolveCategoriaNome(updates.categoria_id);
      campos.push('categoria_id = ?');
      valores.push(updates.categoria_id || null);
      campos.push('categoria = ?');
      valores.push(categoriaNome);
    }
    if (updates.ativo !== undefined) {
      campos.push('ativo = ?');
      valores.push(updates.ativo);
    }
    if (updates.turno_id !== undefined) {
        campos.push('turno_id = ?');
        valores.push(updates.turno_id);
    }
    if (updates.nif !== undefined) {
       campos.push('nif = ?');
       valores.push(updates.nif);
    }
    if (updates.email !== undefined) {
       campos.push('email = ?');
       valores.push(updates.email);
    }
     if (updates.telefone !== undefined) {
       campos.push('telefone = ?');
       valores.push(updates.telefone);
    }
    if (updates.data_admissao !== undefined) {
       campos.push('data_admissao = ?');
       valores.push(updates.data_admissao);
    }
    if (updates.foto !== undefined) {
       campos.push('foto = ?');
       valores.push(updates.foto);
    }
    if (updates.documento !== undefined) {
       campos.push('documento = ?');
       valores.push(updates.documento);
    }
    if (updates.trabalha_fds !== undefined) {
       campos.push('trabalha_fds = ?');
       valores.push(updates.trabalha_fds ? 1 : 0);
    }
    if (updates.setor !== undefined) {
      campos.push('setor = ?');
      valores.push(setorNormalizado);
    }
    if (updates.data_admissao !== undefined) {
      campos.push('data_admissao = ?');
      valores.push(updates.data_admissao);
    }
    if (updates.nif !== undefined) {
      campos.push('nif = ?');
      valores.push(updates.nif || null);
    }
    if (updates.email !== undefined) {
      campos.push('email = ?');
      valores.push(updates.email || null);
    }
    if (updates.telefone !== undefined) {
      campos.push('telefone = ?');
      valores.push(updates.telefone || null);
    }
    if (updates.turno_id !== undefined) {
      campos.push('turno_id = ?');
      valores.push(updates.turno_id || (updates.turno_id === 0 ? null : 1)); // Default para 1 se inválido
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }

    valores.push(id);

    db.prepare(`
      UPDATE funcionarios 
      SET ${campos.join(', ')}
      WHERE id = ?
    `).run(...valores);

    if (updates.setor !== undefined && existe.setor !== setorNormalizado) {
      const user = getUserFromAuthHeader(req);
      registrarHistoricoSetor(id, existe.setor, setorNormalizado, user);
    }

    res.json({
      success: true,
      message: 'Funcionário atualizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar funcionário',
      error: error.message
    });
  }
});

// Deletar funcionário (soft delete - desativar)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se tem folhas processadas
    const temFolhas = db.prepare('SELECT COUNT(*) as total FROM folhas_pagamento WHERE funcionario_id = ?').get(id);
    
    if (temFolhas.total > 0) {
      // Soft delete
      db.prepare('UPDATE funcionarios SET ativo = 0 WHERE id = ?').run(id);
      
      return res.json({
        success: true,
        message: 'Funcionário desativado (possui folhas processadas)'
      });
    }

    // Se não tem folhas, pode deletar permanentemente
    db.prepare('DELETE FROM funcionarios WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Funcionário deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar funcionário',
      error: error.message
    });
  }
});

// Atribuir categoria a funcionário
router.put('/:id/categoria', (req, res) => {
  try {
    const { id } = req.params;
    const { categoria_id } = req.body;

    // Verificar se funcionário existe
    const funcionario = db.prepare('SELECT id FROM funcionarios WHERE id = ?').get(id);
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    // Verificar se categoria existe (se fornecida)
    if (categoria_id) {
      const categoria = db.prepare('SELECT id FROM categorias_funcionarios WHERE id = ?').get(categoria_id);
      if (!categoria) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }
    }

    db.prepare('UPDATE funcionarios SET categoria_id = ? WHERE id = ?').run(categoria_id || null, id);

    res.json({
      success: true,
      message: 'Categoria atualizada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atribuir categoria',
      error: error.message
    });
  }
});

// Estatísticas de funcionários
router.get('/stats/resumo', (req, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as total FROM funcionarios').get().total,
      ativos: db.prepare('SELECT COUNT(*) as total FROM funcionarios WHERE ativo = 1').get().total,
      inativos: db.prepare('SELECT COUNT(*) as total FROM funcionarios WHERE ativo = 0').get().total,
      sem_categoria: db.prepare('SELECT COUNT(*) as total FROM funcionarios WHERE categoria_id IS NULL AND ativo = 1').get().total,
      folha_salarial_total: db.prepare('SELECT SUM(salario_base) as total FROM funcionarios WHERE ativo = 1').get().total || 0,
      salario_medio: db.prepare('SELECT AVG(salario_base) as media FROM funcionarios WHERE ativo = 1').get().media || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar estatísticas',
      error: error.message
    });
  }
});

module.exports = router;
