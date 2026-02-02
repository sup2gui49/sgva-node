const express = require('express');
const router = express.Router();
const db = require('../config/database');
const folhaService = require('../services/folha-calculo.service');
const {
  getModuleConfig,
  shouldSyncFolhaToVendas
} = require('../config/module-flags');

// ==================== ESTRUTURA AUXILIAR ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS folha_pagamentos_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    valor_pago REAL DEFAULT 0,
    despesa_id INTEGER,
    pago_em TEXT,
    UNIQUE(funcionario_id, mes, ano),
    FOREIGN KEY(funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS formulas_calculo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    formula TEXT NOT NULL,
    descricao TEXT,
    editavel INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS folha_jornada_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    dias_semana TEXT NOT NULL,
    hora_entrada TEXT DEFAULT '08:00',
    hora_saida TEXT DEFAULT '17:00',
    tolerancia_minutos INTEGER DEFAULT 10,
    dias_uteis_padrao INTEGER DEFAULT 22,
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS folha_feriados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo TEXT DEFAULT 'nacional',
    UNIQUE(data)
  );

  CREATE TABLE IF NOT EXISTS folha_presencas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    hora_entrada TEXT,
    hora_saida TEXT,
    observacoes TEXT,
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(funcionario_id, data),
    FOREIGN KEY(funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS folha_faltas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    dias_falta INTEGER NOT NULL DEFAULT 0,
    tipo TEXT NOT NULL DEFAULT 'injustificada',
    dias_uteis INTEGER DEFAULT 22,
    desconto_manual REAL,
    observacoes TEXT,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(funcionario_id, mes, ano),
    FOREIGN KEY(funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
  );
`);

// Inserir fórmulas padrão se não existirem
const formulasPadrao = [
  { codigo: 'salario_bruto', nome: 'Salário Bruto', formula: 'salario_base + total_subsidios', editavel: 0 },
  { codigo: 'base_inss', nome: 'Base INSS', formula: 'salario_bruto - subsidios_isentos_inss', editavel: 0 },
  { codigo: 'inss_empregado', nome: 'INSS Empregado', formula: 'base_inss * taxa_inss_empregado', editavel: 0 },
  { codigo: 'inss_patronal', nome: 'INSS Patronal', formula: 'base_inss * taxa_inss_patronal', editavel: 0 },
  { codigo: 'rendimento_colectavel', nome: 'Rendimento Coletável', formula: 'salario_base + subsidios_tributaveis_irt - inss_empregado', editavel: 0 },
  { codigo: 'salario_liquido', nome: 'Salário Líquido', formula: 'salario_bruto - (inss_empregado + irt)', editavel: 0 }
];

formulasPadrao.forEach(f => {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO formulas_calculo (codigo, nome, formula, editavel) 
      VALUES (?, ?, ?, ?)
    `).run(f.codigo, f.nome, f.formula, f.editavel);
  } catch (e) {
    // Ignora se já existe
  }
});

const DEFAULT_JORNADA = {
  dias_semana: [1, 2, 3, 4, 5],
  hora_entrada: '08:00',
  hora_saida: '17:00',
  tolerancia_minutos: 10,
  dias_uteis_padrao: 22
};

function getJornadaConfig() {
  const row = db.prepare('SELECT * FROM folha_jornada_config WHERE id = 1').get();
  if (!row) {
    return { ...DEFAULT_JORNADA };
  }

  let diasSemana = DEFAULT_JORNADA.dias_semana;
  try {
    const parsed = JSON.parse(row.dias_semana);
    if (Array.isArray(parsed) && parsed.length) {
      diasSemana = parsed.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6);
    }
  } catch (error) {
    diasSemana = DEFAULT_JORNADA.dias_semana;
  }

  return {
    dias_semana: diasSemana,
    hora_entrada: row.hora_entrada || DEFAULT_JORNADA.hora_entrada,
    hora_saida: row.hora_saida || DEFAULT_JORNADA.hora_saida,
    tolerancia_minutos: Number(row.tolerancia_minutos) || DEFAULT_JORNADA.tolerancia_minutos,
    dias_uteis_padrao: Number(row.dias_uteis_padrao) || DEFAULT_JORNADA.dias_uteis_padrao
  };
}

function getFeriadosDoMes(ano, mes) {
  const mesStr = String(mes).padStart(2, '0');
  return db.prepare(`
    SELECT * FROM folha_feriados
    WHERE data LIKE ?
  `).all(`${ano}-${mesStr}-%`);
}

function getDiasNoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

