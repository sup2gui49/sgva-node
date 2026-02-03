const db = require('../config/database');

// AUTO-HEAL: Ensure table exists
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categorias_produtos'").get();
  if (!tableCheck) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias_produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        tipo TEXT DEFAULT 'produto',
        taxa_iva_padrao REAL DEFAULT 14.0,
        sujeito_iva INTEGER DEFAULT 1,
        ativo INTEGER DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now', 'localtime')),
        atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
      );
      -- Seed defaults
      INSERT OR IGNORE INTO categorias_produtos (nome, descricao, tipo, taxa_iva_padrao) VALUES 
      ('Geral', 'Produtos diversos', 'produto', 14.0),
      ('Serviços', 'Prestação de serviços', 'servico', 6.5);
    `);
  }
} catch (e) {
  console.error('Auto-heal categorias_produtos failed:', e);
}

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