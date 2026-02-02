const pdfService = require('../services/pdf.service');
const DespesaModel = require('../models/despesa.model');
const db = require('../config/database');

class RelatoriosController {
  // Relatório de Vendas
  async relatorioVendas(req, res) {
    try {
      const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano) || new Date().getFullYear();

      // Buscar vendas do período
      const vendas = db.prepare(`
        SELECT v.*, c.nome as cliente_nome, u.nome as vendedor_nome
        FROM vendas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE strftime('%Y-%m', v.data_venda) = ?
        ORDER BY v.data_venda DESC
      `).all(`${ano}-${String(mes).padStart(2, '0')}`);

      // Adicionar itens para cada venda
      vendas.forEach(venda => {
        const itens = db.prepare(`
          SELECT i.*, p.nome as descricao
          FROM itens_venda i
          LEFT JOIN produtos p ON i.produto_id = p.id
          WHERE i.venda_id = ?
        `).all(venda.id);
        venda.itens = itens;
      });

      // Configurar headers para visualização no browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="relatorio-vendas-${mes}-${ano}.pdf"`);

      // Gerar PDF diretamente na resposta
      await pdfService.gerarRelatorioVendas(vendas, { mes, ano }, res);
    } catch (error) {
      console.error('Erro ao gerar relatório de vendas:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar relatório',
          error: error.message
        });
      }
    }
  }

  // Relatório DRE
  async relatorioDRE(req, res) {
    try {
      const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano) || new Date().getFullYear();

      // Buscar dados do DRE
      const periodo = `${ano}-${String(mes).padStart(2, '0')}`;
      
      // Receita
      const receita = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM vendas
        WHERE strftime('%Y-%m', data_venda) = ?
      `).get(periodo);

      // CMV (Custo de Mercadoria Vendida)
      const cmv = db.prepare(`
        SELECT COALESCE(SUM(vi.quantidade * p.custo_unitario), 0) as total
        FROM itens_venda vi
        JOIN vendas v ON vi.venda_id = v.id
        JOIN produtos p ON vi.produto_id = p.id
        WHERE strftime('%Y-%m', v.data_venda) = ?
      `).get(periodo);

      // Despesas Operacionais - todas as despesas do período
      const despesasResult = db.prepare(`
        SELECT COALESCE(SUM(valor), 0) as total
        FROM despesas
        WHERE strftime('%Y-%m', data) = ?
      `).get(periodo);
      
      const despesasOp = despesasResult.total || 0;

      // Folha de Pagamento (baseada nos funcionários ativos)
      const folha = db.prepare(`
        SELECT COALESCE(SUM(salario_base), 0) as total
        FROM funcionarios
        WHERE ativo = 1
      `).get();

      const dre = {
        receita_bruta: receita.total || 0,
        deducoes: 0,
        receita_liquida: receita.total || 0,
        cmv: cmv.total || 0,
        lucro_bruto: (receita.total || 0) - (cmv.total || 0),
        despesas_operacionais: { total: despesasOp || 0 },
        lucro_operacional: (receita.total || 0) - (cmv.total || 0) - (despesasOp || 0),
        folha_pagamento: folha.total || 0,
        inss_patronal: (folha.total || 0) * 0.08,
        lucro_liquido: 0
      };

      dre.lucro_liquido = dre.lucro_operacional - dre.folha_pagamento - dre.inss_patronal;

      // Configurar headers para visualização no browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="relatorio-dre-${mes}-${ano}.pdf"`);

      // Gerar PDF diretamente na resposta
      await pdfService.gerarRelatorioDRE(dre, { mes, ano }, res);
    } catch (error) {
      console.error('Erro ao gerar relatório DRE:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar relatório',
          error: error.message
        });
      }
    }
  }

  // Relatório de Despesas
  async relatorioDespesas(req, res) {
    try {
      const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano) || new Date().getFullYear();

      const despesas = DespesaModel.findAll({ mes, ano });

      // Configurar headers para visualização no browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="relatorio-despesas-${mes}-${ano}.pdf"`);

      // Gerar PDF diretamente na resposta
      await pdfService.gerarRelatorioDespesas(despesas, { mes, ano }, res);
    } catch (error) {
      console.error('Erro ao gerar relatório de despesas:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar relatório',
          error: error.message
        });
      }
    }
  }

  // Relatório de Folha de Pagamento
  async relatorioFolha(req, res) {
    try {
      const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano) || new Date().getFullYear();

      // Buscar dados da folha
      const funcionarios = db.prepare(`
        SELECT * FROM funcionarios WHERE ativo = 1
      `).all();

      if (funcionarios.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum funcionário ativo encontrado'
        });
      }

      const folha_pagamento = funcionarios.map(func => {
        const inss = func.salario_base * 0.03;
        const irt = func.salario_base * 0.05;
        const total_descontos = inss + irt;
        const salario_liquido = func.salario_base - total_descontos;

        return {
          nome: func.nome,
          categoria: func.categoria,
          salario_base: func.salario_base,
          descontos: {
            inss,
            irt,
            total_descontos
          },
          salario_liquido,
          inss_patronal: func.salario_base * 0.08
        };
      });

      const resumo = {
        total_funcionarios: funcionarios.length,
        total_salario_base: folha_pagamento.reduce((sum, f) => sum + f.salario_base, 0),
        total_descontos: folha_pagamento.reduce((sum, f) => sum + f.descontos.total_descontos, 0),
        total_salario_liquido: folha_pagamento.reduce((sum, f) => sum + f.salario_liquido, 0),
        total_inss_patronal: folha_pagamento.reduce((sum, f) => sum + f.inss_patronal, 0),
        total_custo_empresa: 0
      };

      resumo.total_custo_empresa = resumo.total_salario_base + resumo.total_inss_patronal;

      // Configurar headers para visualização no browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="relatorio-folha-${mes}-${ano}.pdf"`);

      // Gerar PDF diretamente na resposta
      await pdfService.gerarRelatorioFolha(funcionarios, { mes, ano }, res);
    } catch (error) {
      console.error('Erro ao gerar relatório de folha:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar relatório',
          error: error.message
        });
      }
    }
  }

  // Download de relatório
  async download(req, res) {
    try {
      const { filename } = req.params;
      const filepath = require('path').join(__dirname, '../../reports', filename);

      // Verificar se arquivo existe
      if (!require('fs').existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          message: 'Relatório não encontrado'
        });
      }

      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Erro ao fazer download:', err);
          res.status(500).json({
            success: false,
            message: 'Erro ao fazer download do relatório'
          });
        }
      });
    } catch (error) {
      console.error('Erro no download:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer download',
        error: error.message
      });
    }
  }
}

module.exports = new RelatoriosController();
