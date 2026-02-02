const db = require('../config/database');

class CategoriasProdutosService {
    // Listar todas as categorias de produtos
    static getAll() {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                tipo,
                taxa_iva_padrao,
                sujeito_iva,
                ativo,
                criado_em,
                atualizado_em
            FROM categorias_produtos 
            WHERE ativo = 1 
            ORDER BY nome
        `;
        return db.prepare(query).all();
    }

    // Buscar categoria por ID
    static getById(id) {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                tipo,
                taxa_iva_padrao,
                sujeito_iva,
                ativo,
                criado_em,
                atualizado_em
            FROM categorias_produtos 
            WHERE id = ? AND ativo = 1
        `;
        return db.prepare(query).get(id);
    }

    // Criar nova categoria
    static create(categoria) {
        const query = `
            INSERT INTO categorias_produtos (nome, descricao, tipo, taxa_iva_padrao, sujeito_iva)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = db.prepare(query).run(
            categoria.nome,
            categoria.descricao || null,
            categoria.tipo || 'produto',
            categoria.taxa_iva_padrao || 14.0,
            categoria.sujeito_iva !== undefined ? categoria.sujeito_iva : 1
        );
        
        return this.getById(result.lastInsertRowid);
    }

    // Atualizar categoria
    static update(id, categoria) {
        const query = `
            UPDATE categorias_produtos 
            SET nome = ?, 
                descricao = ?, 
                tipo = ?, 
                taxa_iva_padrao = ?, 
                sujeito_iva = ?,
                atualizado_em = datetime('now', 'localtime')
            WHERE id = ? AND ativo = 1
        `;
        
        const result = db.prepare(query).run(
            categoria.nome,
            categoria.descricao || null,
            categoria.tipo || 'produto',
            categoria.taxa_iva_padrao || 14.0,
            categoria.sujeito_iva !== undefined ? categoria.sujeito_iva : 1,
            id
        );
        
        if (result.changes === 0) {
            throw new Error('Categoria não encontrada ou não pôde ser atualizada');
        }
        
        return this.getById(id);
    }

    // Desativar categoria (soft delete)
    static delete(id) {
        // Verificar se a categoria está sendo usada
        const produtosUsando = db.prepare('SELECT COUNT(*) as count FROM produtos WHERE categoria_id = ?').get(id);
        
        if (produtosUsando.count > 0) {
            throw new Error(`Não é possível excluir a categoria. Ela está sendo usada por ${produtosUsando.count} produto(s).`);
        }
        
        const query = `
            UPDATE categorias_produtos 
            SET ativo = 0, atualizado_em = datetime('now', 'localtime')
            WHERE id = ?
        `;
        
        const result = db.prepare(query).run(id);
        
        if (result.changes === 0) {
            throw new Error('Categoria não encontrada');
        }
        
        return { message: 'Categoria desativada com sucesso' };
    }

    // Buscar categorias por tipo
    static getByTipo(tipo) {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                tipo,
                taxa_iva_padrao,
                sujeito_iva,
                ativo
            FROM categorias_produtos 
            WHERE tipo = ? AND ativo = 1 
            ORDER BY nome
        `;
        return db.prepare(query).all(tipo);
    }

    // Buscar categorias por taxa de IVA
    static getByTaxaIva(taxa) {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                tipo,
                taxa_iva_padrao,
                sujeito_iva
            FROM categorias_produtos 
            WHERE taxa_iva_padrao = ? AND ativo = 1 
            ORDER BY nome
        `;
        return db.prepare(query).all(taxa);
    }

    // Obter estatísticas das categorias
    static getStats() {
        const stats = {
            total: 0,
            por_tipo: {},
            por_iva: {}
        };

        // Total de categorias ativas
        const totalQuery = 'SELECT COUNT(*) as count FROM categorias_produtos WHERE ativo = 1';
        stats.total = db.prepare(totalQuery).get().count;

        // Por tipo (produto/serviço)
        const tipoQuery = `
            SELECT tipo, COUNT(*) as count 
            FROM categorias_produtos 
            WHERE ativo = 1 
            GROUP BY tipo
        `;
        const tipoResults = db.prepare(tipoQuery).all();
        tipoResults.forEach(row => {
            stats.por_tipo[row.tipo] = row.count;
        });

        // Por taxa de IVA
        const ivaQuery = `
            SELECT taxa_iva_padrao, COUNT(*) as count 
            FROM categorias_produtos 
            WHERE ativo = 1 
            GROUP BY taxa_iva_padrao 
            ORDER BY taxa_iva_padrao
        `;
        const ivaResults = db.prepare(ivaQuery).all();
        ivaResults.forEach(row => {
            stats.por_iva[`${row.taxa_iva_padrao}%`] = row.count;
        });

        return stats;
    }
}

module.exports = CategoriasProdutosService;