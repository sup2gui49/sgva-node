const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== RELATÓRIOS FOLHA PROFISSIONAL ====================

// Relatório completo de folha de pagamento (dados para Excel)
router.get('/folha-completa', (req, res) => {
  try {
    const { mes, ano } = req.query;

    let query = `
      SELECT 
        f.nome as funcionario,
        c.nome as categoria,
        fp.mes,
        fp.ano,
        fp.salario_base,
        fp.total_subsidios,
        fp.subsidios_isentos,
        fp.subsidios_tributaveis,
        fp.salario_bruto,
        fp.inss_empregado,
        fp.inss_patronal,
        fp.deducao_fixa,
        fp.rendimento_colectavel,
        fp.irt,
        fp.total_descontos,
        fp.salario_liquido,
        (fp.salario_bruto + fp.inss_patronal) as custo_total_empresa,
        fp.calculado_em
      FROM folhas_pagamento fp
      JOIN funcionarios f ON fp.funcionario_id = f.id
      LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
      WHERE 1=1
    `;

    const params = [];
    if (mes) {
      query += ' AND fp.mes = ?';
      params.push(mes);
    }
    if (ano) {
      query += ' AND fp.ano = ?';
      params.push(ano);
    }

    query += ' ORDER BY f.nome, fp.ano DESC, fp.mes DESC';

    const folhas = db.prepare(query).all(...params);

    res.json({
      success: true,
      total: folhas.length,
      data: folhas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de folha',
      error: error.message
    });
  }
});

// Relatório de subsídios por funcionário
router.get('/subsidios-funcionarios', (req, res) => {
  try {
    const subsidios = db.prepare(`
      SELECT 
        f.nome as funcionario,
        f.salario_base,
        c.nome as categoria,
        s.nome as subsidio,
        s.tipo_subsidio,
        s.tipo_calculo,
        s.valor_padrao_empresa,
        fs.valor_especifico,
        fs.atribuido_em,
        CASE 
          WHEN fs.valor_especifico IS NOT NULL THEN fs.valor_especifico
          WHEN s.tipo_calculo = 'fixo' THEN s.valor_padrao_empresa
          WHEN s.tipo_calculo = 'percentual' THEN (f.salario_base * s.percentual / 100)
          ELSE 0
        END as valor_calculado
      FROM funcionarios_subsidios fs
      JOIN funcionarios f ON fs.funcionario_id = f.id
      JOIN subsidios s ON fs.subsidio_id = s.id
      LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
      WHERE fs.ativo = 1
      ORDER BY f.nome, s.nome
    `).all();

    res.json({
      success: true,
      total: subsidios.length,
      data: subsidios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de subsídios',
      error: error.message
    });
  }
});

// Relatório de custos por categoria
router.get('/custos-categoria', (req, res) => {
  try {
    const { mes, ano } = req.query;

    let query = `
      SELECT 
        COALESCE(c.nome, 'Sem Categoria') as categoria,
        COUNT(DISTINCT fp.funcionario_id) as total_funcionarios,
        SUM(fp.salario_base) as total_salarios_base,
        SUM(fp.total_subsidios) as total_subsidios,
        SUM(fp.salario_bruto) as total_bruto,
        SUM(fp.inss_empregado) as total_inss_empregado,
        SUM(fp.inss_patronal) as total_inss_patronal,
        SUM(fp.irt) as total_irt,
        SUM(fp.salario_liquido) as total_liquido,
        SUM(fp.salario_bruto + fp.inss_patronal) as custo_total_empresa
      FROM folhas_pagamento fp
      JOIN funcionarios f ON fp.funcionario_id = f.id
      LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
      WHERE 1=1
    `;

    const params = [];
    if (mes) {
      query += ' AND fp.mes = ?';
      params.push(mes);
    }
    if (ano) {
      query += ' AND fp.ano = ?';
      params.push(ano);
    }

    query += ' GROUP BY c.nome ORDER BY custo_total_empresa DESC';

    const custos = db.prepare(query).all(...params);

    res.json({
      success: true,
      total: custos.length,
      data: custos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de custos',
      error: error.message
    });
  }
});

