const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== SUBSÍDIOS ====================

// Listar todos os subsídios
router.get('/', (req, res) => {
  try {
    const subsidios = db.prepare(`
      SELECT * FROM subsidios ORDER BY tipo_subsidio, nome
    `).all();

    res.json({
      success: true,
      total: subsidios.length,
      data: subsidios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar subsídios',
      error: error.message
    });
  }
});

// Criar novo subsídio
router.post('/', (req, res) => {
  try {
    const {
      nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao_empresa,
      percentual, limite_isencao_fiscal, meses_pagamento, parcelas,
      incide_inss, incide_irt, aplicar_a, categoria_aplicavel
    } = req.body;

    // Validações
    if (!nome || !tipo_calculo || !tipo_subsidio) {
      return res.status(400).json({
        success: false,
        message: 'Nome, tipo_calculo e tipo_subsidio são obrigatórios'
      });
    }

    if (!['fixo', 'percentual', 'por_categoria'].includes(tipo_calculo)) {
      return res.status(400).json({
        success: false,
        message: 'tipo_calculo deve ser: fixo, percentual ou por_categoria'
      });
    }

    if (!['regular', 'especial', 'anual', 'ocasional'].includes(tipo_subsidio)) {
      return res.status(400).json({
        success: false,
        message: 'tipo_subsidio deve ser: regular, especial, anual ou ocasional'
      });
    }

    const result = db.prepare(`
      INSERT INTO subsidios (
        nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao_empresa,
        percentual, limite_isencao_fiscal, meses_pagamento, parcelas,
        incide_inss, incide_irt, aplicar_a, categoria_aplicavel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome, descricao || '', tipo_calculo, tipo_subsidio,
      valor_padrao_empresa || 0, percentual || 0, limite_isencao_fiscal || 0,
      meses_pagamento || '1,2,3,4,5,6,7,8,9,10,11,12', parcelas || 1,
      incide_inss ? 1 : 0, incide_irt ? 1 : 0, aplicar_a || 'todos',
      categoria_aplicavel || null
    );

    res.status(201).json({
      success: true,
      message: 'Subsídio criado com sucesso!',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar subsídio',
      error: error.message
    });
  }
});

// Atualizar subsídio
router.put('/:id', (req, res) => {
  try {
    const {
      nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao_empresa,
      percentual, limite_isencao_fiscal, meses_pagamento, parcelas,
      incide_inss, incide_irt, aplicar_a, categoria_aplicavel, ativo
    } = req.body;

    db.prepare(`
      UPDATE subsidios SET
        nome = ?, descricao = ?, tipo_calculo = ?, tipo_subsidio = ?,
        valor_padrao_empresa = ?, percentual = ?, limite_isencao_fiscal = ?,
        meses_pagamento = ?, parcelas = ?, incide_inss = ?, incide_irt = ?,
        aplicar_a = ?, categoria_aplicavel = ?, ativo = ?,
        atualizado_em = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao_empresa,
      percentual, limite_isencao_fiscal, meses_pagamento, parcelas,
      incide_inss ? 1 : 0, incide_irt ? 1 : 0, aplicar_a, categoria_aplicavel,
      ativo !== undefined ? (ativo ? 1 : 0) : 1, req.params.id
    );

    res.json({
      success: true,
      message: 'Subsídio atualizado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar subsídio',
      error: error.message
    });
  }
});

// Deletar subsídio
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM subsidios WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Subsídio deletado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar subsídio',
      error: error.message
    });
  }
});

// ==================== ATRIBUIÇÃO DE SUBSÍDIOS ====================

// Listar subsídios atribuídos a um funcionário
router.get('/funcionario/:funcionario_id', (req, res) => {
  try {
    const subsidios = db.prepare(`
      SELECT s.*, fs.valor_especifico, fs.ativo as atribuido
      FROM subsidios s
      JOIN funcionarios_subsidios fs ON s.id = fs.subsidio_id
      WHERE fs.funcionario_id = ?
    `).all(req.params.funcionario_id);

    res.json({
      success: true,
      total: subsidios.length,
      data: subsidios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar subsídios do funcionário',
      error: error.message
    });
  }
});

