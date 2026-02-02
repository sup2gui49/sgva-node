const db = require('../src/config/database');

console.log('🏗️  Criando Sistema Fiscal Completo\n');
console.log('=' .repeat(60));

try {
  // 1. CATEGORIAS DE PRODUTOS/SERVIÇOS
  console.log('\n📦 Criando tabela categorias_produtos...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias_produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      tipo TEXT DEFAULT 'produto' CHECK(tipo IN ('produto', 'servico')),
      taxa_iva_padrao REAL DEFAULT 14,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('✅ Tabela categorias_produtos criada');
  
  // Inserir categorias padrão
  const categoriasExistentes = db.prepare('SELECT COUNT(*) as count FROM categorias_produtos').get();
  if (categoriasExistentes.count === 0) {
    const categorias = [
      // Produtos com IVA 14%
      { nome: 'Padaria', tipo: 'produto', taxa: 14, desc: 'Pães, bolos, biscoitos' },
      { nome: 'Bebidas', tipo: 'produto', taxa: 14, desc: 'Refrigerantes, sucos, água' },
      { nome: 'Alimentos', tipo: 'produto', taxa: 14, desc: 'Alimentos em geral' },
      { nome: 'Mercearia', tipo: 'produto', taxa: 14, desc: 'Produtos de mercearia' },
      { nome: 'Higiene', tipo: 'produto', taxa: 14, desc: 'Produtos de higiene e limpeza' },
      
      // Produtos isentos (0%)
      { nome: 'Medicamentos', tipo: 'produto', taxa: 0, desc: 'Produtos farmacêuticos essenciais' },
      { nome: 'Livros', tipo: 'produto', taxa: 0, desc: 'Livros e material educativo' },
      
      // Serviços com IVA 14%
      { nome: 'Consultoria', tipo: 'servico', taxa: 14, desc: 'Serviços de consultoria' },
      { nome: 'Manutenção', tipo: 'servico', taxa: 14, desc: 'Serviços de manutenção' },
      { nome: 'Treinamento', tipo: 'servico', taxa: 14, desc: 'Serviços de formação' },
      
      // Serviços com IVA reduzido (7%)
      { nome: 'Alimentação', tipo: 'servico', taxa: 7, desc: 'Serviços de restauração' },
      { nome: 'Hotelaria', tipo: 'servico', taxa: 7, desc: 'Serviços de alojamento' }
    ];
    
    const insertCat = db.prepare(`
      INSERT INTO categorias_produtos (nome, tipo, taxa_iva_padrao, descricao)
      VALUES (?, ?, ?, ?)
    `);
    
    categorias.forEach(cat => {
      insertCat.run(cat.nome, cat.tipo, cat.taxa, cat.desc);
    });
    
    console.log(`   ✅ ${categorias.length} categorias padrão inseridas`);
  }
  
  // 2. CATEGORIAS DE DESPESAS
  console.log('\n💰 Criando tabela categorias_despesas...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias_despesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      dedutivel_irt INTEGER DEFAULT 1,
      percentual_deducao REAL DEFAULT 100,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('✅ Tabela categorias_despesas criada');
  
  // Inserir categorias de despesas padrão
  const despesasExistentes = db.prepare('SELECT COUNT(*) as count FROM categorias_despesas').get();
  if (despesasExistentes.count === 0) {
    const categoriasDespesas = [
      // Totalmente dedutíveis (100%)
      { nome: 'Salários', dedutivel: 1, perc: 100, desc: 'Salários de funcionários' },
      { nome: 'INSS', dedutivel: 1, perc: 100, desc: 'Contribuições sociais obrigatórias' },
      { nome: 'Aluguel', dedutivel: 1, perc: 100, desc: 'Aluguel de imóvel comercial' },
      { nome: 'Energia', dedutivel: 1, perc: 100, desc: 'Conta de energia elétrica' },
      { nome: 'Água', dedutivel: 1, perc: 100, desc: 'Conta de água' },
      { nome: 'Telefone/Internet', dedutivel: 1, perc: 100, desc: 'Telecomunicações' },
      { nome: 'Material de Escritório', dedutivel: 1, perc: 100, desc: 'Materiais administrativos' },
      { nome: 'Compras (Mercadorias)', dedutivel: 1, perc: 100, desc: 'Aquisição de mercadorias para revenda' },
      { nome: 'Manutenção', dedutivel: 1, perc: 100, desc: 'Manutenção e reparos' },
      { nome: 'Impostos e Taxas', dedutivel: 1, perc: 100, desc: 'Impostos e taxas diversas' },
      
      // Parcialmente dedutíveis (50%)
      { nome: 'Combustível', dedutivel: 1, perc: 50, desc: 'Combustível (50% dedutível)' },
      { nome: 'Refeições', dedutivel: 1, perc: 50, desc: 'Refeições de trabalho (50% dedutível)' },
      { nome: 'Representação', dedutivel: 1, perc: 50, desc: 'Despesas de representação (50% dedutível)' },
      
      // Não dedutíveis (0%)
      { nome: 'Multas', dedutivel: 0, perc: 0, desc: 'Multas e penalidades (não dedutível)' },
      { nome: 'Distribuição de Lucros', dedutivel: 0, perc: 0, desc: 'Distribuição de lucros aos sócios' },
      { nome: 'Doações Pessoais', dedutivel: 0, perc: 0, desc: 'Doações não autorizadas' }
    ];
    
    const insertDesp = db.prepare(`
      INSERT INTO categorias_despesas (nome, dedutivel_irt, percentual_deducao, descricao)
      VALUES (?, ?, ?, ?)
    `);
    
    categoriasDespesas.forEach(cat => {
      insertDesp.run(cat.nome, cat.dedutivel, cat.perc, cat.desc);
    });
    
    console.log(`   ✅ ${categoriasDespesas.length} categorias de despesas inseridas`);
  }
  
  // 3. ADICIONAR CAMPO taxa_iva NA TABELA produtos
  console.log('\n🏷️  Atualizando tabela produtos...');
  const produtosInfo = db.prepare("PRAGMA table_info(produtos)").all();
  const hasTaxaIva = produtosInfo.some(col => col.name === 'taxa_iva');
  
  if (!hasTaxaIva) {
    db.exec(`ALTER TABLE produtos ADD COLUMN taxa_iva REAL`);
    console.log('✅ Campo taxa_iva adicionado em produtos (NULL = usa taxa da categoria)');
  } else {
    console.log('⏭️  Campo taxa_iva já existe em produtos');
  }
  
  // 4. ADICIONAR CAMPO categoria_id em produtos (FK para categorias_produtos)
  const hasCategoriaId = produtosInfo.some(col => col.name === 'categoria_id');
  if (!hasCategoriaId) {
    db.exec(`ALTER TABLE produtos ADD COLUMN categoria_id INTEGER REFERENCES categorias_produtos(id)`);
    console.log('✅ Campo categoria_id adicionado em produtos');
  } else {
    console.log('⏭️  Campo categoria_id já existe em produtos');
  }
  
  // 5. ADICIONAR CAMPO categoria_id em despesas (FK para categorias_despesas)
  console.log('\n💸 Atualizando tabela despesas...');
  const despesasInfo = db.prepare("PRAGMA table_info(despesas)").all();
  const hasCategoriaIdDesp = despesasInfo.some(col => col.name === 'categoria_id');
  
  if (!hasCategoriaIdDesp) {
    db.exec(`ALTER TABLE despesas ADD COLUMN categoria_id INTEGER REFERENCES categorias_despesas(id)`);
    console.log('✅ Campo categoria_id adicionado em despesas');
  } else {
    console.log('⏭️  Campo categoria_id já existe em despesas');
  }
  
  // 6. ADICIONAR CAMPO taxa_iva em itens_venda (para armazenar IVA específico do item)
  console.log('\n🧾 Atualizando tabela itens_venda...');
  const itensInfo = db.prepare("PRAGMA table_info(itens_venda)").all();
  const hasTaxaIvaItem = itensInfo.some(col => col.name === 'taxa_iva');
  const hasValorIvaItem = itensInfo.some(col => col.name === 'valor_iva');
  
  if (!hasTaxaIvaItem) {
    db.exec(`ALTER TABLE itens_venda ADD COLUMN taxa_iva REAL DEFAULT 14`);
    console.log('✅ Campo taxa_iva adicionado em itens_venda');
  }
  
  if (!hasValorIvaItem) {
    db.exec(`ALTER TABLE itens_venda ADD COLUMN valor_iva REAL DEFAULT 0`);
    console.log('✅ Campo valor_iva adicionado em itens_venda');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Sistema Fiscal configurado com sucesso!');
  console.log('=' .repeat(60));
  console.log('\n📋 Resumo:');
  console.log(`   ✅ Categorias de Produtos: ${db.prepare('SELECT COUNT(*) as c FROM categorias_produtos').get().c}`);
  console.log(`   ✅ Categorias de Despesas: ${db.prepare('SELECT COUNT(*) as c FROM categorias_despesas').get().c}`);
  console.log(`   ✅ Produtos podem ter IVA próprio ou herdar da categoria`);
  console.log(`   ✅ Despesas com dedutibilidade fiscal configurável`);
  console.log(`   ✅ Suporte a múltiplas taxas de IVA na mesma fatura\n`);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
} finally {
  db.close();
}
