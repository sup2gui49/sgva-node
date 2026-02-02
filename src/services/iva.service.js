const db = require('../config/database');

// Garantir que a tabela de configuração possua campos referentes ao regime de IVA
const ensureConfigColumns = (() => {
  const columns = db.prepare('PRAGMA table_info(config_financeira)').all().map(col => col.name);

  if (!columns.includes('regime_iva')) {
    db.prepare("ALTER TABLE config_financeira ADD COLUMN regime_iva TEXT DEFAULT 'normal'").run();
    db.prepare("UPDATE config_financeira SET regime_iva = 'normal' WHERE regime_iva IS NULL").run();
  }

  if (!columns.includes('regime_iva_observacao')) {
    db.prepare('ALTER TABLE config_financeira ADD COLUMN regime_iva_observacao TEXT').run();
  }
})();

class IvaService {
    static getConfig() {
        if (!this._configCache || Date.now() - this._configCache.timestamp > 60000) {
            const config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get() || {};
            this._configCache = { timestamp: Date.now(), data: config };
        }
        return this._configCache.data;
    }

    static invalidateCache() {
        this._configCache = null;
    }

    static getRegimeIva() {
        const config = this.getConfig();
        return (config && config.regime_iva) ? config.regime_iva : 'normal';
    }

    static isIvaEnabled() {
        return this.getRegimeIva() !== 'exclusao';
    }
    
    /**
     * Calcular IVA automaticamente para um produto baseado em sua categoria
     * @param {number} produtoId - ID do produto
     * @param {number} valor - Valor base para cálculo do IVA
     * @returns {Object} - {taxa_iva, valor_iva, sujeito_iva, categoria_nome}
     */
    static calcularIvaProduto(produtoId, valor) {
        // Buscar produto e sua categoria
        const query = `
            SELECT 
                p.nome as produto_nome,
                p.categoria_id,
                cp.nome as categoria_nome,
                cp.taxa_iva_padrao,
                cp.sujeito_iva,
                cp.tipo
            FROM produtos p
            LEFT JOIN categorias_produtos cp ON p.categoria_id = cp.id
            WHERE p.id = ?
        `;
        
        const produto = db.prepare(query).get(produtoId);
        
        if (!produto) {
            throw new Error('Produto não encontrado');
        }
        
        let taxaIva = 14.0; // Padrão Angola
        let sujeitoIva = 1;
        let categoriaNome = 'Sem Categoria';

        const regimeIva = this.getRegimeIva();
        const aplicaRegime = regimeIva !== 'exclusao';
        
        // Se tem categoria, usar taxa da categoria
        if (produto.categoria_id && produto.taxa_iva_padrao !== null) {
            taxaIva = produto.taxa_iva_padrao;
            sujeitoIva = produto.sujeito_iva;
            categoriaNome = produto.categoria_nome;
        }

        if (!aplicaRegime) {
            taxaIva = 0;
            sujeitoIva = 0;
        }
        
        // Calcular valor do IVA
        const valorIva = (aplicaRegime && sujeitoIva) ? (valor * taxaIva / 100) : 0;
        
        return {
            taxa_iva: taxaIva,
            valor_iva: valorIva,
            sujeito_iva: sujeitoIva,
            categoria_nome: categoriaNome,
            produto_nome: produto.produto_nome,
            tipo_categoria: produto.tipo || 'produto',
            regime_iva: regimeIva
        };
    }
    
    /**
     * Calcular IVA para múltiplos itens de uma venda
     * @param {Array} itens - Array de itens [{produto_id, quantidade, preco_unitario}]
     * @returns {Object} - Resumo do IVA calculado
     */
    static calcularIvaVenda(itens) {
        let totalSemIva = 0;
        let totalIva = 0;
        const detalhesItens = [];
        
        const regimeAtual = this.getRegimeIva();

        for (const item of itens) {
            const subtotal = item.quantidade * item.preco_unitario;
            
            try {
                const ivaInfo = this.calcularIvaProduto(item.produto_id, subtotal);
                
                detalhesItens.push({
                    ...item,
                    subtotal: subtotal,
                    taxa_iva: ivaInfo.taxa_iva,
                    valor_iva: ivaInfo.valor_iva,
                    total_com_iva: subtotal + ivaInfo.valor_iva,
                    categoria_nome: ivaInfo.categoria_nome,
                    produto_nome: ivaInfo.produto_nome
                });
                
                totalSemIva += subtotal;
                totalIva += ivaInfo.valor_iva;
                
            } catch (error) {
                console.error(`Erro calculando IVA para produto ${item.produto_id}:`, error);
                
                // Fallback: usar IVA padrão 14%
                const valorIva = subtotal * 0.14;
                
                detalhesItens.push({
                    ...item,
                    subtotal: subtotal,
                    taxa_iva: 14.0,
                    valor_iva: valorIva,
                    total_com_iva: subtotal + valorIva,
                    categoria_nome: 'Categoria Padrão',
                    produto_nome: `Produto ID ${item.produto_id}`
                });
                
                totalSemIva += subtotal;
                totalIva += valorIva;
            }
        }
        
        return {
            itens: detalhesItens,
            subtotal: totalSemIva,
            total_iva: totalIva,
            total_com_iva: totalSemIva + totalIva,
            resumo_iva: this.gerarResumoIva(detalhesItens),
            regime_iva: regimeAtual
        };
    }
    