// Relatório de evolução salarial (últimos 6 meses)
router.get('/evolucao-salarial', (req, res) => {
  try {
    const { funcionario_id } = req.query;

    let query = `
      SELECT 
        fp.mes,
        fp.ano,
        fp.salario_base,
        fp.total_subsidios,
        fp.salario_bruto,
        fp.total_descontos,
        fp.salario_liquido,
        (fp.salario_bruto + fp.inss_patronal) as custo_empresa
      FROM folhas_pagamento fp
      WHERE 1=1
    `;

    const params = [];
    if (funcionario_id) {
      query += ' AND fp.funcionario_id = ?';
      params.push(funcionario_id);
    }

    query += ' ORDER BY fp.ano DESC, fp.mes DESC LIMIT 6';

    const evolucao = db.prepare(query).all(...params);

    res.json({
      success: true,
      total: evolucao.length,
      data: evolucao.reverse() // Ordem cronológica
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de evolução',
      error: error.message
    });
  }
});

// Dashboard de estatísticas gerais
router.get('/dashboard-stats', (req, res) => {
  try {
    const { mes, ano } = req.query;
    const mesAtual = mes || new Date().getMonth() + 1;
    const anoAtual = ano || new Date().getFullYear();

    // Total de funcionários ativos
    const totalFunc = db.prepare('SELECT COUNT(*) as total FROM funcionarios WHERE ativo = 1').get();

    // Total de folhas do mês
    const folhasMes = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(salario_bruto) as total_bruto,
        SUM(salario_liquido) as total_liquido,
        SUM(inss_empregado) as total_inss_emp,
        SUM(inss_patronal) as total_inss_pat,
        SUM(irt) as total_irt,
        SUM(salario_bruto + inss_patronal) as custo_total
      FROM folhas_pagamento 
      WHERE mes = ? AND ano = ?
    `).get(mesAtual, anoAtual);

    // Distribuição por categoria
    const porCategoria = db.prepare(`
      SELECT 
        COALESCE(c.nome, 'Sem Categoria') as categoria,
        COUNT(*) as quantidade,
        SUM(fp.salario_liquido) as total_liquido
      FROM folhas_pagamento fp
      JOIN funcionarios f ON fp.funcionario_id = f.id
      LEFT JOIN categorias_funcionarios c ON f.categoria_id = c.id
      WHERE fp.mes = ? AND fp.ano = ?
      GROUP BY c.nome
    `).all(mesAtual, anoAtual);

    // Top 5 subsídios mais usados
    const topSubsidios = db.prepare(`
      SELECT 
        s.nome,
        COUNT(*) as quantidade,
        SUM(CASE 
          WHEN fs.valor_especifico IS NOT NULL THEN fs.valor_especifico
          WHEN s.tipo_calculo = 'fixo' THEN s.valor_padrao_empresa
          ELSE 0
        END) as valor_total
      FROM funcionarios_subsidios fs
      JOIN subsidios s ON fs.subsidio_id = s.id
      WHERE fs.ativo = 1
      GROUP BY s.id, s.nome
      ORDER BY quantidade DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        funcionarios: {
          total: totalFunc.total
        },
        folhaMes: {
          total_processadas: folhasMes.total || 0,
          total_bruto: folhasMes.total_bruto || 0,
          total_liquido: folhasMes.total_liquido || 0,
          total_inss_empregado: folhasMes.total_inss_emp || 0,
          total_inss_patronal: folhasMes.total_inss_pat || 0,
          total_irt: folhasMes.total_irt || 0,
          custo_total_empresa: folhasMes.custo_total || 0
        },
        distribuicao: porCategoria,
        topSubsidios: topSubsidios,
        mes: mesAtual,
        ano: anoAtual
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar estatísticas do dashboard',
      error: error.message
    });
  }
});

module.exports = router;
