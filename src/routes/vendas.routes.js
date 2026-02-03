const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth.middleware');
const IvaService = require('../services/iva.service');

// Ajusta a estrutura caso esteja em versões antigas do banco
const ensureFiscalColumns = (() => {
  const vendasColumns = db.prepare('PRAGMA table_info(vendas)').all().map(col => col.name);
  if (!vendasColumns.includes('regime_iva')) {
    db.prepare("ALTER TABLE vendas ADD COLUMN regime_iva TEXT DEFAULT 'normal'").run();
  }
  if (!vendasColumns.includes('sujeito_iva')) {
    db.prepare('ALTER TABLE vendas ADD COLUMN sujeito_iva INTEGER DEFAULT 1').run();
  }
})();

// Auth temporariamente removida para testes
// router.use(authMiddleware);

// Listar vendas
router.get('/', (req, res) => {
  try {
    const { data_inicio, data_fim, cliente_id, status } = req.query;
    const userRole = req.user ? (req.user.role || req.user.funcao) : 'admin';
    
    let sql = `
      SELECT v.*, c.nome as cliente_nome, u.nome as vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    // Se for funcionário, mostrar apenas vendas do dia dele
    if (userRole === 'funcionario' && req.user) {
      sql += ' AND v.usuario_id = ?';
      params.push(req.user.id);
      sql += ' AND date(v.data_venda) = date(\'now\', \'localtime\')';
    } else {
      // Admin e gerente veem todas
      if (data_inicio) {
        sql += ' AND date(v.data_venda) >= date(?)';
        params.push(data_inicio);
      }
      
      if (data_fim) {
        sql += ' AND date(v.data_venda) <= date(?)';
        params.push(data_fim);
      }
    }
    
    if (cliente_id) {
      sql += ' AND v.cliente_id = ?';
      params.push(cliente_id);
    }
    
    if (status) {
      sql += ' AND v.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY v.data_venda DESC';
    
    const vendas = db.prepare(sql).all(...params);
    
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
    
    res.json({
      success: true,
      total: vendas.length,
      data: vendas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar vendas',
      error: error.message
    });
  }
});

// Relatório de vendas por período (precisa vir antes de rotas com parâmetros)
router.get('/relatorios/periodo', (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: 'Data de início e fim são obrigatórias'
      });
    }
    
    const resumo = db.prepare(`
      SELECT 
        COUNT(*) as total_vendas,
        SUM(total) as receita_total,
        SUM(desconto) as descontos_total,
        AVG(total) as ticket_medio
      FROM vendas
      WHERE date(data_venda) BETWEEN date(?) AND date(?)
      AND status = 'concluida'
    `).get(data_inicio, data_fim);
    
    const porPagamento = db.prepare(`
      SELECT 
        tipo_pagamento,
        COUNT(*) as quantidade,
        SUM(total) as valor_total
      FROM vendas
      WHERE date(data_venda) BETWEEN date(?) AND date(?)
      AND status = 'concluida'
      GROUP BY tipo_pagamento
    `).all(data_inicio, data_fim);
    
    const produtosMaisVendidos = db.prepare(`
      SELECT 
        p.nome,
        SUM(i.quantidade) as quantidade_vendida,
        SUM(i.subtotal) as receita_gerada
      FROM itens_venda i
      JOIN vendas v ON i.venda_id = v.id
      LEFT JOIN produtos p ON i.produto_id = p.id
      WHERE date(v.data_venda) BETWEEN date(?) AND date(?)
      AND v.status = 'concluida'
      AND p.id IS NOT NULL
      GROUP BY p.id, p.nome
      ORDER BY quantidade_vendida DESC
      LIMIT 10
    `).all(data_inicio, data_fim);
    
    res.json({
      success: true,
      periodo: { data_inicio, data_fim },
      resumo,
      por_pagamento: porPagamento,
      produtos_mais_vendidos: produtosMaisVendidos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message
    });
  }
});

// Buscar venda por ID (com itens)
router.get('/:id', (req, res) => {
  try {
    const venda = db.prepare(`
      SELECT v.*, c.nome as cliente_nome, u.nome as vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `).get(req.params.id);
    
    if (!venda) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada'
      });
    }
    
    const itens = db.prepare(`
      SELECT i.*, p.nome as produto_nome, r.nome as receita_nome
      FROM itens_venda i
      LEFT JOIN produtos p ON i.produto_id = p.id
      LEFT JOIN receitas r ON i.receita_id = r.id
      WHERE i.venda_id = ?
    `).all(req.params.id);
    
    venda.itens = itens;
    
    res.json({
      success: true,
      data: venda
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar venda',
      error: error.message
    });
  }
});

// Registrar nova venda
router.post('/', (req, res) => {
  try {
    const {
      cliente_id,
      usuario_id,
      itens,
      desconto,
      tipo_pagamento,
      observacoes
    } = req.body;
    
    // Validação
    if (!itens || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A venda deve conter pelo menos um item'
      });
    }
    
    // Iniciar transação
    const insertVenda = db.transaction((vendaData) => {
      // Preparar itens com preços
      const itensComPreco = [];
      
      for (const item of vendaData.itens) {
        if (!item.produto_id && !item.receita_id) {
          throw new Error('Item deve ter produto_id ou receita_id');
        }
        
        // Buscar preço do produto ou receita
        let preco;
        if (item.produto_id) {
          const produto = db.prepare('SELECT preco_venda FROM produtos WHERE id = ?').get(item.produto_id);
          if (!produto) throw new Error(`Produto ${item.produto_id} não encontrado`);
          preco = produto.preco_venda;
        } else {
          const receita = db.prepare('SELECT custo_total FROM receitas WHERE id = ?').get(item.receita_id);
          if (!receita) throw new Error(`Receita ${item.receita_id} não encontrada`);
          preco = receita.custo_total * 1.5; // Margem padrão de 50%
        }
        
        itensComPreco.push({
          ...item,
          preco_unitario: preco
        });
      }
      
      // Calcular IVA automaticamente usando o serviço
      const calculoIva = IvaService.calcularIvaVenda(itensComPreco);
      
      // Aplicar desconto se houver
      const descontoValor = vendaData.desconto || 0;
      let resultadoFinal = calculoIva;
      
      if (descontoValor > 0) {
        resultadoFinal = IvaService.aplicarDesconto(
          calculoIva.subtotal,
          calculoIva.total_iva,
          descontoValor,
          'valor'
        );
      }
      
      const subtotal = resultadoFinal.subtotal || calculoIva.subtotal;
      const valorIva = resultadoFinal.iva_com_desconto || calculoIva.total_iva;
      const total = resultadoFinal.total_final || calculoIva.total_com_iva;
      const regimeIvaAtual = calculoIva.regime_iva || 'normal';
      const sujeitoIvaFlag = regimeIvaAtual === 'exclusao' ? 0 : 1;
      
      // Inserir venda
      const insertVendaStmt = db.prepare(`
        INSERT INTO vendas (
          cliente_id,
          usuario_id,
          data_venda,
          subtotal,
          desconto,
          total,
          tipo_pagamento,
          status,
          observacoes,
          taxa_iva,
          valor_iva,
          regime_iva,
          sujeito_iva
        ) VALUES (?, ?, datetime('now','localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const vendaResult = insertVendaStmt.run(
        vendaData.cliente_id || null,
        vendaData.usuario_id || null,
        subtotal,
        descontoValor,
        total,
        vendaData.tipo_pagamento || 'dinheiro',
        'concluida',
        vendaData.observacoes || null,
        (calculoIva.resumo_iva && calculoIva.resumo_iva[0]) ? calculoIva.resumo_iva[0].taxa_iva : 0,
        valorIva,
        regimeIvaAtual,
        sujeitoIvaFlag
      );

      const vendaId = vendaResult.lastInsertRowid;

      // Inserir itens
      const insertItemStmt = db.prepare(`
        INSERT INTO itens_venda (
          venda_id,
          produto_id,
          receita_id,
          descricao,
          quantidade,
          preco_unitario,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      calculoIva.itens.forEach((itemDetalhado) => {
        insertItemStmt.run(
          vendaId,
          itemDetalhado.produto_id || null,
          itemDetalhado.receita_id || null,
          itemDetalhado.produto_nome || itemDetalhado.descricao || 'Item',
          itemDetalhado.quantidade,
          itemDetalhado.preco_unitario,
          itemDetalhado.subtotal
        );
      });

      return {
        vendaId,
        subtotal,
        descontoValor,
        valorIva,
        total,
        regimeIva: regimeIvaAtual,
        detalhes_iva: calculoIva.resumo_iva,
        itens_detalhados: calculoIva.itens
      };
    });

    const resultado = insertVenda({
      cliente_id,
      usuario_id,
      itens,
      desconto,
      tipo_pagamento,
      observacoes
    });

    res.status(201).json({
      success: true,
      message: 'Venda registrada com sucesso com IVA automático por categoria!',
      data: {
        venda_id: resultado.vendaId,
        subtotal: resultado.subtotal,
        desconto: resultado.descontoValor,
        valor_iva: resultado.valorIva,
        total: resultado.total,
        regime_iva: resultado.regimeIva,
        detalhes_iva: resultado.detalhes_iva,
        itens_processados: resultado.itens_detalhados.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar venda',
      error: error.message
    });
  }
});

// Calcular IVA (preview antes de confirmar venda)
router.post('/calcular-iva', (req, res) => {
  try {
    const { itens, desconto } = req.body;
    
    if (!itens || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de itens é obrigatória'
      });
    }
    
    // Preparar itens com preços
    const itensComPreco = [];
    
    for (const item of itens) {
      if (!item.produto_id) {
        return res.status(400).json({
          success: false,
          message: 'Todos os itens devem ter produto_id'
        });
      }
      
      // Buscar preço do produto
      const produto = db.prepare('SELECT preco_venda FROM produtos WHERE id = ?').get(item.produto_id);
      if (!produto) {
        return res.status(404).json({
          success: false,
          message: `Produto ${item.produto_id} não encontrado`
        });
      }
      
      itensComPreco.push({
        ...item,
        preco_unitario: produto.preco_venda
      });
    }
    
    // Calcular IVA
    const calculoIva = IvaService.calcularIvaVenda(itensComPreco);
    
    // Aplicar desconto se houver
    let resultadoFinal = calculoIva;
    if (desconto && desconto > 0) {
      resultadoFinal = IvaService.aplicarDesconto(
        calculoIva.subtotal,
        calculoIva.total_iva,
        desconto,
        'valor'
      );
    }
    
    res.json({
      success: true,
      message: 'IVA calculado automaticamente por categoria',
      data: {
        subtotal: calculoIva.subtotal,
        desconto_aplicado: desconto || 0,
        valor_iva: resultadoFinal.iva_com_desconto || calculoIva.total_iva,
        total_final: resultadoFinal.total_final || calculoIva.total_com_iva,
        resumo_iva: calculoIva.resumo_iva,
        itens_detalhados: calculoIva.itens,
        observacoes: 'IVA calculado automaticamente baseado na categoria fiscal de cada produto'
      }
    });
    
  } catch (error) {
    console.error('Erro ao calcular IVA:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular IVA',
      error: error.message
    });
  }
});

// Atualizar status da venda
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const statusValidos = ['pendente', 'concluida', 'cancelada'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: pendente, concluida ou cancelada'
      });
    }
    
    const venda = db.prepare('SELECT id FROM vendas WHERE id = ?').get(id);
    if (!venda) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada'
      });
    }
    
    db.prepare('UPDATE vendas SET status = ? WHERE id = ?').run(status, id);
    
    res.json({
      success: true,
      message: 'Status da venda atualizado com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status',
      error: error.message
    });
  }
});

// Relatório de vendas por período
router.get('/relatorios/periodo', (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: 'Data de início e fim são obrigatórias'
      });
    }
    
    const resumo = db.prepare(`
      SELECT 
        COUNT(*) as total_vendas,
        SUM(total) as receita_total,
        SUM(desconto) as descontos_total,
        AVG(total) as ticket_medio
      FROM vendas
      WHERE date(data_venda) BETWEEN date(?) AND date(?)
      AND status = 'concluida'
    `).get(data_inicio, data_fim);
    
    const porPagamento = db.prepare(`
      SELECT 
        tipo_pagamento,
        COUNT(*) as quantidade,
        SUM(total) as valor_total
      FROM vendas
      WHERE date(data_venda) BETWEEN date(?) AND date(?)
      AND status = 'concluida'
      GROUP BY tipo_pagamento
    `).all(data_inicio, data_fim);
    
    const produtosMaisVendidos = db.prepare(`
      SELECT 
        p.nome,
        SUM(i.quantidade) as quantidade_vendida,
        SUM(i.subtotal) as receita_gerada
      FROM itens_venda i
      JOIN vendas v ON i.venda_id = v.id
      LEFT JOIN produtos p ON i.produto_id = p.id
      WHERE date(v.data_venda) BETWEEN date(?) AND date(?)
      AND v.status = 'concluida'
      AND p.id IS NOT NULL
      GROUP BY p.id, p.nome
      ORDER BY quantidade_vendida DESC
      LIMIT 10
    `).all(data_inicio, data_fim);
    
    res.json({
      success: true,
      periodo: { data_inicio, data_fim },
      resumo,
      por_pagamento: porPagamento,
      produtos_mais_vendidos: produtosMaisVendidos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message
    });
  }
});

// Gerar recibo de compra em PDF
router.get('/:id/recibo', (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar venda
    const venda = db.prepare(`
      SELECT v.*, c.nome as cliente_nome, u.nome as vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `).get(id);
    
    if (!venda) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada'
      });
    }
    
    // Buscar itens da venda
    const itens = db.prepare(`
      SELECT i.*, p.nome as descricao
      FROM itens_venda i
      LEFT JOIN produtos p ON i.produto_id = p.id
      WHERE i.venda_id = ?
    `).all(id);
    
    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo-${id}.pdf"`);
    
    // Gerar PDF
    const pdfService = require('../services/pdf.service');
    pdfService.gerarReciboCompra(venda, itens, res);
    
  } catch (error) {
    console.error('Erro ao gerar recibo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar recibo',
      error: error.message
    });
  }
});

module.exports = router;
