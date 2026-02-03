const db = require('../config/database');

// AUTO-HEAL: Ensure table exists
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categorias_despesas'").get();
  if (!tableCheck) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias_despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        codigo_fiscal TEXT,
        dedutivel_irt INTEGER DEFAULT 1,
        ativo INTEGER DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now', 'localtime')),
        atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
      );
      -- Seed defaults
      INSERT OR IGNORE INTO categorias_despesas (nome, descricao, dedutivel_irt) VALUES 
      ('Operacional', 'Despesas do dia a dia', 1),
      ('Pessoal', 'Despesas com equipe', 1),
      ('Impostos', 'Pagamento de impostos', 0);
    `);
  }
} catch (e) {
  console.error('Auto-heal categorias_despesas failed:', e);
}

class CategoriasDespesasService {
    // Listar todas as categorias de despesas
    static getAll() {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                codigo_fiscal,
                dedutivel_irt,
                ativo,
                criado_em,
                atualizado_em
            FROM categorias_despesas 
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
                codigo_fiscal,
                dedutivel_irt,
                ativo,
                criado_em,
                atualizado_em
            FROM categorias_despesas 
            WHERE id = ? AND ativo = 1
        `;
        return db.prepare(query).get(id);
    }

    // Criar nova categoria de despesa
    static create(categoria) {
        const query = `
            INSERT INTO categorias_despesas (nome, descricao, codigo_fiscal, dedutivel_irt)
            VALUES (?, ?, ?, ?)
        `;
        
        const result = db.prepare(query).run(
            categoria.nome,
            categoria.descricao || null,
            categoria.codigo_fiscal || null,
            categoria.dedutivel_irt !== undefined ? categoria.dedutivel_irt : 1
        );
        
        return this.getById(result.lastInsertRowid);
    }

    // Atualizar categoria de despesa
    static update(id, categoria) {
        const query = `
            UPDATE categorias_despesas 
            SET nome = ?, 
                descricao = ?, 
                codigo_fiscal = ?, 
                dedutivel_irt = ?,
                atualizado_em = datetime('now', 'localtime')
            WHERE id = ? AND ativo = 1
        `;
        
        const result = db.prepare(query).run(
            categoria.nome,
            categoria.descricao || null,
            categoria.codigo_fiscal || null,
            categoria.dedutivel_irt !== undefined ? categoria.dedutivel_irt : 1,
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
        const despesasUsando = db.prepare('SELECT COUNT(*) as count FROM despesas WHERE categoria_id = ?').get(id);
        
        if (despesasUsando.count > 0) {
            throw new Error(`Não é possível excluir a categoria. Ela está sendo usada por ${despesasUsando.count} despesa(s).`);
        }
        
        const query = `
            UPDATE categorias_despesas 
            SET ativo = 0, atualizado_em = datetime('now', 'localtime')
            WHERE id = ?
        `;
        
        const result = db.prepare(query).run(id);
        
        if (result.changes === 0) {
            throw new Error('Categoria não encontrada');
        }
        
        return { message: 'Categoria de despesa desativada com sucesso' };
    }

    // Buscar categorias dedutíveis ou não dedutíveis no IRT
    static getByDedutivelIrt(dedutivel) {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                codigo_fiscal,
                dedutivel_irt
            FROM categorias_despesas 
            WHERE dedutivel_irt = ? AND ativo = 1 
            ORDER BY nome
        `;
        return db.prepare(query).all(dedutivel ? 1 : 0);
    }

    // Buscar por código fiscal
    static getByCodigoFiscal(codigo) {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                codigo_fiscal,
                dedutivel_irt
            FROM categorias_despesas 
            WHERE codigo_fiscal = ? AND ativo = 1
        `;
        return db.prepare(query).get(codigo);
    }

    // Obter estatísticas das categorias de despesas
    static getStats() {
        const stats = {
            total: 0,
            dedutiveis_irt: 0,
            nao_dedutiveis_irt: 0,
            sem_codigo_fiscal: 0
        };

        // Total de categorias ativas
        const totalQuery = 'SELECT COUNT(*) as count FROM categorias_despesas WHERE ativo = 1';
        stats.total = db.prepare(totalQuery).get().count;

        // Dedutíveis no IRT
        const dedutivelQuery = 'SELECT COUNT(*) as count FROM categorias_despesas WHERE dedutivel_irt = 1 AND ativo = 1';
        stats.dedutiveis_irt = db.prepare(dedutivelQuery).get().count;

        // Não dedutíveis no IRT
        const naoDedutivelQuery = 'SELECT COUNT(*) as count FROM categorias_despesas WHERE dedutivel_irt = 0 AND ativo = 1';
        stats.nao_dedutiveis_irt = db.prepare(naoDedutivelQuery).get().count;

        // Sem código fiscal
        const semCodigoQuery = 'SELECT COUNT(*) as count FROM categorias_despesas WHERE (codigo_fiscal IS NULL OR codigo_fiscal = "") AND ativo = 1';
        stats.sem_codigo_fiscal = db.prepare(semCodigoQuery).get().count;

        return stats;
    }

    // Listar todas para relatórios (incluindo inativas)
    static getAllForReport() {
        const query = `
            SELECT 
                id,
                nome,
                descricao,
                codigo_fiscal,
                dedutivel_irt,
                ativo,
                criado_em,
                atualizado_em,
                CASE 
                    WHEN dedutivel_irt = 1 THEN 'Sim' 
                    ELSE 'Não' 
                END as dedutivel_irt_texto
            FROM categorias_despesas 
            ORDER BY ativo DESC, nome
        `;
        return db.prepare(query).all();
    }
}

module.exports = CategoriasDespesasService;