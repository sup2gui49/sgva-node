const db = require('../config/database');

console.log('🔧 Criando tabelas do banco de dados...\n');

// 1. Tabela de Usuários
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    funcao TEXT DEFAULT 'usuario',
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela usuarios criada');

// 2. Tabela de Produtos
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    tipo TEXT DEFAULT 'produto',
    unidade_medida TEXT DEFAULT 'un',
    custo_unitario REAL DEFAULT 0,
    preco_venda REAL DEFAULT 0,
    estoque REAL DEFAULT 0,
    estoque_minimo REAL DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela produtos criada');

// 3. Tabela de Receitas (para padarias/restaurantes)
db.exec(`
  CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    custo_total REAL DEFAULT 0,
    tempo_preparo INTEGER DEFAULT 0,
    rendimento INTEGER DEFAULT 1,
    unidade_rendimento TEXT DEFAULT 'un',
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela receitas criada');

// 4. Tabela de Ingredientes de Receitas
db.exec(`
  CREATE TABLE IF NOT EXISTS ingredientes_receita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receita_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade REAL NOT NULL,
    FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
  )
`);
console.log('✅ Tabela ingredientes_receita criada');

// 5. Tabela de Clientes
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf_cnpj TEXT,
    endereco TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela clientes criada');

// 6. Tabela de Vendas
db.exec(`
  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    usuario_id INTEGER,
    data_venda TEXT DEFAULT (datetime('now', 'localtime')),
    subtotal REAL DEFAULT 0,
    desconto REAL DEFAULT 0,
    taxa_iva REAL DEFAULT 14,
    valor_iva REAL DEFAULT 0,
    total REAL DEFAULT 0,
    tipo_pagamento TEXT,
    status TEXT DEFAULT 'concluida',
    observacoes TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )
`);
console.log('✅ Tabela vendas criada');

// 7. Tabela de Itens de Venda
db.exec(`
  CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    produto_id INTEGER,
    receita_id INTEGER,
    descricao TEXT NOT NULL,
    quantidade REAL NOT NULL,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (receita_id) REFERENCES receitas(id)
  )
`);
console.log('✅ Tabela itens_venda criada');

// 8. Tabela de Despesas
db.exec(`
  CREATE TABLE IF NOT EXISTS despesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    categoria TEXT,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data TEXT DEFAULT (datetime('now', 'localtime')),
    recorrente INTEGER DEFAULT 0,
    pago INTEGER DEFAULT 1,
    observacoes TEXT
  )
`);
console.log('✅ Tabela despesas criada');

// 9. Tabela de Funcionários
db.exec(`
  CREATE TABLE IF NOT EXISTS funcionarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    salario_base REAL NOT NULL,
    ativo INTEGER DEFAULT 1,
    data_admissao TEXT DEFAULT (datetime('now', 'localtime')),
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela funcionarios criada');

// 10. Tabela de Configurações Financeiras
db.exec(`
  CREATE TABLE IF NOT EXISTS config_financeira (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    margem_minima REAL DEFAULT 30,
    capital_giro_percentual REAL DEFAULT 40,
    fundo_reserva_percentual REAL DEFAULT 10,
    distribuicao_lucro_percentual REAL DEFAULT 50,
    inss_empregado REAL DEFAULT 3.0,
    inss_patronal REAL DEFAULT 8.0,
    irt_estimado_percentual REAL DEFAULT 0,
    imposto_selo_percentual REAL DEFAULT 0,
    imposto_selo_limite_faturacao REAL DEFAULT 0,
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela config_financeira criada');

// 11. Tabela de Categorias de Produtos
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
  )
`);
console.log('✅ Tabela categorias_produtos criada');

// 12. Tabela de Categorias de Despesas
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
  )
`);
console.log('✅ Tabela categorias_despesas criada');

// Inserir configuração padrão
const configExists = db.prepare('SELECT COUNT(*) as count FROM config_financeira').get();
if (configExists.count === 0) {
  db.prepare(`
    INSERT INTO config_financeira 
    (margem_minima, capital_giro_percentual, fundo_reserva_percentual, distribuicao_lucro_percentual)
    VALUES (?, ?, ?, ?)
  `).run(30, 40, 10, 50);
  console.log('✅ Configuração financeira padrão criada');
}

// Criar usuário admin padrão
const bcrypt = require('bcryptjs');
const adminExists = db.prepare('SELECT COUNT(*) as count FROM usuarios WHERE email = ?').get('admin@sgva.com');
if (adminExists.count === 0) {
  const senhaHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO usuarios (nome, email, senha, funcao)
    VALUES (?, ?, ?, ?)
  `).run('Administrador', 'admin@sgva.com', senhaHash, 'admin');
  console.log('✅ Usuário admin criado (Email: admin@sgva.com | Senha: admin123)');
}

console.log('\n🎉 Banco de dados configurado com sucesso!\n');

db.close();
