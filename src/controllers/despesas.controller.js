const DespesaModel = require('../models/despesa.model');

class DespesasController {
  // Listar todas as despesas
  static listar(req, res) {
    try {
      const { categoria, tipo, recorrente, pago, mes, ano } = req.query;
      
      const filtros = {
        ...(categoria && { categoria }),
        ...(tipo && { tipo }),
        ...(recorrente !== undefined && { recorrente: recorrente === 'true' }),
        ...(pago !== undefined && { pago: pago === 'true' }),
        ...(mes && ano && { mes: parseInt(mes), ano: parseInt(ano) })
      };

      const despesas = DespesaModel.findAll(filtros);

      return res.json({
        success: true,
        message: 'Despesas recuperadas com sucesso',
        data: despesas,
        total: despesas.length
      });
    } catch (error) {
      console.error('Erro ao listar despesas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar despesas',
        error: error.message
      });
    }
  }

  // Buscar despesa por ID
  static buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const despesa = DespesaModel.findById(id);

      if (!despesa) {
        return res.status(404).json({
          success: false,
          message: 'Despesa não encontrada'
        });
      }

      return res.json({
        success: true,
        data: despesa
      });
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar despesa',
        error: error.message
      });
    }
  }

  // Criar nova despesa
  static criar(req, res) {
    try {
      const { tipo, categoria, descricao, valor, data, recorrente, pago, observacoes } = req.body;

      // Validações
      if (!tipo || !descricao || !valor) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: tipo, descrição, valor'
        });
      }

      if (valor <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor deve ser maior que zero'
        });
      }

      const despesa = DespesaModel.create({
        tipo,
        categoria,
        descricao,
        valor: parseFloat(valor),
        data,
        recorrente,
        pago,
        observacoes
      });

      return res.status(201).json({
        success: true,
        message: 'Despesa criada com sucesso',
        data: despesa
      });
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar despesa',
        error: error.message
      });
    }
  }

  // Atualizar despesa
  static atualizar(req, res) {
    try {
      const { id } = req.params;
      const { tipo, categoria, descricao, valor, data, recorrente, pago, observacoes } = req.body;

      const despesaExistente = DespesaModel.findById(id);

      if (!despesaExistente) {
        return res.status(404).json({
          success: false,
          message: 'Despesa não encontrada'
        });
      }

      const despesaAtualizada = DespesaModel.update(id, {
        tipo: tipo || despesaExistente.tipo,
        categoria: categoria !== undefined ? categoria : despesaExistente.categoria,
        descricao: descricao || despesaExistente.descricao,
        valor: valor !== undefined ? parseFloat(valor) : despesaExistente.valor,
        data: data || despesaExistente.data,
        recorrente: recorrente !== undefined ? recorrente : despesaExistente.recorrente,
        pago: pago !== undefined ? pago : despesaExistente.pago,
        observacoes: observacoes !== undefined ? observacoes : despesaExistente.observacoes
      });

      return res.json({
        success: true,
        message: 'Despesa atualizada com sucesso',
        data: despesaAtualizada
      });
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar despesa',
        error: error.message
      });
    }
  }

  // Marcar despesa como paga
  static marcarComoPaga(req, res) {
    try {
      const { id } = req.params;

      const despesa = DespesaModel.togglePago(id);

      if (!despesa) {
        return res.status(404).json({
          success: false,
          message: 'Despesa não encontrada'
        });
      }

      return res.json({
        success: true,
        message: `Despesa marcada como ${despesa.pago ? 'paga' : 'não paga'}`,
        data: despesa
      });
    } catch (error) {
      console.error('Erro ao marcar despesa como paga:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao marcar despesa como paga',
        error: error.message
      });
    }
  }

  // Deletar despesa
  static deletar(req, res) {
    try {
      const { id } = req.params;

      const despesa = DespesaModel.findById(id);

      if (!despesa) {
        return res.status(404).json({
          success: false,
          message: 'Despesa não encontrada'
        });
      }

      const deletado = DespesaModel.delete(id);

      return res.json({
        success: true,
        message: 'Despesa deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao deletar despesa',
        error: error.message
      });
    }
  }

  // Obter resumo de despesas
  static resumo(req, res) {
    try {
      const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano) || new Date().getFullYear();

      const stats = DespesaModel.getEstatisticas(mes, ano);
      const porCategoria = DespesaModel.getPorCategoria(mes, ano);

      return res.json({
        success: true,
        periodo: { mes, ano },
        resumo: {
          total_despesas: stats.total_despesas || 0,
          valor_total: stats.valor_total || 0,
          valor_pago: stats.valor_pago || 0,
          valor_pendente: stats.valor_pendente || 0,
          despesas_recorrentes: stats.despesas_recorrentes || 0
        },
        por_categoria: porCategoria
      });
    } catch (error) {
      console.error('Erro ao obter resumo de despesas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter resumo',
        error: error.message
      });
    }
  }

  // Obter categorias disponíveis
  static categorias(req, res) {
    const categorias = [
      { valor: 'aluguel', nome: 'Aluguel' },
      { valor: 'agua', nome: 'Água' },
      { valor: 'luz', nome: 'Luz/Energia' },
      { valor: 'internet', nome: 'Internet' },
      { valor: 'telefone', nome: 'Telefone' },
      { valor: 'salarios', nome: 'Salários' },
      { valor: 'impostos', nome: 'Impostos' },
      { valor: 'fornecedores', nome: 'Fornecedores' },
      { valor: 'marketing', nome: 'Marketing' },
      { valor: 'manutencao', nome: 'Manutenção' },
      { valor: 'equipamentos', nome: 'Equipamentos' },
      { valor: 'transporte', nome: 'Transporte' },
      { valor: 'outras', nome: 'Outras' }
    ];

    return res.json({
      success: true,
      data: categorias
    });
  }
}

module.exports = DespesasController;