const upsertPagamentoStatusStmt = db.prepare(`
  INSERT INTO folha_pagamentos_status (
    funcionario_id,
    mes,
    ano,
    status,
    valor_pago,
    despesa_id,
    pago_em
  ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  ON CONFLICT(funcionario_id, mes, ano) DO UPDATE SET
    status = excluded.status,
    valor_pago = excluded.valor_pago,
    despesa_id = excluded.despesa_id,
    pago_em = excluded.pago_em
`);

function registrarStatusPagamento(funcionarioId, mes, ano, status, valorPago, despesaId) {
  upsertPagamentoStatusStmt.run(
    funcionarioId,
    mes,
    ano,
    status,
    valorPago,
    despesaId || null
  );
}

// ==================== CATEGORIAS PROFISSIONAIS ====================

// Listar todas as categorias
router.get('/', (req, res) => {
  try {
    const categorias = db.prepare(`
      SELECT * FROM categorias_funcionarios ORDER BY nome
    `).all();

    res.json({
      success: true,
      total: categorias.length,
      data: categorias
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar categorias',
      error: error.message
    });
  }
});

// Criar categoria
router.post('/', (req, res) => {
  try {
    const { nome, descricao, encargos_especificos } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }

    const result = db.prepare(`
      INSERT INTO categorias_funcionarios (nome, descricao, encargos_especificos)
      VALUES (?, ?, ?)
    `).run(nome, descricao || '', encargos_especificos || null);

    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso!',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar categoria',
      error: error.message
    });
  }
});

// Atualizar categoria
router.put('/:id', (req, res) => {
  try {
    const { nome, descricao, encargos_especificos, ativo } = req.body;

    db.prepare(`
      UPDATE categorias_funcionarios SET
        nome = ?, descricao = ?, encargos_especificos = ?, ativo = ?
      WHERE id = ?
    `).run(nome, descricao, encargos_especificos, ativo ? 1 : 0, req.params.id);

    res.json({
      success: true,
      message: 'Categoria atualizada com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar categoria',
      error: error.message
    });
  }
});

// Deletar categoria
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM categorias_funcionarios WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Categoria deletada com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar categoria',
      error: error.message
    });
  }
});

// ==================== IRT (ESCALÕES) ====================

// Listar escalões IRT
router.get('/irt', (req, res) => {
  try {
    const escaloes = folhaService.getEscaloesIRT();

    res.json({
      success: true,
      total: escaloes.length,
      data: escaloes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar escalões IRT',
      error: error.message
    });
  }
});

// ==================== JORNADA, FERIADOS E PRESENÇAS ====================

// Obter configuração de jornada
router.get('/jornada', (req, res) => {
  try {
    const config = getJornadaConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter jornada',
      error: error.message
    });
  }
});

// Salvar configuração de jornada
router.post('/jornada', (req, res) => {
  try {
    const {
      dias_semana,
      hora_entrada,
      hora_saida,
      tolerancia_minutos,
      dias_uteis_padrao
    } = req.body;

    const dias = Array.isArray(dias_semana) ? dias_semana : DEFAULT_JORNADA.dias_semana;
    const diasFiltrados = dias.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6);
    if (!diasFiltrados.length) {
      return res.status(400).json({
        success: false,
        message: 'Selecione ao menos um dia útil'
      });
    }

    db.prepare(`
      INSERT INTO folha_jornada_config (
        id, dias_semana, hora_entrada, hora_saida, tolerancia_minutos, dias_uteis_padrao, atualizado_em
      ) VALUES (1, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE SET
        dias_semana = excluded.dias_semana,
        hora_entrada = excluded.hora_entrada,
        hora_saida = excluded.hora_saida,
        tolerancia_minutos = excluded.tolerancia_minutos,
        dias_uteis_padrao = excluded.dias_uteis_padrao,
        atualizado_em = excluded.atualizado_em
    `).run(
      JSON.stringify(diasFiltrados),
      hora_entrada || DEFAULT_JORNADA.hora_entrada,
      hora_saida || DEFAULT_JORNADA.hora_saida,
      Math.max(0, parseInt(tolerancia_minutos || DEFAULT_JORNADA.tolerancia_minutos, 10)),
      Math.max(1, parseInt(dias_uteis_padrao || DEFAULT_JORNADA.dias_uteis_padrao, 10))
    );

    return res.json({
      success: true,
      message: 'Jornada atualizada com sucesso!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao salvar jornada',
      error: error.message
    });
  }
});

// Listar feriados (filtro opcional por ano)
router.get('/feriados', (req, res) => {
  try {
    const { ano } = req.query;
    const filtro = ano ? 'WHERE data LIKE ?' : '';
    const params = ano ? [`${ano}-%`] : [];

    const feriados = db.prepare(`
      SELECT * FROM folha_feriados
      ${filtro}
      ORDER BY data
    `).all(...params);

    return res.json({
      success: true,
      total: feriados.length,
      data: feriados
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar feriados',
      error: error.message
    });
  }
});

