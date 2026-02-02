const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'sgva.db');
const db = new Database(dbPath);

console.log('🔧 Adaptando estrutura existente das categorias...');

// Verificar estrutura atual
console.log('📋 Estrutura atual da tabela categorias_produtos:');
const currentStructure = db.prepare(`PRAGMA table_info(categorias_produtos)`).all();
currentStructure.forEach(col => {
    console.log(`   ${col.name}: ${col.type}`);
});

// Vamos trabalhar com a estrutura existente e mapear os campos
// Parece que a tabela já tem: tipo, taxa_iva_padrao, sujeito_iva
// Vamos ajustar os dados para usar essa estrutura

console.log('\n🔄 Atualizando dados existentes...');

// Atualizar registros existentes com valores padrão corretos
const updateExisting = db.prepare(`
    UPDATE categorias_produtos 
    SET taxa_iva_padrao = CASE 
        WHEN nome IN ('Produtos Alimentares Básicos', 'Medicamentos', 'Livros Escolares') THEN 0.0
        WHEN nome IN ('Produtos Alimentares Gerais', 'Bebidas Não Alcoólicas') THEN 7.0
        ELSE 14.0
    END,
    tipo = CASE 
        WHEN nome IN ('Produtos Alimentares Básicos', 'Medicamentos', 'Livros Escolares') THEN 'isento'
        WHEN nome IN ('Produtos Alimentares Gerais', 'Bebidas Não Alcoólicas') THEN '7%'
        ELSE '14%'
    END,
    sujeito_iva = CASE 
        WHEN nome IN ('Produtos Alimentares Básicos', 'Medicamentos', 'Livros Escolares') THEN 0
        ELSE 1
    END
`);

const updatedRows = updateExisting.run();
console.log(`   ✅ ${updatedRows.changes} registros atualizados`);

// Adicionar algumas categorias que podem estar faltando
console.log('\n📦 Adicionando categorias essenciais...');
const novasCategorias = [
    { nome: 'Tecnologia', descricao: 'Computadores, celulares, eletrônicos', tipo: '14%', taxa_iva_padrao: 14.0, sujeito_iva: 1 },
    { nome: 'Serviços Gerais', descricao: 'Prestação de serviços diversos', tipo: '14%', taxa_iva_padrao: 14.0, sujeito_iva: 1 },
    { nome: 'Materiais de Construção', descricao: 'Cimento, ferro, tintas', tipo: '14%', taxa_iva_padrao: 14.0, sujeito_iva: 1 }
];

const insertCategoria = db.prepare(`
    INSERT OR IGNORE INTO categorias_produtos (nome, descricao, tipo, taxa_iva_padrao, sujeito_iva, ativo)
    VALUES (?, ?, ?, ?, ?, 1)
`);

let adicionadas = 0;
novasCategorias.forEach(cat => {
    try {
        const result = insertCategoria.run(cat.nome, cat.descricao, cat.tipo, cat.taxa_iva_padrao, cat.sujeito_iva);
        if (result.changes > 0) adicionadas++;
    } catch (e) {
        console.log(`   ⚠️  ${cat.nome}: ${e.message}`);
    }
});

console.log(`   ✅ ${adicionadas} novas categorias adicionadas`);

// Criar tabela de categorias de despesas (se não existir)
console.log('\n💼 Criando/verificando categorias de despesas...');
try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS categorias_despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        codigo_fiscal TEXT,
        dedutivel_irt BOOLEAN DEFAULT 1,
        ativo BOOLEAN DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);
    console.log('   ✅ Tabela categorias_despesas OK');
} catch (e) {
    console.log(`   ⚠️  Erro: ${e.message}`);
}

// Inserir categorias de despesas
const categoriasDespesas = [
    { nome: 'Salários e Encargos', descricao: 'Folha de pagamento e contribuições sociais', codigo_fiscal: 'SAL001', dedutivel_irt: 1 },
    { nome: 'Aluguel', descricao: 'Aluguel de imóveis comerciais', codigo_fiscal: 'ALU001', dedutivel_irt: 1 },
    { nome: 'Energia Elétrica', descricao: 'Contas de eletricidade', codigo_fiscal: 'ENE001', dedutivel_irt: 1 },
    { nome: 'Água', descricao: 'Contas de água', codigo_fiscal: 'AGU001', dedutivel_irt: 1 },
    { nome: 'Telecomunicações', descricao: 'Internet, telefone, comunicações', codigo_fiscal: 'TEL001', dedutivel_irt: 1 },
    { nome: 'Material de Escritório', descricao: 'Papel, canetas, material administrativo', codigo_fiscal: 'MAT001', dedutivel_irt: 1 },
    { nome: 'Combustível', descricao: 'Gasolina, diesel para veículos da empresa', codigo_fiscal: 'COM001', dedutivel_irt: 1 },
    { nome: 'Manutenção e Reparos', descricao: 'Consertos de equipamentos e instalações', codigo_fiscal: 'MAN001', dedutivel_irt: 1 },
    { nome: 'Impostos e Taxas', descricao: 'Impostos diversos (exceto IRT)', codigo_fiscal: 'IMP001', dedutivel_irt: 0 },
    { nome: 'Despesas Pessoais Sócios', descricao: 'Gastos pessoais não dedutíveis', codigo_fiscal: 'PES001', dedutivel_irt: 0 }
];