    /**
     * Gerar resumo agrupado por taxa de IVA
     * @param {Array} itens - Itens com IVA calculado
     * @returns {Array} - Resumo agrupado por taxa
     */
    static gerarResumoIva(itens) {
        const resumo = {};
        
        itens.forEach(item => {
            const taxa = item.taxa_iva;
            
            if (!resumo[taxa]) {
                resumo[taxa] = {
                    taxa_iva: taxa,
                    base_calculo: 0,
                    valor_iva: 0,
                    total_com_iva: 0,
                    quantidade_itens: 0
                };
            }
            
            resumo[taxa].base_calculo += item.subtotal;
            resumo[taxa].valor_iva += item.valor_iva;
            resumo[taxa].total_com_iva += item.total_com_iva;
            resumo[taxa].quantidade_itens += 1;
        });
        
        // Converter para array e ordenar por taxa
        return Object.values(resumo).sort((a, b) => a.taxa_iva - b.taxa_iva);
    }
    
    /**
     * Aplicar desconto e recalcular IVA
     * @param {number} subtotal - Subtotal da venda
     * @param {number} totalIva - Total do IVA sem desconto
     * @param {number} desconto - Valor do desconto
     * @param {string} tipoDesconto - 'valor' ou 'percentual'
     * @returns {Object} - Valores recalculados
     */
    static aplicarDesconto(subtotal, totalIva, desconto, tipoDesconto = 'valor') {
        const baseSubtotal = Number(subtotal) || 0;
        const baseIva = Number(totalIva) || 0;

        if (baseSubtotal <= 0) {
            return {
                subtotal: baseSubtotal,
                desconto: 0,
                subtotal_com_desconto: baseSubtotal,
                iva_original: baseIva,
                iva_com_desconto: baseIva,
                total_final: baseSubtotal + baseIva,
                percentual_desconto: 0
            };
        }

        let valorDesconto = 0;
        
        if (tipoDesconto === 'percentual') {
            valorDesconto = subtotal * (desconto / 100);
        } else {
            valorDesconto = desconto || 0;
        }
        
        // Garantir que desconto não seja maior que subtotal
        valorDesconto = Math.min(valorDesconto, subtotal);
        
        const subtotalComDesconto = baseSubtotal - valorDesconto;
        
        // Recalcular IVA proporcionalmente
        const fatorDesconto = subtotalComDesconto / baseSubtotal;
        const ivaComDesconto = baseIva * fatorDesconto;
        
        return {
            subtotal: baseSubtotal,
            desconto: valorDesconto,
            subtotal_com_desconto: subtotalComDesconto,
            iva_original: baseIva,
            iva_com_desconto: ivaComDesconto,
            total_final: subtotalComDesconto + ivaComDesconto,
            percentual_desconto: (valorDesconto / baseSubtotal) * 100
        };
    }
    
    /**
     * Validar se categoria de produto existe e está ativa
     * @param {number} categoriaId - ID da categoria
     * @returns {Object|null} - Dados da categoria ou null
     */
    static validarCategoria(categoriaId) {
        const query = `
            SELECT id, nome, tipo, taxa_iva_padrao, sujeito_iva, ativo
            FROM categorias_produtos
            WHERE id = ? AND ativo = 1
        `;
        
        return db.prepare(query).get(categoriaId);
    }
    
    /**
     * Obter relatório de IVA por período
     * @param {string} dataInicio - Data início (YYYY-MM-DD)
     * @param {string} dataFim - Data fim (YYYY-MM-DD)
     * @returns {Object} - Relatório de IVA
     */
    static relatorioIvaPeriodo(dataInicio, dataFim) {
        const query = `
            SELECT 
                v.id,
                v.data_venda,
                v.subtotal,
                v.desconto,
                v.taxa_iva,
                v.valor_iva,
                v.total,
                c.nome as cliente_nome,
                u.nome as vendedor_nome
            FROM vendas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE date(v.data_venda) BETWEEN ? AND ?
            AND v.status = 'concluida'
            ORDER BY v.data_venda DESC
        `;
        
        const vendas = db.prepare(query).all(dataInicio, dataFim);
        
        // Calcular totais
        let totalSubtotal = 0;
        let totalDesconto = 0;
        let totalIva = 0;
        let totalGeral = 0;
        
        const resumoPorTaxa = {};
        
        vendas.forEach(venda => {
            totalSubtotal += venda.subtotal;
            totalDesconto += venda.desconto || 0;
            totalIva += venda.valor_iva || 0;
            totalGeral += venda.total;
            
            // Agrupar por taxa de IVA
            const taxa = venda.taxa_iva || 0;
            if (!resumoPorTaxa[taxa]) {
                resumoPorTaxa[taxa] = {
                    taxa: taxa,
                    base_calculo: 0,
                    valor_iva: 0,
                    quantidade_vendas: 0
                };
            }
            
            resumoPorTaxa[taxa].base_calculo += (venda.subtotal - (venda.desconto || 0));
            resumoPorTaxa[taxa].valor_iva += (venda.valor_iva || 0);
            resumoPorTaxa[taxa].quantidade_vendas += 1;
        });
        
        return {
            periodo: { inicio: dataInicio, fim: dataFim },
            vendas: vendas,
            totais: {
                subtotal: totalSubtotal,
                desconto: totalDesconto,
                iva: totalIva,
                total: totalGeral,
                quantidade_vendas: vendas.length
            },
            resumo_por_taxa: Object.values(resumoPorTaxa).sort((a, b) => a.taxa - b.taxa)
        };
    }
}

module.exports = IvaService;