// Cadastrar feriado
router.post('/feriados', (req, res) => {
  try {
    const { data, descricao, tipo } = req.body;

    if (!data || !descricao) {
      return res.status(400).json({
        success: false,
        message: 'Data e descrição são obrigatórias'
      });
    }

    db.prepare(`
      INSERT OR REPLACE INTO folha_feriados (data, descricao, tipo)
      VALUES (?, ?, ?)
    `).run(data, descricao, tipo || 'nacional');

    return res.json({
      success: true,
      message: 'Feriado registado com sucesso!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao registar feriado',
      error: error.message
    });
  }
});

// Remover feriado
router.delete('/feriados/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM folha_feriados WHERE id = ?').run(req.params.id);
    return res.json({
      success: result.changes > 0,
      message: result.changes > 0 ? 'Feriado removido.' : 'Feriado não encontrado.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao remover feriado',
      error: error.message
    });
  }
});

// Gerar calendário de presenças para o mês (todos funcionários ativos)
router.post('/presencas/gerar', (req, res) => {
  try {
    const { mes, ano } = req.body;
    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    const mesInt = parseInt(mes, 10);
    const anoInt = parseInt(ano, 10);
    const config = getJornadaConfig();
    const feriados = getFeriadosDoMes(anoInt, mesInt);
    const feriadosSet = new Set(feriados.map(f => f.data));
    const diasNoMes = getDiasNoMes(anoInt, mesInt);
    const funcionarios = db.prepare('SELECT id FROM funcionarios WHERE ativo = 1').all();

    const stmt = db.prepare(`
      INSERT INTO folha_presencas (
        funcionario_id, data, status, hora_entrada, hora_saida, observacoes
      ) VALUES (?, ?, ?, NULL, NULL, NULL)
      ON CONFLICT(funcionario_id, data) DO UPDATE SET
        status = CASE
          WHEN folha_presencas.status IN ('pendente', 'folga') THEN excluded.status
          ELSE folha_presencas.status
        END,
        atualizado_em = datetime('now', 'localtime')
    `);

    db.exec('BEGIN');

    funcionarios.forEach((func) => {
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(anoInt, mesInt - 1, dia);
        const dayOfWeek = data.getDay();
        const dataStr = `${anoInt}-${String(mesInt).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        const isHoliday = feriadosSet.has(dataStr);
        const isWorkday = config.dias_semana.includes(dayOfWeek);

        let status = 'pendente';
        if (isHoliday) {
          status = 'feriado';
        } else if (!isWorkday) {
          status = 'folga';
        }

        stmt.run(func.id, dataStr, status);
      }
    });

    db.exec('COMMIT');

    return res.json({
      success: true,
      message: 'Calendário gerado com sucesso!'
    });
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (e) { /* noop */ }
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar calendário',
      error: error.message
    });
  }
});

// Listar presenças (filtros: mes, ano, funcionario_id)
router.get('/presencas', (req, res) => {
  try {
    const { mes, ano, funcionario_id } = req.query;
    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    const mesInt = parseInt(mes, 10);
    const anoInt = parseInt(ano, 10);
    const filtroFuncionario = funcionario_id ? 'AND p.funcionario_id = ?' : '';
    const params = funcionario_id
      ? [
          `${anoInt}-${String(mesInt).padStart(2, '0')}-%`,
          parseInt(funcionario_id, 10)
        ]
      : [`${anoInt}-${String(mesInt).padStart(2, '0')}-%`];

    const registros = db.prepare(`
      SELECT p.*, f.nome as funcionario_nome
      FROM folha_presencas p
      JOIN funcionarios f ON f.id = p.funcionario_id
      WHERE p.data LIKE ?
      ${filtroFuncionario}
      ORDER BY p.data, f.nome
    `).all(...params);

    return res.json({
      success: true,
      total: registros.length,
      data: registros
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar presenças',
      error: error.message
    });
  }
});

// Registrar/atualizar presença
router.post('/presencas', (req, res) => {
  try {
    const { funcionario_id, data, status, hora_entrada, hora_saida, observacoes } = req.body;

    if (!funcionario_id || !data) {
      return res.status(400).json({
        success: false,
        message: 'Funcionário e data são obrigatórios'
      });
    }

    const statusFinal = (status || 'pendente').toLowerCase();
    const statusValidos = ['pendente', 'presente', 'ausente', 'justificada', 'feriado', 'folga'];
    if (!statusValidos.includes(statusFinal)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }

    db.prepare(`
      INSERT INTO folha_presencas (
        funcionario_id, data, status, hora_entrada, hora_saida, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(funcionario_id, data) DO UPDATE SET
        status = excluded.status,
        hora_entrada = excluded.hora_entrada,
        hora_saida = excluded.hora_saida,
        observacoes = excluded.observacoes,
        atualizado_em = datetime('now', 'localtime')
    `).run(
      parseInt(funcionario_id, 10),
      data,
      statusFinal,
      hora_entrada || null,
      hora_saida || null,
      observacoes || null
    );

    return res.json({
      success: true,
      message: 'Presença actualizada com sucesso!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao actualizar presença',
      error: error.message
    });
  }
});

// Consolidar faltas com base nas presenças
router.post('/presencas/consolidar', (req, res) => {
  try {
    const { mes, ano } = req.body;
    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    const mesInt = parseInt(mes, 10);
    const anoInt = parseInt(ano, 10);
    const config = getJornadaConfig();
    const feriados = getFeriadosDoMes(anoInt, mesInt);
    const feriadosSet = new Set(feriados.map(f => f.data));
    const diasNoMes = getDiasNoMes(anoInt, mesInt);

    const funcionarios = db.prepare('SELECT id FROM funcionarios WHERE ativo = 1').all();
    const presencas = db.prepare(`
      SELECT funcionario_id, data, status
      FROM folha_presencas
      WHERE data LIKE ?
    `).all(`${anoInt}-${String(mesInt).padStart(2, '0')}-%`);

    const presencasPorFuncionario = new Map();
    presencas.forEach(p => {
      if (!presencasPorFuncionario.has(p.funcionario_id)) {
        presencasPorFuncionario.set(p.funcionario_id, []);
      }
      presencasPorFuncionario.get(p.funcionario_id).push(p);
    });

    const totalDiasUteis = (() => {
      let count = 0;
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(anoInt, mesInt - 1, dia);
        const dayOfWeek = data.getDay();
        const dataStr = `${anoInt}-${String(mesInt).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const isHoliday = feriadosSet.has(dataStr);
        const isWorkday = config.dias_semana.includes(dayOfWeek);
        if (isWorkday && !isHoliday) count++;
      }
      return count;
    })();

    const upsert = db.prepare(`
      INSERT INTO folha_faltas (
        funcionario_id, mes, ano, dias_falta, tipo, dias_uteis, desconto_manual, observacoes
      ) VALUES (?, ?, ?, ?, 'injustificada', ?, NULL, NULL)
      ON CONFLICT(funcionario_id, mes, ano) DO UPDATE SET
        dias_falta = excluded.dias_falta,
        tipo = excluded.tipo,
        dias_uteis = excluded.dias_uteis,
        atualizado_em = datetime('now', 'localtime')
    `);

    db.exec('BEGIN');

    funcionarios.forEach(func => {
      const registros = presencasPorFuncionario.get(func.id) || [];
      const faltas = registros.filter(r => r.status === 'ausente').length;
      upsert.run(func.id, mesInt, anoInt, faltas, totalDiasUteis);
    });

    db.exec('COMMIT');

    return res.json({
      success: true,
      message: 'Faltas consolidadas com sucesso!',
      data: {
        funcionarios: funcionarios.length,
        dias_uteis: totalDiasUteis
      }
    });
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (e) { /* noop */ }
    return res.status(500).json({
      success: false,
      message: 'Erro ao consolidar faltas',
      error: error.message
    });
  }
});

// ==================== FALTAS ====================

// Listar faltas (filtros opcionais: funcionario_id, mes, ano)
router.get('/faltas', (req, res) => {
  try {
    const { funcionario_id, mes, ano } = req.query;
    const filtros = [];
    const params = [];

    if (funcionario_id) {
      filtros.push('f.funcionario_id = ?');
      params.push(parseInt(funcionario_id, 10));
    }
    if (mes) {
      filtros.push('f.mes = ?');
      params.push(parseInt(mes, 10));
    }
    if (ano) {
      filtros.push('f.ano = ?');
      params.push(parseInt(ano, 10));
    }

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    const registros = db.prepare(`
      SELECT f.*, fu.nome as funcionario_nome
      FROM folha_faltas f
      JOIN funcionarios fu ON fu.id = f.funcionario_id
      ${where}
      ORDER BY f.ano DESC, f.mes DESC, fu.nome
    `).all(...params);

    return res.json({
      success: true,
      total: registros.length,
      data: registros
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar faltas',
      error: error.message
    });
  }
});

// Registrar/atualizar faltas
router.post('/faltas', (req, res) => {
  try {
    const {
      funcionario_id,
      mes,
      ano,
      dias_falta,
      tipo,
      dias_uteis,
      desconto_manual,
      observacoes
    } = req.body;

    if (!funcionario_id || !mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Funcionário, mês e ano são obrigatórios'
      });
    }

    const tipoFinal = (tipo || 'injustificada').toLowerCase();
    if (!['justificada', 'injustificada'].includes(tipoFinal)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo inválido. Use "justificada" ou "injustificada".'
      });
    }

    const diasFaltaFinal = Math.max(0, parseInt(dias_falta || 0, 10));
    const diasUteisFinal = dias_uteis !== undefined && dias_uteis !== null
      ? Math.max(1, parseInt(dias_uteis, 10))
      : 22;
    const descontoManualFinal = desconto_manual !== undefined && desconto_manual !== null
      ? Math.max(0, Number(desconto_manual))
      : null;

    db.prepare(`
      INSERT INTO folha_faltas (
        funcionario_id, mes, ano, dias_falta, tipo, dias_uteis, desconto_manual, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(funcionario_id, mes, ano) DO UPDATE SET
        dias_falta = excluded.dias_falta,
        tipo = excluded.tipo,
        dias_uteis = excluded.dias_uteis,
        desconto_manual = excluded.desconto_manual,
        observacoes = excluded.observacoes,
        atualizado_em = datetime('now', 'localtime')
    `).run(
      parseInt(funcionario_id, 10),
      parseInt(mes, 10),
      parseInt(ano, 10),
      diasFaltaFinal,
      tipoFinal,
      diasUteisFinal,
      descontoManualFinal,
      observacoes || null
    );

    const registro = db.prepare(`
      SELECT f.*, fu.nome as funcionario_nome
      FROM folha_faltas f
      JOIN funcionarios fu ON fu.id = f.funcionario_id
      WHERE f.funcionario_id = ? AND f.mes = ? AND f.ano = ?
    `).get(parseInt(funcionario_id, 10), parseInt(mes, 10), parseInt(ano, 10));

    return res.json({
      success: true,
      message: 'Faltas registradas com sucesso!',
      data: registro
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar faltas',
      error: error.message
    });
  }
});