// Atribuir subsídio a funcionário
router.post('/atribuir', (req, res) => {
  try {
    const { funcionario_id, subsidio_id, valor_especifico } = req.body;

    console.log('📥 Atribuir subsídio:', { funcionario_id, subsidio_id, valor_especifico, tipo: typeof valor_especifico });

    if (!funcionario_id || !subsidio_id) {
      return res.status(400).json({
        success: false,
        message: 'funcionario_id e subsidio_id são obrigatórios'
      });
    }

    // Converter valor_especifico para número ou null
    const valorFinal = valor_especifico !== null && valor_especifico !== undefined && valor_especifico !== '' 
      ? parseFloat(valor_especifico) 
      : null;
    
    console.log('💾 Valor a salvar:', valorFinal);

    // Verificar se já existe
    const existe = db.prepare(`
      SELECT id FROM funcionarios_subsidios 
      WHERE funcionario_id = ? AND subsidio_id = ?
    `).get(funcionario_id, subsidio_id);

    if (existe) {
      // Atualizar
      db.prepare(`
        UPDATE funcionarios_subsidios 
        SET valor_especifico = ?, ativo = 1
        WHERE funcionario_id = ? AND subsidio_id = ?
      `).run(valorFinal, funcionario_id, subsidio_id);
      console.log('✅ Atualizado');
    } else {
      // Inserir
      db.prepare(`
        INSERT INTO funcionarios_subsidios (funcionario_id, subsidio_id, valor_especifico)
        VALUES (?, ?, ?)
      `).run(funcionario_id, subsidio_id, valorFinal);
      console.log('✅ Inserido');
    }

    // Verificar o que foi salvo
    const salvo = db.prepare(`
      SELECT * FROM funcionarios_subsidios 
      WHERE funcionario_id = ? AND subsidio_id = ?
    `).get(funcionario_id, subsidio_id);
    console.log('📊 Registro salvo:', salvo);

    res.json({
      success: true,
      message: 'Subsídio atribuído com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atribuir:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atribuir subsídio',
      error: error.message
    });
  }
});

// Remover atribuição de subsídio
router.delete('/atribuir/:funcionario_id/:subsidio_id', (req, res) => {
  try {
    db.prepare(`
      DELETE FROM funcionarios_subsidios 
      WHERE funcionario_id = ? AND subsidio_id = ?
    `).run(req.params.funcionario_id, req.params.subsidio_id);

    res.json({
      success: true,
      message: 'Atribuição de subsídio removida com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao remover atribuição de subsídio',
      error: error.message
    });
  }
});

// Listar funcionários que têm um determinado subsídio atribuído
router.get('/atribuicoes/:subsidio_id', (req, res) => {
  try {
    // Primeiro, verificar se o subsídio é "aplicar_a = todos"
    const subsidio = db.prepare('SELECT aplicar_a FROM subsidios WHERE id = ?').get(req.params.subsidio_id);
    
    if (subsidio && subsidio.aplicar_a === 'todos') {
      // Se for para todos, retornar a contagem total de funcionários ativos
      const totalFuncionarios = db.prepare('SELECT COUNT(*) as total FROM funcionarios WHERE ativo = 1').get();
      const funcionarios = db.prepare(`
        SELECT id as funcionario_id, nome, salario_base, NULL as valor_especifico, NULL as atribuido_em, 1 as ativo
        FROM funcionarios 
        WHERE ativo = 1
        ORDER BY nome
      `).all();
      
      return res.json({
        success: true,
        total: totalFuncionarios.total,
        aplicar_a: 'todos',
        data: funcionarios
      });
    }
    
    // Caso contrário, retornar apenas as atribuições individuais
    const rows = db.prepare(`
      SELECT f.id as funcionario_id, f.nome, f.salario_base, fs.valor_especifico, fs.atribuido_em, fs.ativo
      FROM funcionarios_subsidios fs
      JOIN funcionarios f ON fs.funcionario_id = f.id
      WHERE fs.subsidio_id = ?
      ORDER BY f.nome
    `).all(req.params.subsidio_id);

    res.json({
      success: true,
      total: rows.length,
      aplicar_a: subsidio?.aplicar_a || 'individual',
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar atribuições do subsídio',
      error: error.message
    });
  }
});

// Atribuir subsídio a todos funcionários de uma categoria
router.post('/atribuir-categoria', (req, res) => {
  try {
    const { categoria_id, subsidio_id, valor_especifico } = req.body;

    if (!categoria_id || !subsidio_id) {
      return res.status(400).json({
        success: false,
        message: 'categoria_id e subsidio_id são obrigatórios'
      });
    }

    // Buscar funcionários da categoria
    const funcionarios = db.prepare(`
      SELECT id FROM funcionarios WHERE categoria_id = ? AND ativo = 1
    `).all(categoria_id);

    if (funcionarios.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum funcionário encontrado nesta categoria',
        atribuidos: 0
      });
    }

    let atribuidos = 0;
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO funcionarios_subsidios (funcionario_id, subsidio_id, valor_especifico, ativo)
      VALUES (?, ?, ?, 1)
    `);

    funcionarios.forEach(f => {
      insertStmt.run(f.id, subsidio_id, valor_especifico || null);
      atribuidos++;
    });

    res.json({
      success: true,
      message: `Subsídio atribuído a ${atribuidos} funcionário(s)!`,
      atribuidos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atribuir subsídio por categoria',
      error: error.message
    });
  }
});

// Buscar subsídio por ID (depois das rotas específicas)
router.get('/:id', (req, res) => {
  try {
    const subsidio = db.prepare('SELECT * FROM subsidios WHERE id = ?').get(req.params.id);

    if (!subsidio) {
      return res.status(404).json({
        success: false,
        message: 'Subsídio não encontrado'
      });
    }

    res.json({
      success: true,
      data: subsidio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar subsídio',
      error: error.message
    });
  }
});

module.exports = router;