const insertDespesa = db.prepare(`
    INSERT OR IGNORE INTO categorias_despesas (nome, descricao, codigo_fiscal, dedutivel_irt)
    VALUES (?, ?, ?, ?)
`);

let despesasAdicionadas = 0;
categoriasDespesas.forEach(cat => {
    try {
        const result = insertDespesa.run(cat.nome, cat.descricao, cat.codigo_fiscal, cat.dedutivel_irt);
        if (result.changes > 0) despesasAdicionadas++;
    } catch (e) {
        console.log(`   ⚠️  ${cat.nome}: ${e.message}`);
    }
});

console.log(`   ✅ ${despesasAdicionadas} categorias de despesas inseridas`);

// Verificar se precisamos adicionar categoria_id nas outras tabelas
console.log('\n🔗 Verificando colunas categoria_id...');

// Verificar tabela produtos
try {
    const produtosColumns = db.prepare(`PRAGMA table_info(produtos)`).all();
    const hasCategoriaProdutoId = produtosColumns.some(col => col.name === 'categoria_id');
    
    if (!hasCategoriaProdutoId) {
        console.log('   📦 Adicionando categoria_id à tabela produtos...');
        db.exec('ALTER TABLE produtos ADD COLUMN categoria_id INTEGER REFERENCES categorias_produtos(id)');
        console.log('   ✅ Coluna categoria_id adicionada à produtos');
    } else {
        console.log('   ✅ Coluna categoria_id já existe na produtos');
    }
} catch (e) {
    console.log(`   ⚠️  Erro com produtos.categoria_id: ${e.message}`);
}

// Verificar tabela despesas
try {
    const despesasColumns = db.prepare(`PRAGMA table_info(despesas)`).all();
    const hasCategoriaDespesaId = despesasColumns.some(col => col.name === 'categoria_id');
    
    if (!hasCategoriaDespesaId) {
        console.log('   💸 Adicionando categoria_id à tabela despesas...');
        db.exec('ALTER TABLE despesas ADD COLUMN categoria_id INTEGER REFERENCES categorias_despesas(id)');
        console.log('   ✅ Coluna categoria_id adicionada à despesas');
    } else {
        console.log('   ✅ Coluna categoria_id já existe na despesas');
    }
} catch (e) {
    console.log(`   ⚠️  Erro com despesas.categoria_id: ${e.message}`);
}

// Resumo final
console.log('\n📊 Resumo do sistema de categorias:');
const totalCatProdutos = db.prepare('SELECT COUNT(*) as total FROM categorias_produtos WHERE ativo = 1').get();
const totalCatDespesas = db.prepare('SELECT COUNT(*) as total FROM categorias_despesas WHERE ativo = 1').get();

console.log(`   📦 Categorias de produtos ativas: ${totalCatProdutos.total}`);
console.log(`   💼 Categorias de despesas ativas: ${totalCatDespesas.total}`);

// Mostrar exemplos por tipo de IVA
console.log('\n📋 Categorias por tipo de IVA:');
const exemplosPorIva = db.prepare(`
    SELECT tipo, taxa_iva_padrao, COUNT(*) as quantidade, GROUP_CONCAT(nome, ', ') as exemplos
    FROM categorias_produtos 
    WHERE ativo = 1 
    GROUP BY tipo, taxa_iva_padrao
    ORDER BY taxa_iva_padrao
`).all();

exemplosPorIva.forEach(grupo => {
    const exemplos = grupo.exemplos.split(', ').slice(0, 3).join(', ') + (grupo.exemplos.split(', ').length > 3 ? '...' : '');
    console.log(`   ${grupo.tipo} (${grupo.taxa_iva_padrao}%): ${grupo.quantidade} categorias - ${exemplos}`);
});

db.close();
console.log('\n🎉 Sistema de categorias configurado com sucesso!');