// Remover faltas por ID
router.delete('/faltas/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM folha_faltas WHERE id = ?').run(id);

    return res.json({
      success: result.changes > 0,
      message: result.changes > 0 ? 'Registro de faltas removido.' : 'Registro não encontrado.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao remover faltas',
      error: error.message
    });
  }
});

// Atualizar escalão IRT
router.put('/irt/:id', (req, res) => {
  try {
    const { de, ate, parcela_fixa, taxa, excesso } = req.body;

    if (ate !== null && ate !== undefined && ate <= de) {
      return res.status(400).json({
        success: false,
        message: 'O valor "Até" deve ser maior que "De" ou nulo para infinito.'
      });
    }

    db.prepare(`
      UPDATE irt_grupos SET
        de = ?, ate = ?, parcela_fixa = ?, taxa = ?, excesso = ?
      WHERE id = ?
    `).run(de, ate, parcela_fixa, taxa, excesso, req.params.id);

    res.json({
      success: true,
      message: 'Escalão IRT atualizado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar escalão IRT',
      error: error.message
    });
  }
});

// Criar novo escalão IRT
router.post('/irt', (req, res) => {
  try {
    const { ordem, de, ate, parcela_fixa, taxa, excesso } = req.body;

    // Validação
    if (!ordem || de === undefined || parcela_fixa === undefined || taxa === undefined || excesso === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Dados incompletos. Ordem, de, parcela_fixa, taxa e excesso são obrigatórios.'
      });
    }

    if (ate !== null && ate !== undefined && ate <= de) {
      return res.status(400).json({
        success: false,
        message: 'O valor "Até" deve ser maior que "De" ou nulo para infinito.'
      });
    }

    // Inserir novo escalão
    const result = db.prepare(`
      INSERT INTO irt_grupos (ordem, de, ate, parcela_fixa, taxa, excesso, ativo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(ordem, de, ate, parcela_fixa, taxa, excesso);

    res.json({
      success: true,
      message: 'Escalão IRT criado com sucesso!',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar escalão IRT',
      error: error.message
    });
  }
});

// Eliminar escalão IRT
router.delete('/irt/:id', (req, res) => {
  try {
    const escalao = db.prepare('SELECT ordem FROM irt_grupos WHERE id = ?').get(req.params.id);
    
    if (!escalao) {
      return res.status(404).json({
        success: false,
        message: 'Escalão não encontrado'
      });
    }

    // Desativar ao invés de deletar (para manter histórico)
    db.prepare('UPDATE irt_grupos SET ativo = 0 WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Escalão IRT eliminado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao eliminar escalão IRT',
      error: error.message
    });
  }
});

// Criar snapshot IRT (backup)
router.post('/irt/snapshot', (req, res) => {
  try {
    const { label } = req.body;

    const result = db.prepare(`
      INSERT INTO irt_snapshot_meta (label) VALUES (?)
    `).run(label || `Backup ${new Date().toISOString()}`);

    const snapshotId = result.lastInsertRowid;

    // Copiar escalões atuais para snapshot
    db.prepare(`
      INSERT INTO irt_grupos_snapshots (snapshot_id, ordem, de, ate, parcela_fixa, taxa, excesso, ativo)
      SELECT ?, ordem, de, ate, parcela_fixa, taxa, excesso, ativo
      FROM irt_grupos
    `).run(snapshotId);

    res.json({
      success: true,
      message: 'Snapshot IRT criado com sucesso!',
      data: { snapshot_id: snapshotId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar snapshot IRT',
      error: error.message
    });
  }
});

// Listar snapshots IRT
router.get('/irt/snapshots', (req, res) => {
  try {
    const snapshots = db.prepare(`
      SELECT m.*, COUNT(s.id) as total_escaloes
      FROM irt_snapshot_meta m
      LEFT JOIN irt_grupos_snapshots s ON m.id = s.snapshot_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `).all();

    res.json({
      success: true,
      total: snapshots.length,
      data: snapshots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar snapshots IRT',
      error: error.message
    });
  }
});

// Restaurar snapshot IRT
router.post('/irt/snapshot/:id/restore', (req, res) => {
  try {
    const snapshotId = req.params.id;

    // Limpar tabela atual
    db.prepare('DELETE FROM irt_grupos').run();

    // Restaurar do snapshot
    db.prepare(`
      INSERT INTO irt_grupos (ordem, de, ate, parcela_fixa, taxa, excesso, ativo)
      SELECT ordem, de, ate, parcela_fixa, taxa, excesso, ativo
      FROM irt_grupos_snapshots
      WHERE snapshot_id = ?
      ORDER BY ordem
    `).run(snapshotId);

    res.json({
      success: true,
      message: 'Snapshot IRT restaurado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao restaurar snapshot IRT',
      error: error.message
    });
  }
});

// ==================== CÁLCULO DE FOLHA ====================

// Calcular folha de um funcionário
router.post('/calcular/:funcionario_id', (req, res) => {
  try {
    console.log('📊 Requisição /calcular recebida:', {
      funcionario_id: req.params.funcionario_id,
      body: req.body
    });

    const { mes, ano } = req.body;
    
    if (!mes || !ano) {
      console.log('❌ Faltando mês ou ano');
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    console.log('🔢 Calculando folha...');
    const calculo = folhaService.calcularFolhaFuncionario(
      parseInt(req.params.funcionario_id),
      parseInt(mes),
      parseInt(ano)
    );

    console.log('✅ Cálculo bem-sucedido:', {
      funcionario: calculo.funcionario.nome,
      salario_liquido: calculo.salario_liquido
    });

    res.json({
      success: true,
      message: 'Folha calculada com sucesso!',
      data: calculo
    });
  } catch (error) {
    console.error('❌ Erro ao calcular folha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular folha',
      error: error.message
    });
  }
});

// Registrar pagamento de salário
router.post('/pagamentos', (req, res) => {
  try {
    const { mes, ano, pagamentos } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe ao menos um pagamento'
      });
    }

    const detalhes = [];
    const mesInt = parseInt(mes);
    const anoInt = parseInt(ano);
    const moduleConfig = req.moduleConfig || getModuleConfig();
    const syncWithVendas = shouldSyncFolhaToVendas(moduleConfig);

    pagamentos.forEach((pagamento) => {
      const { funcionario_id, descricao, observacoes, valor } = pagamento;

      if (!funcionario_id) {
        detalhes.push({ sucesso: false, funcionario_id, erro: 'Funcionário obrigatório' });
        return;
      }

      try {
        const calculo = folhaService.calcularFolhaFuncionario(parseInt(funcionario_id), mesInt, anoInt);
        const valorUsado = valor !== undefined ? parseFloat(valor) : calculo.salario_liquido;

        let despesaId = null;
        if (syncWithVendas) {
          despesaId = folhaService.registrarPagamentoSalario(calculo, mesInt, anoInt, {
            descricao,
            observacoes,
            valor: valorUsado
          });
        }

        // Registrar status de pagamento
        try {
          db.prepare(`
            INSERT OR REPLACE INTO folha_pagamentos_status (
              funcionario_id, mes, ano, status, valor_pago, pago_em
            ) VALUES (?, ?, ?, 'pago', ?, datetime('now', 'localtime'))
          `).run(calculo.funcionario.id, mesInt, anoInt, valorUsado);
          console.log(`✅ Status registrado: funcionario=${calculo.funcionario.id}, mes=${mesInt}, ano=${anoInt}, status=pago`);
        } catch (statusError) {
          console.error(`❌ Erro ao registrar status: ${statusError.message}`);
        }

        detalhes.push({
          sucesso: true,
          funcionario_id: calculo.funcionario.id,
          funcionario: calculo.funcionario.nome,
          valor: valorUsado,
          despesa_id: despesaId,
          integracao: syncWithVendas ? 'registrado' : 'independente'
        });
      } catch (error) {
        detalhes.push({
          sucesso: false,
          funcionario_id,
          erro: error.message
        });
      }
    });

    const totalSucesso = detalhes.filter(d => d.sucesso).length;

    return res.json({
      success: totalSucesso > 0,
      message: `${totalSucesso} pagamento(s) ${syncWithVendas ? 'registrado(s)' : 'processado(s)'}` + (totalSucesso < detalhes.length ? `, ${detalhes.length - totalSucesso} falhou/falharam` : ''),
      data: {
        total: detalhes.length,
        sucessos: totalSucesso,
        integracao: {
          ativo: syncWithVendas,
          modo: moduleConfig?.integracao_modo
        },
        detalhes
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar pagamentos',
      error: error.message
    });
  }
});

// Consultar status de pagamentos da folha
router.get('/pagamentos/status', (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    const mesInt = parseInt(mes, 10);
    const anoInt = parseInt(ano, 10);

    const registros = db.prepare(`
      SELECT funcionario_id, status, valor_pago, despesa_id, pago_em
      FROM folha_pagamentos_status
      WHERE mes = ? AND ano = ?
    `).all(mesInt, anoInt);

    return res.json({
      success: true,
      total: registros.length,
      data: registros
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar status de pagamentos',
      error: error.message
    });
  }
});

// Calcular folha completa (todos funcionários)
router.post('/calcular-completa', (req, res) => {
  try {
    const { mes, ano } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }

    const resultados = folhaService.calcularFolhaCompleta(
      parseInt(mes),
      parseInt(ano)
    );

    const sucessos = resultados.filter(r => r.sucesso);
    const erros = resultados.filter(r => !r.sucesso).length;

    // Calcular totais
    const totais = sucessos.reduce((acc, r) => {
      return {
        total_salario_base: acc.total_salario_base + (r.salario_base || 0),
        total_inss_empregado: acc.total_inss_empregado + (r.inss?.empregado || 0),
        total_inss_patronal: acc.total_inss_patronal + (r.inss?.patronal || 0),
        total_irt: acc.total_irt + (r.irt?.valor || 0),
        total_descontos: acc.total_descontos + (r.total_descontos || 0),
        total_liquido: acc.total_liquido + (r.salario_liquido || 0),
        total_empresa: acc.total_empresa + ((r.salario_liquido || 0) + (r.inss?.patronal || 0))
      };
    }, {
      total_salario_base: 0,
      total_inss_empregado: 0,
      total_inss_patronal: 0,
      total_irt: 0,
      total_descontos: 0,
      total_liquido: 0,
      total_empresa: 0
    });

    res.json({
      success: true,
      message: `Folha calculada! ${sucessos.length} sucessos, ${erros} erros`,
      data: {
        total: resultados.length,
        sucessos: sucessos.length,
        erros,
        folhas: sucessos,
        ...totais
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular folha completa',
      error: error.message
    });
  }
});

// Buscar folhas calculadas
router.get('/folhas', (req, res) => {
  try {
    const { mes, ano, funcionario_id } = req.query;

    let sql = `
      SELECT f.*, 
             func.nome as funcionario_nome, 
             func.categoria,
             COALESCE(fps.status, 'pendente') as status_pagamento,
             fps.valor_pago,
             fps.pago_em
      FROM folhas_pagamento f
      JOIN funcionarios func ON f.funcionario_id = func.id
      LEFT JOIN folha_pagamentos_status fps ON 
        fps.funcionario_id = f.funcionario_id AND
        fps.mes = f.mes AND
        fps.ano = f.ano
      WHERE 1=1
    `;
    const params = [];

    if (mes) {
      sql += ' AND f.mes = ?';
      params.push(mes);
    }

    if (ano) {
      sql += ' AND f.ano = ?';
      params.push(ano);
    }

    if (funcionario_id) {
      sql += ' AND f.funcionario_id = ?';
      params.push(funcionario_id);
    }

    sql += ' ORDER BY f.ano DESC, f.mes DESC, func.nome';

    const folhas = db.prepare(sql).all(...params);

    res.json({
      success: true,
      total: folhas.length,
      data: folhas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar folhas',
      error: error.message
    });
  }
});

// Buscar detalhes de uma folha específica
router.get('/folhas/:id', (req, res) => {
  try {
    const folha = db.prepare(`
      SELECT f.*, func.nome as funcionario_nome, func.categoria
      FROM folhas_pagamento f
      JOIN funcionarios func ON f.funcionario_id = func.id
      WHERE f.id = ?
    `).get(req.params.id);

    if (!folha) {
      return res.status(404).json({
        success: false,
        message: 'Folha não encontrada'
      });
    }

    // Buscar detalhes dos subsídios
    const subsidios = db.prepare(`
      SELECT * FROM folha_subsidios_detalhes WHERE folha_id = ?
    `).all(req.params.id);

    folha.subsidios_detalhes = subsidios;

    res.json({
      success: true,
      data: folha
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar folha',
      error: error.message
    });
  }
});

// Buscar detalhes dos subsídios de uma folha
router.get('/folhas/:id/detalhes', (req, res) => {
  try {
    const detalhes = db.prepare(`
      SELECT * FROM folha_subsidios_detalhes WHERE folha_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      total: detalhes.length,
      data: detalhes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes',
      error: error.message
    });
  }
});

