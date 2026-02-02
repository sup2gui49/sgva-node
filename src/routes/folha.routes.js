const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const {
  shouldSyncFolhaToVendas,
  getModuleConfig
} = require('../config/module-flags');

// Helper para obter configuração financeira com valores padrão
const getFinanceConfig = () => {
  const config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get() || {};
  const inssEmpPercent = Number(config.inss_empregado ?? config.inss_empregado_percentual ?? 3);
  const inssPatPercent = Number(config.inss_patronal ?? config.inss_patronal_percentual ?? 8);
  return { config, inssEmpPercent, inssPatPercent };
};

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar funcionários - admin e gerente
router.get('/funcionarios', authorize('admin', 'gerente'), (req, res) => {
  try {
    const { ativo } = req.query;
    
    let sql = 'SELECT * FROM funcionarios WHERE 1=1';
    const params = [];
    
    if (ativo !== undefined) {
      sql += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY nome';
    
    const funcionarios = db.prepare(sql).all(...params);
    
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

// Buscar funcionário por ID - admin e gerente
router.get('/funcionarios/:id', authorize('admin', 'gerente'), (req, res) => {
  try {
    const funcionario = db.prepare('SELECT * FROM funcionarios WHERE id = ?').get(req.params.id);
    
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

// Criar funcionário - apenas admin
router.post('/funcionarios', authorize('admin'), (req, res) => {
  try {
    const { nome, categoria, salario_base, data_admissao } = req.body;
    
    if (!nome || !categoria || !salario_base) {
      return res.status(400).json({
        success: false,
        message: 'Nome, categoria e salário base são obrigatórios'
      });
    }
    
    const result = db.prepare(`
      INSERT INTO funcionarios (nome, categoria, salario_base, data_admissao)
      VALUES (?, ?, ?, ?)
    `).run(
      nome,
      categoria,
      salario_base,
      data_admissao || new Date().toISOString().split('T')[0]
    );
    
    res.status(201).json({
      success: true,
      message: 'Funcionário cadastrado com sucesso!',
      data: {
        id: result.lastInsertRowid,
        nome,
        categoria,
        salario_base
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao cadastrar funcionário',
      error: error.message
    });
  }
});

// Atualizar funcionário - apenas admin
router.put('/funcionarios/:id', authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const funcionario = db.prepare('SELECT id FROM funcionarios WHERE id = ?').get(id);
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }
    
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE funcionarios SET ${setClause} WHERE id = ?`;
    
    db.prepare(sql).run(...values, id);
    
    res.json({
      success: true,
      message: 'Funcionário atualizado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar funcionário',
      error: error.message
    });
  }
});

// Calcular folha de pagamento - admin e gerente
router.post('/calcular', authorize('admin', 'gerente'), (req, res) => {
  try {
    const { mes, ano } = req.body;
    
    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }
    
    const { config, inssEmpPercent, inssPatPercent } = getFinanceConfig();
    
    // Buscar funcionários ativos
    const funcionarios = db.prepare('SELECT * FROM funcionarios WHERE ativo = 1').all();
    
    if (funcionarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum funcionário ativo encontrado'
      });
    }
    
    const folha = funcionarios.map(func => {
      const salarioBase = parseFloat(func.salario_base);
      
      // INSS Empregado
      const inssEmpregado = salarioBase * (inssEmpPercent / 100);
      
      // IRT (Imposto de Renda do Trabalho) - Simulação simplificada
      // Faixa 1: Até 100.000 MT = 10%
      // Faixa 2: 100.001 - 500.000 MT = 15%
      // Faixa 3: Acima de 500.000 MT = 20%
      let irt = 0;
      const salarioAnual = salarioBase * 12;
      
      if (salarioAnual <= 100000) {
        irt = (salarioBase * 0.10);
      } else if (salarioAnual <= 500000) {
        irt = (salarioBase * 0.15);
      } else {
        irt = (salarioBase * 0.20);
      }
      
      // Descontos totais
      const descontos = inssEmpregado + irt;
      
      // Salário líquido
      const salarioLiquido = salarioBase - descontos;
      
      // INSS Patronal (encargo da empresa)
      const inssPatronal = salarioBase * (inssPatPercent / 100);
      
      // Custo total para empresa
      const custoTotal = salarioBase + inssPatronal;
      
      return {
        funcionario_id: func.id,
        nome: func.nome,
        categoria: func.categoria,
        salario_base: salarioBase.toFixed(2),
        descontos: {
          inss_empregado: inssEmpregado.toFixed(2),
          irt: irt.toFixed(2),
          total_descontos: descontos.toFixed(2)
        },
        salario_liquido: salarioLiquido.toFixed(2),
        encargos_empresa: {
          inss_patronal: inssPatronal.toFixed(2)
        },
        custo_total_empresa: custoTotal.toFixed(2)
      };
    });
    
    // Totalizadores
    const totalSalarioBase = folha.reduce((sum, f) => sum + parseFloat(f.salario_base), 0);
    const totalDescontos = folha.reduce((sum, f) => sum + parseFloat(f.descontos.total_descontos), 0);
    const totalSalarioLiquido = folha.reduce((sum, f) => sum + parseFloat(f.salario_liquido), 0);
    const totalINSSPatronal = folha.reduce((sum, f) => sum + parseFloat(f.encargos_empresa.inss_patronal), 0);
    const totalCustoEmpresa = folha.reduce((sum, f) => sum + parseFloat(f.custo_total_empresa), 0);
    
    res.json({
      success: true,
      periodo: { mes, ano },
      folha_pagamento: folha,
      resumo: {
        total_funcionarios: funcionarios.length,
        total_salario_base: totalSalarioBase.toFixed(2),
        total_descontos: totalDescontos.toFixed(2),
        total_salario_liquido: totalSalarioLiquido.toFixed(2),
        total_inss_patronal: totalINSSPatronal.toFixed(2),
        total_custo_empresa: totalCustoEmpresa.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular folha de pagamento',
      error: error.message
    });
  }
});

// Confirmar/Pagar Folha - Registra despesa automaticamente
router.post('/confirmar-pagamento', authorize('admin'), (req, res) => {
  try {
    const { mes, ano, folha_pagamento, resumo } = req.body;
    
    console.log('📋 Confirmar pagamento:', { mes, ano, folhas: folha_pagamento?.length });
    
    if (!mes || !ano || !resumo || !folha_pagamento) {
      return res.status(400).json({
        success: false,
        message: 'Dados completos da folha são obrigatórios'
      });
    }
    
    const totalCustoEmpresa = parseFloat(resumo.total_custo_empresa);
    const totalSalarioLiquido = parseFloat(resumo.total_salario_liquido);
    const totalINSSPatronal = parseFloat(resumo.total_inss_patronal);
    const totalIRT = parseFloat(resumo.total_irt || 0);
    const totalINSSEmpregado = parseFloat(resumo.total_inss_empregado || 0);
    
    // Data do pagamento (último dia do mês)
    const dataPagamento = new Date(ano, mes, 0).toISOString().split('T')[0];
    
    const moduleConfig = req.moduleConfig || getModuleConfig();
    const syncWithVendas = shouldSyncFolhaToVendas(moduleConfig);

    let despesaSalariosId = null;
    let despesaInssId = null;

    if (syncWithVendas) {
      // Verificar se já existe despesa de salários para este mês/ano
      const existente = db.prepare(`
        SELECT id FROM despesas 
        WHERE categoria = 'salarios' 
        AND strftime('%Y', data) = ? 
        AND strftime('%m', data) = ?
      `).get(ano.toString(), mes.toString().padStart(2, '0'));

      if (existente) {
        return res.status(400).json({
          success: false,
          message: `Folha de ${mes}/${ano} já foi confirmada anteriormente`
        });
      }

      // Registrar despesa de Salários (valor líquido pago aos funcionários)
      const resultSalarios = db.prepare(`
        INSERT INTO despesas (tipo, categoria, descricao, valor, data, pago, observacoes)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        'fixa',
        'salarios',
        `Folha de Pagamento - ${mes}/${ano}`,
        totalSalarioLiquido,
        dataPagamento,
        `Salários pagos a ${resumo.total_funcionarios} funcionários. Base: ${resumo.total_salario_base} KZ`
      );

      // Registrar despesa de INSS Patronal (encargo da empresa - 8%)
      const resultINSSPatronal = db.prepare(`
        INSERT INTO despesas (tipo, categoria, descricao, valor, data, pago, observacoes)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        'fixa',
        'inss_patronal',
        `INSS Patronal - ${mes}/${ano}`,
        totalINSSPatronal,
        dataPagamento,
        `Contribuição patronal 8% sobre folha de ${mes}/${ano}`
      );

      despesaSalariosId = resultSalarios.lastInsertRowid;
      despesaInssId = resultINSSPatronal.lastInsertRowid;
    }
    
    // Verificar se já existe folha confirmada para este mês/ano
    const folhasExistentes = db.prepare(`
      SELECT COUNT(*) as total FROM folhas_pagamento 
      WHERE mes = ? AND ano = ?
    `).get(mes, ano);

    if (folhasExistentes.total > 0) {
      return res.status(400).json({
        success: false,
        message: `Já existe folha confirmada para ${mes}/${ano}. Para reprocessar, exclua a folha anterior primeiro.`
      });
    }
    
    // Salvar detalhes da folha por funcionário
    const insertFolha = db.prepare(`
      INSERT INTO folhas_pagamento (
        mes, ano, funcionario_id, salario_base, total_subsidios, 
        subsidios_isentos, subsidios_tributaveis, salario_bruto,
        inss_empregado, inss_patronal, deducao_fixa, rendimento_colectavel,
        irt, total_descontos, salario_liquido, calculado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const insertSubsidioDetalhe = db.prepare(`
      INSERT INTO folha_subsidios_detalhes (
        folha_id, subsidio_id, nome_subsidio, valor, valor_isento, valor_tributavel
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Preparar INSERT para status de pagamento
    const insertStatus = db.prepare(`
      INSERT OR REPLACE INTO folha_pagamentos_status (
        funcionario_id, mes, ano, status, valor_pago, pago_em
      ) VALUES (?, ?, ?, 'pago', ?, datetime('now', 'localtime'))
    `);
    
    let registrosInseridos = 0;
    folha_pagamento.forEach(func => {
      const salarioBase = parseFloat(func.salario_base || 0);
      const inssEmp = parseFloat(func.inss?.empregado || 0);
      const irt = parseFloat(func.irt?.valor || 0);
      const totalDesc = parseFloat(func.total_descontos || 0);
      const salarioLiq = parseFloat(func.salario_liquido || 0);
      const inssPatr = parseFloat(func.inss?.patronal || 0);
      const salarioBruto = parseFloat(func.salario_bruto || salarioBase);
      const rendCol = parseFloat(func.rendimento_colectavel || (salarioBase - inssEmp));
      const totalSubsidios = parseFloat(func.subsidios?.total || func.total_subsidios || 0);
      const subsidiosIsentos = parseFloat(func.subsidios?.isento || func.subsidios_isentos || 0);
      const subsidiosTrib = parseFloat(func.subsidios?.tributavel || func.subsidios_tributaveis || 0);
      const deducaoFixa = parseFloat(func.deducao_fixa || 0);
      const funcionarioId = func.funcionario?.id || func.funcionario_id;
      
      try {
        const resultInsert = insertFolha.run(
          mes, ano, funcionarioId, salarioBase, totalSubsidios,
          subsidiosIsentos, subsidiosTrib, salarioBruto,
          inssEmp, inssPatr, deducaoFixa, rendCol,
          irt, totalDesc, salarioLiq
        );
        const folhaRegistroId = resultInsert.lastInsertRowid;

        if (Array.isArray(func.subsidios?.detalhes)) {
          func.subsidios.detalhes.forEach(det => {
            insertSubsidioDetalhe.run(
              folhaRegistroId,
              det.id || det.subsidio_id || null,
              det.nome || det.nome_subsidio || 'Subsídio',
              parseFloat(det.valor || 0),
              parseFloat(det.isento ?? det.valor_isento ?? 0),
              parseFloat(det.tributavel ?? det.valor_tributavel ?? 0)
            );
          });
        }
        
        // Registrar status de pagamento
        insertStatus.run(funcionarioId, mes, ano, salarioLiq);
        console.log(`✅ Status registrado: func=${funcionarioId}, mes=${mes}, ano=${ano}`);
        
        registrosInseridos++;
      } catch (e) {
        console.error(`Erro ao inserir folha do funcionário ${func.funcionario?.nome || funcionarioId}:`, e.message);
      }
    });
    
    res.json({
      success: true,
      message: syncWithVendas
        ? `Folha de pagamento de ${mes}/${ano} confirmada! Despesas registradas no sistema de vendas.`
        : `Folha de pagamento de ${mes}/${ano} confirmada. Integração com vendas está desativada.` ,
      data: {
        integracao: {
          ativo: syncWithVendas,
          modo: moduleConfig.integracao_modo
        },
        despesa_salarios_id: despesaSalariosId,
        despesa_inss_patronal_id: despesaInssId,
        funcionarios_processados: registrosInseridos,
        valores: {
          salarios_liquidos: totalSalarioLiquido.toFixed(2),
          inss_patronal: totalINSSPatronal.toFixed(2),
          custo_total_empresa: totalCustoEmpresa.toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao confirmar pagamento da folha',
      error: error.message
    });
  }
});

// Relatório de folha para exportação - admin e gerente
router.get('/relatorio', authorize('admin', 'gerente'), (req, res) => {
  try {
    const { mes, ano } = req.query;
    
    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano são obrigatórios'
      });
    }
    
    const { inssEmpPercent, inssPatPercent } = getFinanceConfig();
    const funcionarios = db.prepare('SELECT * FROM funcionarios WHERE ativo = 1').all();
    
    const relatorio = funcionarios.map(func => {
      const salarioBase = parseFloat(func.salario_base);
      const inssEmpregado = salarioBase * (inssEmpPercent / 100);
      
      let irt = 0;
      const salarioAnual = salarioBase * 12;
      if (salarioAnual <= 100000) irt = salarioBase * 0.10;
      else if (salarioAnual <= 500000) irt = salarioBase * 0.15;
      else irt = salarioBase * 0.20;
      
      const descontos = inssEmpregado + irt;
      const salarioLiquido = salarioBase - descontos;
      const inssPatronal = salarioBase * (inssPatPercent / 100);
      
      return {
        nome: func.nome,
        categoria: func.categoria,
        data_admissao: func.data_admissao,
        salario_base: salarioBase.toFixed(2),
        inss_empregado: inssEmpregado.toFixed(2),
        irt: irt.toFixed(2),
        total_descontos: descontos.toFixed(2),
        salario_liquido: salarioLiquido.toFixed(2),
        inss_patronal: inssPatronal.toFixed(2)
      };
    });
    
    res.json({
      success: true,
      periodo: { mes, ano },
      empresa: 'SGVA - Sistema de Gestão de Vendas Adaptável',
      data_geracao: new Date().toISOString(),
      relatorio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message
    });
  }
});

// Simulação de folha (sem salvar)
router.post('/simular', (req, res) => {
  try {
    const { salario_base } = req.body;
    
    if (!salario_base) {
      return res.status(400).json({
        success: false,
        message: 'Salário base é obrigatório'
      });
    }
    
    const { inssEmpPercent, inssPatPercent } = getFinanceConfig();
    
    const salario = parseFloat(salario_base);
    const inssEmpregado = salario * (inssEmpPercent / 100);
    
    let irt = 0;
    const salarioAnual = salario * 12;
    if (salarioAnual <= 100000) irt = salario * 0.10;
    else if (salarioAnual <= 500000) irt = salario * 0.15;
    else irt = salario * 0.20;
    
    const descontos = inssEmpregado + irt;
    const salarioLiquido = salario - descontos;
    const inssPatronal = salario * (inssPatPercent / 100);
    const custoTotal = salario + inssPatronal;
    
    res.json({
      success: true,
      simulacao: {
        salario_base: salario.toFixed(2),
        descontos: {
          inss_empregado: `${inssEmpPercent}% = ${inssEmpregado.toFixed(2)}`,
          irt: `${irt.toFixed(2)}`,
          total: descontos.toFixed(2)
        },
        salario_liquido: salarioLiquido.toFixed(2),
        encargos_empresa: {
          inss_patronal: `${inssPatPercent}% = ${inssPatronal.toFixed(2)}`
        },
        custo_total_empresa: custoTotal.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao simular folha',
      error: error.message
    });
  }
});

module.exports = router;
