const db = require('../config/database');

class DespesaModel {
  // Criar nova despesa (ajustado para estrutura real da tabela)
  static create(despesa) {
    const sql = `
      INSERT INTO despesas (tipo, categoria, descricao, valor, data, recorrente, pago, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const info = db.prepare(sql).run(
        despesa.tipo,
        despesa.categoria || null,
        despesa.descricao,
        despesa.valor,
        despesa.data || new Date().toISOString(),
        despesa.recorrente ? 1 : 0,
        despesa.pago !== undefined ? (despesa.pago ? 1 : 0) : 1,
        despesa.observacoes || null
      );
      
      // Se a categoria for "compras" ou "compra_produtos", aumentar o estoque
      if (despesa.categoria === 'compras' || despesa.categoria === 'compra_produtos') {
        // Extrair produto_id e quantidade da descrição (formato: "Compra: Nome do Produto - 100 un")
        // Ou podemos adicionar campos produto_id e quantidade à tabela despesas no futuro
        // Por enquanto, vamos procurar o produto pelo nome na descrição
        const match = despesa.descricao.match(/Compra:\s*(.+?)\s*-\s*(\d+)\s*un/i);
        if (match) {
          const nomeProduto = match[1];
          const quantidade = parseInt(match[2]);
          
          // Buscar produto
          const produto = db.prepare('SELECT id, estoque FROM produtos WHERE nome = ?').get(nomeProduto);
          if (produto) {
            // Aumentar estoque
            db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?').run(quantidade, produto.id);
            console.log(`✅ Estoque atualizado: ${nomeProduto} +${quantidade} un (total: ${produto.estoque + quantidade})`);
          }
        }
      }
      
      return this.findById(info.lastInsertRowid);
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      throw error;
    }
  }

  // Buscar todas as despesas
  static findAll(filtros = {}) {
    let sql = 'SELECT * FROM despesas WHERE 1=1';
    const params = [];

    if (filtros.tipo) {
      sql += ' AND tipo = ?';
      params.push(filtros.tipo);
    }

    if (filtros.categoria) {
      sql += ' AND categoria = ?';
      params.push(filtros.categoria);
    }

    if (filtros.recorrente !== undefined) {
      sql += ' AND recorrente = ?';
      params.push(filtros.recorrente ? 1 : 0);
    }

    if (filtros.pago !== undefined) {
      sql += ' AND pago = ?';
      params.push(filtros.pago ? 1 : 0);
    }

    if (filtros.data_inicio) {
      sql += ' AND date(data) >= date(?)';
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      sql += ' AND date(data) <= date(?)';
      params.push(filtros.data_fim);
    }

    if (filtros.mes && filtros.ano) {
      sql += " AND strftime('%Y-%m', data) = ?";
      params.push(`${filtros.ano}-${String(filtros.mes).padStart(2, '0')}`);
    }

    sql += ' ORDER BY data DESC';

    try {
      return db.prepare(sql).all(...params);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      throw error;
    }
  }

  // Buscar despesa por ID
  static findById(id) {
    const sql = 'SELECT * FROM despesas WHERE id = ?';
    
    try {
      return db.prepare(sql).get(id);
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      throw error;
    }
  }

  // Atualizar despesa
  static update(id, despesa) {
    const sql = `
      UPDATE despesas 
      SET tipo = ?, categoria = ?, descricao = ?, valor = ?, 
          data = ?, recorrente = ?, pago = ?, observacoes = ?
      WHERE id = ?
    `;
    
    try {
      db.prepare(sql).run(
        despesa.tipo,
        despesa.categoria || null,
        despesa.descricao,
        despesa.valor,
        despesa.data,
        despesa.recorrente ? 1 : 0,
        despesa.pago ? 1 : 0,
        despesa.observacoes || null,
        id
      );
      
      return this.findById(id);
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      throw error;
    }
  }

  // Marcar como paga/não paga
  static togglePago(id) {
    const despesa = this.findById(id);
    if (!despesa) return null;

    const sql = 'UPDATE despesas SET pago = ? WHERE id = ?';
    
    try {
      db.prepare(sql).run(despesa.pago ? 0 : 1, id);
      return this.findById(id);
    } catch (error) {
      console.error('Erro ao alternar status de pagamento:', error);
      throw error;
    }
  }

  // Deletar despesa
  static delete(id) {
    const sql = 'DELETE FROM despesas WHERE id = ?';
    
    try {
      const info = db.prepare(sql).run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      throw error;
    }
  }

  // Obter total de despesas por período
  static getTotalPorPeriodo(mes, ano, apenasParas = false) {
    let sql = `
      SELECT SUM(valor) as total
      FROM despesas
      WHERE strftime('%Y-%m', data) = ?
    `;

    if (apenasParas) {
      sql += ' AND pago = 1';
    }
    
    try {
      const periodo = `${ano}-${String(mes).padStart(2, '0')}`;
      const result = db.prepare(sql).get(periodo);
      return result.total || 0;
    } catch (error) {
      console.error('Erro ao obter total de despesas:', error);
      throw error;
    }
  }

  // Obter despesas por categoria
  static getPorCategoria(mes, ano) {
    const sql = `
      SELECT 
        categoria,
        tipo,
        SUM(valor) as total,
        COUNT(*) as quantidade
      FROM despesas
      WHERE strftime('%Y-%m', data) = ?
      GROUP BY categoria, tipo
      ORDER BY total DESC
    `;
    
    try {
      const periodo = `${ano}-${String(mes).padStart(2, '0')}`;
      return db.prepare(sql).all(periodo);
    } catch (error) {
      console.error('Erro ao obter despesas por categoria:', error);
      throw error;
    }
  }

  // Obter despesas recorrentes
  static getRecorrentes() {
    const sql = 'SELECT * FROM despesas WHERE recorrente = 1 ORDER BY data DESC';
    
    try {
      return db.prepare(sql).all();
    } catch (error) {
      console.error('Erro ao obter despesas recorrentes:', error);
      throw error;
    }
  }

  // Obter despesas não pagas
  static getNaoPagas() {
    const sql = 'SELECT * FROM despesas WHERE pago = 0 ORDER BY data ASC';
    
    try {
      return db.prepare(sql).all();
    } catch (error) {
      console.error('Erro ao obter despesas não pagas:', error);
      throw error;
    }
  }

  // Estatísticas de despesas
  static getEstatisticas(mes, ano) {
    const sql = `
      SELECT 
        COUNT(*) as total_despesas,
        SUM(valor) as valor_total,
        SUM(CASE WHEN pago = 1 THEN valor ELSE 0 END) as valor_pago,
        SUM(CASE WHEN pago = 0 THEN valor ELSE 0 END) as valor_pendente,
        COUNT(CASE WHEN recorrente = 1 THEN 1 END) as despesas_recorrentes
      FROM despesas
      WHERE strftime('%Y-%m', data) = ?
    `;
    
    try {
      const periodo = `${ano}-${String(mes).padStart(2, '0')}`;
      return db.prepare(sql).get(periodo);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

module.exports = DespesaModel;