// ==================== FÓRMULAS DE CÁLCULO ====================

// Listar fórmulas
router.get('/formulas', (req, res) => {
  try {
    const formulas = db.prepare(`
      SELECT * FROM formulas_calculo WHERE ativo = 1 ORDER BY id
    `).all();

    res.json({
      success: true,
      total: formulas.length,
      data: formulas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar fórmulas',
      error: error.message
    });
  }
});

// Atualizar fórmula
router.put('/formulas/:codigo', (req, res) => {
  try {
    const { codigo } = req.params;
    const { formula, descricao } = req.body;

    // Verificar se a fórmula existe e é editável
    const formulaExistente = db.prepare(`
      SELECT * FROM formulas_calculo WHERE codigo = ?
    `).get(codigo);

    if (!formulaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula não encontrada'
      });
    }

    if (formulaExistente.editavel === 0) {
      return res.status(403).json({
        success: false,
        message: 'Esta fórmula não pode ser editada (protegida pela legislação)'
      });
    }

    // Atualizar fórmula
    db.prepare(`
      UPDATE formulas_calculo 
      SET formula = ?, descricao = ?, atualizado_em = datetime('now', 'localtime')
      WHERE codigo = ?
    `).run(formula, descricao || null, codigo);

    const formulaAtualizada = db.prepare(`
      SELECT * FROM formulas_calculo WHERE codigo = ?
    `).get(codigo);

    res.json({
      success: true,
      message: 'Fórmula atualizada com sucesso',
      data: formulaAtualizada
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar fórmula',
      error: error.message
    });
  }
});

