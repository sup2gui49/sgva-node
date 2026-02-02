const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database/sgva.db');
const db = new Database(dbPath);

console.log('Testing api/vendas logic...');

try {
    const userRole = 'admin';
    const params = [];
    
    let sql = `
      SELECT v.*, c.nome as cliente_nome, u.nome as vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    
    sql += ' ORDER BY v.data_venda DESC';
    
    console.log('Executing main query:', sql);
    const vendas = db.prepare(sql).all(...params);
    console.log(`Found ${vendas.length} sales.`);
    
    console.log('Fetching items for each sale...');
    vendas.forEach((venda, index) => {
        if (index < 3) console.log(`Processing sale ${venda.id}...`);
        
        const itens = db.prepare(`
        SELECT i.*, p.nome as descricao
        FROM itens_venda i
        LEFT JOIN produtos p ON i.produto_id = p.id
        WHERE i.venda_id = ?
        `).all(venda.id);
        
        venda.itens = itens;
    });
    
    console.log('Success!');
    
} catch (error) {
    console.error('CRASHED!');
    console.error(error);
}
