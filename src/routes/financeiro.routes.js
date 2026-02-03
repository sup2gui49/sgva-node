const express = require('express');
const router = express.Router();
const db = require('../config/database');
const IvaService = require('../services/iva.service');

function montarFiltroPeriodo(campoData, mes, ano) {
  if (!mes || !ano) {
    return { sql: '', params: [] };
  }

  const anoStr = ano.toString();
  const mesStr = mes.toString().padStart(2, '0');
  return {
    sql: ` AND strftime('%Y', ${campoData}) = ? AND strftime('%m', ${campoData}) = ?`,
    params: [anoStr, mesStr]
  };
}

const ensureFinanceConfig = () => {
  // HEAL: Ensure table exists
  try {
    const tableExists = db.prepare("SELECT count(*) as qtd FROM sqlite_master WHERE type='table' AND name='config_financeira'").get();
    if (!tableExists || tableExists.qtd === 0) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS config_financeira (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          margem_minima REAL DEFAULT 30,
          capital_giro_percentual REAL DEFAULT 40,
          fundo_reserva_percentual REAL DEFAULT 10,
          distribuicao_lucro_percentual REAL DEFAULT 50,
          inss_empregado REAL DEFAULT 3.0,
          inss_patronal REAL DEFAULT 8.0,
          irt_estimado_percentual REAL DEFAULT 0,
          imposto_selo_percentual REAL DEFAULT 0,
          imposto_selo_limite_faturacao REAL DEFAULT 0,
          atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
        )
      `);
      // Initialize default row
      db.prepare(`
        INSERT INTO config_financeira 
        (id, margem_minima, capital_giro_percentual, fundo_reserva_percentual, distribuicao_lucro_percentual)
        VALUES (1, 30, 40, 10, 50)
      `).run();
    }
  } catch (e) {
    console.error('Auto-heal financeiro failed:', e);
  }

  const columns = db.prepare('PRAGMA table_info(config_financeira)').all().map(col => col.name);
  const addColumn = (name, sql) => {
    if (!columns.includes(name)) {
      db.prepare(`ALTER TABLE config_financeira ADD COLUMN ${sql}`).run();
    }
  };

  addColumn('regime_iva', "regime_iva TEXT DEFAULT 'normal'");
  addColumn('regime_iva_observacao', 'regime_iva_observacao TEXT');
  addColumn('irt_estimado_percentual', 'irt_estimado_percentual REAL DEFAULT 0');
  addColumn('imposto_selo_percentual', 'imposto_selo_percentual REAL DEFAULT 0');
  addColumn('imposto_selo_limite_faturacao', 'imposto_selo_limite_faturacao REAL DEFAULT 0');

  let config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
  if (!config) {
    db.prepare(`
      INSERT INTO config_financeira (
        id, margem_minima, capital_giro_percentual, fundo_reserva_percentual,
        distribuicao_lucro_percentual, inss_empregado, inss_patronal, regime_iva,
        irt_estimado_percentual, imposto_selo_percentual, imposto_selo_limite_faturacao
      ) VALUES (1, 30, 40, 10, 50, 3.0, 8.0, 'normal', 0, 0, 0)
    `).run();
    config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
  }

  const needsDefaults = [
    { key: 'regime_iva', value: 'normal' },
    { key: 'irt_estimado_percentual', value: 0 },
    { key: 'imposto_selo_percentual', value: 0 },
    { key: 'imposto_selo_limite_faturacao', value: 0 }
  ].filter(item => config[item.key] === null || config[item.key] === undefined);

  if (needsDefaults.length) {
    const setClause = needsDefaults.map(item => `${item.key} = ?`).join(', ');
    const values = needsDefaults.map(item => item.value);
    db.prepare(`UPDATE config_financeira SET ${setClause}, atualizado_em = datetime('now', 'localtime') WHERE id = 1`).run(...values);
    config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
  }

  return config;
};

// Saldo disponível (receitas - despesas pagas)
router.get('/saldo', (req, res) => {
  try {
    const { mes, ano } = req.query;
    const filtroVendas = montarFiltroPeriodo('data_venda', mes, ano);
    const filtroDespesas = montarFiltroPeriodo('data', mes, ano);

    const receitasQuery = `
      SELECT COALESCE(SUM(total), 0) as total
      FROM vendas
      WHERE status = 'concluida'
      ${filtroVendas.sql}
    `;
    const receitas = db.prepare(receitasQuery).get(...filtroVendas.params).total;

    const despesasQuery = `
      SELECT COALESCE(SUM(valor), 0) as total
      FROM despesas
      WHERE pago = 1
      ${filtroDespesas.sql}
    `;
    const despesas = db.prepare(despesasQuery).get(...filtroDespesas.params).total;

    const config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get() || {};
    const saldoBase = parseFloat(config.saldo_inicial || config.saldo_inicial_caixa || 0) || 0;
    const saldo = saldoBase + receitas - despesas;

    res.json({
      success: true,
      data: {
        periodo: mes && ano ? { mes: parseInt(mes, 10), ano: parseInt(ano, 10) } : null,
        saldo,
        receitas,
        despesas,
        saldo_base: saldoBase
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular saldo financeiro',
      error: error.message
    });
  }
});

// Dashboard financeiro (MELHORADO COM INDICADORES)
router.get('/dashboard', (req, res) => {
  try {
    const { mes, ano } = req.query;
    const anoAtual = ano || new Date().getFullYear();
    const mesAtual = mes || (new Date().getMonth() + 1);
    
    // Mês anterior para comparação
    let mesAnterior = mesAtual - 1;
    let anoAnterior = anoAtual;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior--;
    }
    
    // VENDAS DO MÊS ATUAL
    const vendasAtual = db.prepare(`
      SELECT 
        COUNT(*) as total_vendas,
        SUM(total) as receita_total,
        SUM(subtotal) as receita_sem_iva,
        SUM(valor_iva) as iva_recolhido,
        SUM(desconto) as total_descontos
      FROM vendas
      WHERE strftime('%Y', data_venda) = ?
      AND strftime('%m', data_venda) = ?
      AND status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0'));
    
    // VENDAS DO MÊS ANTERIOR
    const vendasAnterior = db.prepare(`
      SELECT 
        SUM(total) as receita_total
      FROM vendas
      WHERE strftime('%Y', data_venda) = ?
      AND strftime('%m', data_venda) = ?
      AND status = 'concluida'
    `).get(anoAnterior.toString(), mesAnterior.toString().padStart(2, '0'));
    
    // Receitas e crescimento
    const receitaTotal = vendasAtual.receita_total || 0;
    const receitaAnterior = vendasAnterior.receita_total || 0;
    const crescimentoReceita = receitaAnterior > 0 
      ? (((receitaTotal - receitaAnterior) / receitaAnterior) * 100).toFixed(2)
      : 0;
    
    // Ticket médio
    const ticketMedio = vendasAtual.total_vendas > 0 
      ? (receitaTotal / vendasAtual.total_vendas).toFixed(2)
      : 0;
    
    // Despesas do mês
    const despesas = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas
      WHERE strftime('%Y', data) = ?
      AND strftime('%m', data) = ?
      AND pago = 1
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0'));
    
    // Custos dos produtos vendidos (CMV)
    const custosVendas = db.prepare(`
      SELECT SUM(p.custo_unitario * i.quantidade) as total
      FROM itens_venda i
      JOIN vendas v ON i.venda_id = v.id
      JOIN produtos p ON i.produto_id = p.id
      WHERE strftime('%Y', v.data_venda) = ?
      AND strftime('%m', v.data_venda) = ?
      AND v.status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0'));
    
    const despesaTotal = despesas.total || 0;
    const custosTotal = custosVendas.total || 0;
    const regimeIva = IvaService.getRegimeIva();
    
    // Cálculos de lucro e margens
    const lucroLiquido = receitaTotal - despesaTotal - custosTotal;
    const margemLucro = receitaTotal > 0 ? ((lucroLiquido / receitaTotal) * 100).toFixed(2) : 0;
    const margemBruta = receitaTotal > 0 ? (((receitaTotal - custosTotal) / receitaTotal) * 100).toFixed(2) : 0;
    
    // ROI (Return on Investment)
    const investimentoTotal = despesaTotal + custosTotal;
    const roi = investimentoTotal > 0 ? ((lucroLiquido / investimentoTotal) * 100).toFixed(2) : 0;
    
    // IVA a recolher
    const ivaRecolher = vendasAtual.iva_recolhido || 0;
    
    res.json({
      success: true,
      periodo: { mes: mesAtual, ano: anoAtual },
      dados: {
        // Receitas
        receita_total: receitaTotal.toFixed(2),
        receita_sem_iva: (vendasAtual.receita_sem_iva || 0).toFixed(2),
        crescimento_receita: crescimentoReceita + '%',
        
        // Custos e Despesas
        custos_vendas: custosTotal.toFixed(2),
        despesas_totais: despesaTotal.toFixed(2),
        
        // Lucros e Margens
        lucro_bruto: (receitaTotal - custosTotal).toFixed(2),
        lucro_liquido: lucroLiquido.toFixed(2),
        margem_bruta: margemBruta + '%',
        margem_lucro: margemLucro + '%',
        
        // Indicadores
        roi: roi + '%',
        ticket_medio: ticketMedio,
        total_vendas: vendasAtual.total_vendas || 0,
        
        // Fiscal
        iva_recolher: ivaRecolher.toFixed(2),
        descontos_concedidos: (vendasAtual.total_descontos || 0).toFixed(2),
        regime_iva: regimeIva
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dashboard',
      error: error.message
    });
  }
});

// DRE - Demonstrativo de Resultados (CONFORMIDADE CONTÁBIL)
router.get('/dre', (req, res) => {
  try {
    const { mes, ano } = req.query;
    const anoAtual = ano || new Date().getFullYear();
    const mesAtual = mes || (new Date().getMonth() + 1);
    const config = ensureFinanceConfig();
    
    // Receita Bruta de Vendas (Total com IVA)
    const receitaBrutaComIVA = db.prepare(`
      SELECT SUM(total) as total
      FROM vendas
      WHERE strftime('%Y', data_venda) = ?
      AND strftime('%m', data_venda) = ?
      AND status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    // IVA Recolhido (a repassar ao Estado)
    const ivaRecolhido = db.prepare(`
      SELECT SUM(valor_iva) as total
      FROM vendas
      WHERE strftime('%Y', data_venda) = ?
      AND strftime('%m', data_venda) = ?
      AND status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    // Receita Bruta (sem IVA)
    const receitaBruta = receitaBrutaComIVA - ivaRecolhido;
    
    // Deduções (descontos dados)
    const deducoes = db.prepare(`
      SELECT SUM(desconto) as total
      FROM vendas
      WHERE strftime('%Y', data_venda) = ?
      AND strftime('%m', data_venda) = ?
      AND status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const receitaLiquida = receitaBruta - deducoes;
    
    // CMV - Custo da Mercadoria Vendida
    const cmv = db.prepare(`
      SELECT SUM(p.custo_unitario * i.quantidade) as total
      FROM itens_venda i
      JOIN vendas v ON i.venda_id = v.id
      JOIN produtos p ON i.produto_id = p.id
      WHERE strftime('%Y', v.data_venda) = ?
      AND strftime('%m', v.data_venda) = ?
      AND v.status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const lucroBruto = receitaLiquida - cmv;
    
    // Despesas Operacionais AGRUPADAS por tipo
    const despesasAdministrativas = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas d
      LEFT JOIN categorias_despesas cd ON d.categoria = cd.nome
      WHERE strftime('%Y', d.data) = ?
      AND strftime('%m', d.data) = ?
      AND d.pago = 1
      AND (cd.codigo_fiscal LIKE 'ADM%' OR d.categoria IN ('administrativas', 'escritorio', 'material'))
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const despesasComerciais = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas d
      LEFT JOIN categorias_despesas cd ON d.categoria = cd.nome
      WHERE strftime('%Y', d.data) = ?
      AND strftime('%m', d.data) = ?
      AND d.pago = 1
      AND (cd.codigo_fiscal LIKE 'COM%' OR d.categoria IN ('marketing', 'vendas', 'publicidade'))
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const despesasOperacionais = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas d
      WHERE strftime('%Y', d.data) = ?
      AND strftime('%m', d.data) = ?
      AND d.pago = 1
      AND d.categoria NOT IN ('administrativas', 'escritorio', 'material', 'marketing', 'vendas', 'publicidade', 'salarios')
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const totalDespesasOp = despesasAdministrativas + despesasComerciais + despesasOperacionais;
    
    const lucroOperacional = lucroBruto - totalDespesasOp;
    
    // Despesas com Pessoal DO MÊS (Folha + Encargos)
    // Buscar despesas de salários registradas (valor líquido pago)
    const despesasSalariosLiquidos = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas
      WHERE strftime('%Y', data) = ?
      AND strftime('%m', data) = ?
      AND categoria = 'salarios'
      AND pago = 1
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    // Buscar INSS Patronal registrado
    const despesasINSSPatronal = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas
      WHERE strftime('%Y', data) = ?
      AND strftime('%m', data) = ?
      AND categoria = 'inss_patronal'
      AND pago = 1
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    // Buscar dados da folha calculada para detalhamento
    const folhaDetalhada = db.prepare(`
      SELECT 
        SUM(salario_base) as total_salario_base,
        SUM(salario_bruto) as total_salario_bruto,
        SUM(inss_empregado) as total_inss_empregado,
        SUM(inss_patronal) as total_inss_patronal,
        SUM(irt) as total_irt,
        SUM(salario_liquido) as total_salario_liquido,
        COUNT(*) as total_funcionarios
      FROM folhas_pagamento
      WHERE ano = ? AND mes = ?
    `).get(anoAtual, mesAtual);
    
    const temFolhaRegistrada = !!(folhaDetalhada
      && (folhaDetalhada.total_funcionarios > 0
        || folhaDetalhada.total_salario_liquido > 0
        || folhaDetalhada.total_salario_base > 0));

    let folhaPagamento = despesasSalariosLiquidos;
    let inssPatronal = despesasINSSPatronal;
    let dadosFolha = {
      tem_folha_registrada: temFolhaRegistrada,
      salario_base: folhaDetalhada?.total_salario_base || 0,
      salario_bruto: folhaDetalhada?.total_salario_bruto || 0,
      inss_empregado: folhaDetalhada?.total_inss_empregado || 0,
      irt: folhaDetalhada?.total_irt || 0,
      funcionarios: folhaDetalhada?.total_funcionarios || 0
    };

    // Se existir folha profissional calculada, usar os valores reais
    if (temFolhaRegistrada) {
      // DRE deve exibir CUSTO TOTAL (Bruto + Encargos), não apenas líquido
      folhaPagamento = folhaDetalhada.total_salario_bruto || 0;
      inssPatronal = folhaDetalhada.total_inss_patronal || 0;
    }

    // Se não houver registro de folha paga e nem folha calculada, estimar
    if (!temFolhaRegistrada && despesasSalariosLiquidos === 0) {
      const salariosTotais = db.prepare(`
        SELECT SUM(salario_base) as total, COUNT(*) as qtd
        FROM funcionarios
        WHERE ativo = 1
      `).get();
      
      const salarioBase = salariosTotais.total || 0;
      folhaPagamento = salarioBase * 0.87; // Estimativa: 13% de descontos médios
      inssPatronal = salarioBase * 0.08;
      
      dadosFolha = {
        tem_folha_registrada: false,
        salario_base: salarioBase,
        inss_empregado: salarioBase * 0.03,
        irt: salarioBase * 0.10,
        funcionarios: salariosTotais.qtd || 0
      };
    }
    
    const lucroAntesImpostos = lucroOperacional - folhaPagamento - inssPatronal;
    
    const irtPercentual = Number(config.irt_estimado_percentual || 0);
    const impostoSeloPercentual = Number(config.imposto_selo_percentual || 0);
    const impostoSeloLimite = Number(config.imposto_selo_limite_faturacao || 0);

    // IRT estimado configurável
    let irt = 0;
    if (lucroAntesImpostos > 0 && irtPercentual > 0) {
      irt = lucroAntesImpostos * (irtPercentual / 100);
    }

    // Imposto de selo (baseado na faturação, quando aplicável)
    let impostoSelo = 0;
    const faturacaoBase = receitaBrutaComIVA;
    const aplicaSelo = impostoSeloPercentual > 0 && (impostoSeloLimite <= 0 || faturacaoBase >= impostoSeloLimite);
    if (aplicaSelo) {
      impostoSelo = faturacaoBase * (impostoSeloPercentual / 100);
    }
    
    const lucroLiquido = lucroAntesImpostos - irt - impostoSelo;
    
    // Margem de Lucro
    const margemBruta = receitaBruta > 0 ? ((lucroBruto / receitaBruta) * 100) : 0;
    const margemOperacional = receitaBruta > 0 ? ((lucroOperacional / receitaBruta) * 100) : 0;
    const margemLiquida = receitaBruta > 0 ? ((lucroLiquido / receitaBruta) * 100) : 0;
    
    res.json({
      success: true,
      periodo: { mes: mesAtual, ano: anoAtual },
      dre: {
        // 1. RECEITAS
        receita_bruta_com_iva: receitaBrutaComIVA.toFixed(2),
        iva_recolhido: ivaRecolhido.toFixed(2),
        receita_bruta: receitaBruta.toFixed(2),
        deducoes: deducoes.toFixed(2),
        receita_liquida: receitaLiquida.toFixed(2),
        
        // 2. CUSTOS
        cmv: cmv.toFixed(2),
        lucro_bruto: lucroBruto.toFixed(2),
        margem_bruta: margemBruta.toFixed(2) + '%',
        
        // 3. DESPESAS OPERACIONAIS
        despesas_operacionais: {
          administrativas: despesasAdministrativas.toFixed(2),
          comerciais: despesasComerciais.toFixed(2),
          operacionais: despesasOperacionais.toFixed(2),
          total: totalDespesasOp.toFixed(2)
        },
        lucro_operacional: lucroOperacional.toFixed(2),
        margem_operacional: margemOperacional.toFixed(2) + '%',
        
        // 4. DESPESAS COM PESSOAL
        despesas_pessoal: {
          salarios_liquidos: folhaPagamento.toFixed(2),
          inss_patronal: inssPatronal.toFixed(2),
          total_custo_pessoal: (folhaPagamento + inssPatronal).toFixed(2),
          detalhamento: {
            salario_base_total: dadosFolha.salario_base.toFixed(2),
            inss_empregado: dadosFolha.inss_empregado.toFixed(2),
            irt_retido: dadosFolha.irt.toFixed(2),
            total_funcionarios: dadosFolha.funcionarios,
            folha_registrada: dadosFolha.tem_folha_registrada
          }
        },
        
        // 5. RESULTADO
        lucro_antes_impostos: lucroAntesImpostos.toFixed(2),
        irt_estimado: irt.toFixed(2),
        irt_estimado_percentual: irtPercentual,
        imposto_selo: impostoSelo.toFixed(2),
        imposto_selo_percentual: impostoSeloPercentual,
        imposto_selo_limite_faturacao: impostoSeloLimite,
        lucro_liquido: lucroLiquido.toFixed(2),
        margem_liquida: margemLiquida.toFixed(2) + '%'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar DRE',
      error: error.message
    });
  }
});

// Gestão de Capital de Giro
router.get('/capital-giro', (req, res) => {
  try {
    const config = ensureFinanceConfig();
    
    // Lucro do mês atual
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    
    const receitas = db.prepare(`
      SELECT SUM(total) as total
      FROM vendas
      WHERE strftime('%Y', data_venda) = ?
      AND strftime('%m', data_venda) = ?
      AND status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const despesas = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas
      WHERE strftime('%Y', data) = ?
      AND strftime('%m', data) = ?
      AND pago = 1
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const custos = db.prepare(`
      SELECT SUM(p.custo_unitario * i.quantidade) as total
      FROM itens_venda i
      JOIN vendas v ON i.venda_id = v.id
      JOIN produtos p ON i.produto_id = p.id
      WHERE strftime('%Y', v.data_venda) = ?
      AND strftime('%m', v.data_venda) = ?
      AND v.status = 'concluida'
    `).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0')).total || 0;
    
    const lucroLiquido = receitas - despesas - custos;
    
    // Distribuição conforme configuração
    const capitalPercent = Number(config.capital_giro_percentual ?? 40);
    const reservaPercent = Number(config.fundo_reserva_percentual ?? 10);
    const distribuicaoPercent = Number(config.distribuicao_lucro_percentual ?? 50);
    const capitalGiro = (lucroLiquido * capitalPercent) / 100;
    const fundoReserva = (lucroLiquido * reservaPercent) / 100;
    const distribuicaoLucro = (lucroLiquido * distribuicaoPercent) / 100;
    
    res.json({
      success: true,
      mes_referencia: { mes: mesAtual, ano: anoAtual },
      lucro_liquido: lucroLiquido.toFixed(2),
      distribuicao: {
        capital_giro: {
          percentual: capitalPercent + '%',
          valor: capitalGiro.toFixed(2),
          finalidade: 'Financiar operações diárias, compra de estoque'
        },
        fundo_reserva: {
          percentual: reservaPercent + '%',
          valor: fundoReserva.toFixed(2),
          finalidade: 'Emergências e imprevistos'
        },
        distribuicao_lucro: {
          percentual: distribuicaoPercent + '%',
          valor: distribuicaoLucro.toFixed(2),
          finalidade: 'Retirada dos sócios/reinvestimento'
        }
      },
      total_distribuido: (capitalGiro + fundoReserva + distribuicaoLucro).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular capital de giro',
      error: error.message
    });
  }
});

// Precificação Inteligente
router.post('/precificacao', (req, res) => {
  try {
    const { produto_id, margem_desejada } = req.body;
    
    if (!produto_id) {
      return res.status(400).json({
        success: false,
        message: 'produto_id é obrigatório'
      });
    }
    
    // Buscar produto
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    // Buscar configuração financeira
    const config = ensureFinanceConfig();
    const margemMinima = config.margem_minima;
    const margemAplicar = margem_desejada || margemMinima;
    
    if (margemAplicar < margemMinima) {
      return res.status(400).json({
        success: false,
        message: `Margem mínima permitida: ${margemMinima}%`
      });
    }
    
    // Calcular despesas fixas por produto (rateio simples)
    const despesasFixasMes = db.prepare(`
      SELECT SUM(valor) as total
      FROM despesas
      WHERE strftime('%Y-%m', data) = strftime('%Y-%m', 'now')
      AND categoria IN ('aluguel', 'energia', 'agua', 'internet', 'salarios')
    `).get().total || 0;
    
    const totalProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos WHERE ativo = 1').get().total || 1;
    const despesasRateio = despesasFixasMes / totalProdutos;
    
    // Fórmula: Preço = (Custo + Despesas Rateadas) * (1 + Margem/100)
    const custoTotal = produto.custo_unitario + despesasRateio;
    const precoSugerido = custoTotal * (1 + margemAplicar / 100);
    
    // Análise de mercado (simulação com produtos similares)
    const produtosSimilares = db.prepare(`
      SELECT AVG(preco_venda) as preco_medio, MIN(preco_venda) as preco_min, MAX(preco_venda) as preco_max
      FROM produtos
      WHERE categoria = ? AND id != ? AND ativo = 1
    `).get(produto.categoria, produto_id);
    
    let recomendacao = 'Preço competitivo';
    if (produtosSimilares.preco_medio && precoSugerido > produtosSimilares.preco_max * 1.1) {
      recomendacao = 'ALERTA: Preço acima do mercado. Considere reduzir margem.';
    } else if (produtosSimilares.preco_medio && precoSugerido < produtosSimilares.preco_min * 0.9) {
      recomendacao = 'ATENÇÃO: Preço muito baixo. Verifique custos.';
    }
    
    res.json({
      success: true,
      produto: {
        id: produto.id,
        nome: produto.nome,
        custo_unitario: produto.custo_unitario.toFixed(2),
        preco_atual: produto.preco_venda.toFixed(2)
      },
      calculo: {
        custo_produto: produto.custo_unitario.toFixed(2),
        despesas_rateadas: despesasRateio.toFixed(2),
        custo_total: custoTotal.toFixed(2),
        margem_aplicada: margemAplicar + '%',
        preco_sugerido: precoSugerido.toFixed(2)
      },
      mercado: {
        preco_medio: produtosSimilares.preco_medio?.toFixed(2) || 'N/A',
        preco_min: produtosSimilares.preco_min?.toFixed(2) || 'N/A',
        preco_max: produtosSimilares.preco_max?.toFixed(2) || 'N/A',
        recomendacao
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular precificação',
      error: error.message
    });
  }
});

// Listar despesas
router.get('/despesas', (req, res) => {
  try {
    const { categoria, data_inicio, data_fim, pago } = req.query;
    
    let sql = 'SELECT * FROM despesas WHERE 1=1';
    const params = [];
    
    if (categoria) {
      sql += ' AND categoria = ?';
      params.push(categoria);
    }
    
    if (data_inicio) {
      sql += ' AND date(data) >= date(?)';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      sql += ' AND date(data) <= date(?)';
      params.push(data_fim);
    }
    
    if (pago !== undefined) {
      sql += ' AND pago = ?';
      params.push(pago === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY data DESC';
    
    const despesas = db.prepare(sql).all(...params);
    
    res.json({
      success: true,
      total: despesas.length,
      data: despesas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar despesas',
      error: error.message
    });
  }
});

// Criar despesa
router.post('/despesas', (req, res) => {
  try {
    const { tipo, categoria, descricao, valor, data, recorrente, pago, observacoes } = req.body;
    
    if (!tipo || !categoria || !valor) {
      return res.status(400).json({
        success: false,
        message: 'Tipo, categoria e valor são obrigatórios'
      });
    }
    
    const result = db.prepare(`
      INSERT INTO despesas 
      (tipo, categoria, descricao, valor, data, recorrente, pago, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tipo,
      categoria,
      descricao || '',
      valor,
      data || new Date().toISOString(),
      recorrente ? 1 : 0,
      pago ? 1 : 0,
      observacoes || ''
    );
    
    res.status(201).json({
      success: true,
      message: 'Despesa registrada com sucesso!',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar despesa',
      error: error.message
    });
  }
});

// GET Configuração Financeira
router.get('/config', (req, res) => {
  try {
    const config = ensureFinanceConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração',
      error: error.message
    });
  }
});

// POST Atualizar Configuração Financeira (compatibilidade)
router.post('/config', (req, res) => {
  try {
    ensureFinanceConfig();
    const { inss_empregado, inss_patronal } = req.body;
    
    db.prepare(`
      UPDATE config_financeira 
      SET inss_empregado = ?, inss_patronal = ?, atualizado_em = datetime('now', 'localtime') 
      WHERE id = 1
    `).run(inss_empregado || 3, inss_patronal || 8);
    
    const config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
    
    res.json({
      success: true,
      message: 'Configuração salva com sucesso!',
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração',
      error: error.message
    });
  }
});

// PUT Atualizar Configuração Financeira
router.put('/config', (req, res) => {
  try {
    ensureFinanceConfig();
    const updates = { ...req.body };
    // Compatibilidade com payloads em camelCase
    if (updates.irtEstimadoPercentual !== undefined) {
      updates.irt_estimado_percentual = updates.irtEstimadoPercentual;
    }
    if (updates.impostoSeloPercentual !== undefined) {
      updates.imposto_selo_percentual = updates.impostoSeloPercentual;
    }
    if (updates.impostoSeloLimite !== undefined) {
      updates.imposto_selo_limite_faturacao = updates.impostoSeloLimite;
    }
    const allowedFields = [
      'margem_minima',
      'capital_giro_percentual',
      'fundo_reserva_percentual',
      'distribuicao_lucro_percentual',
      'inss_empregado',
      'inss_patronal',
      'irt_estimado_percentual',
      'imposto_selo_percentual',
      'imposto_selo_limite_faturacao',
      'regime_iva',
      'regime_iva_observacao'
    ];
    
    // Filtrar apenas campos permitidos
    const validUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        validUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido para atualizar',
        receivedKeys: Object.keys(updates || {}),
        allowedFields
      });
    }
    
    // Construir query de atualização
    const setClause = Object.keys(validUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(validUpdates);
    
    db.prepare(`UPDATE config_financeira SET ${setClause}, atualizado_em = datetime('now', 'localtime') WHERE id = 1`).run(...values);
    
    // Invalidar cache do IvaService se regime_iva foi atualizado
    if (validUpdates.regime_iva) {
      IvaService.invalidateCache();
    }
    
    const updatedConfig = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
    
    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso!',
      data: updatedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração',
      error: error.message
    });
  }
});

module.exports = router;