// ==================== GERENCIAMENTO DE FÓRMULAS ====================

// Listar todas as fórmulas
router.get('/formulas', (req, res) => {
  try {
    const formulas = db.prepare(`
      SELECT * FROM formulas_calculo WHERE ativo = 1 ORDER BY id
    `).all();

    res.json({
      success: true,
      total: formulas.length,
      data: formulas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar fórmulas',
      error: error.message
    });
  }
});

// Atualizar fórmula
router.put('/formulas/:id', (req, res) => {
  try {
    const { formula } = req.body;
    const formulaData = db.prepare('SELECT * FROM formulas_calculo WHERE id = ?').get(req.params.id);

    if (!formulaData) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula não encontrada'
      });
    }

    if (formulaData.editavel === 0) {
      return res.status(403).json({
        success: false,
        message: 'Esta fórmula não pode ser editada (protegida pela legislação)'
      });
    }

    db.prepare(`
      UPDATE formulas_calculo 
      SET formula = ?, atualizado_em = datetime('now', 'localtime')
      WHERE id = ?
    `).run(formula, req.params.id);

    const formulaAtualizada = db.prepare('SELECT * FROM formulas_calculo WHERE id = ?').get(req.params.id);

    res.json({
      success: true,
      message: 'Fórmula atualizada com sucesso!',
      data: formulaAtualizada
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar fórmula',
      error: error.message
    });
  }
});

module.exports = router;
