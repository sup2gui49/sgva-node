const db = require('../config/database');
const fs = require('fs');
const path = require('path');

console.log('🔧 Criando tabelas profissionais de Folha de Pagamento...\n');

// 1. Tabela de Categorias Profissionais
db.exec(`
  CREATE TABLE IF NOT EXISTS categorias_funcionarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    encargos_especificos TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela categorias_funcionarios criada');

function loadDefaultCategorias() {
  const seedPath = path.join(__dirname, 'categorias-funcionarios-default.json');
  if (fs.existsSync(seedPath)) {
    try {
      const raw = fs.readFileSync(seedPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch (error) {
      console.warn('⚠️ Falha ao ler categorias padrão:', error.message);
    }
  }

  return [
    { nome: 'Geral', descricao: 'Funcionários gerais', encargos_especificos: null },
    { nome: 'Administrativo', descricao: 'Pessoal de escritório', encargos_especificos: null },
    { nome: 'Gerência', descricao: 'Gestores e diretores', encargos_especificos: null }
  ];
}

function seedCategoriasDefault() {
  const count = db.prepare('SELECT COUNT(*) as total FROM categorias_funcionarios').get();
  if (count && count.total > 0) {
    return;
  }

  const defaults = loadDefaultCategorias();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categorias_funcionarios (nome, descricao, encargos_especificos)
    VALUES (?, ?, ?)
  `);

  defaults.forEach((categoria) => {
    insert.run(
      categoria.nome,
      categoria.descricao || null,
      categoria.encargos_especificos || null
    );
  });

  console.log(`✅ Categorias padrão aplicadas: ${defaults.length}`);
}

seedCategoriasDefault();

// 2. Tabela de Subsídios Configuráveis
db.exec(`
  CREATE TABLE IF NOT EXISTS subsidios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo_calculo TEXT NOT NULL CHECK(tipo_calculo IN ('fixo', 'percentual', 'por_categoria')),
    tipo_subsidio TEXT NOT NULL CHECK(tipo_subsidio IN ('regular', 'especial', 'anual', 'ocasional')),
    valor_padrao_empresa REAL DEFAULT 0,
    percentual REAL DEFAULT 0,
    limite_isencao_fiscal REAL DEFAULT 0,
    meses_pagamento TEXT DEFAULT '1,2,3,4,5,6,7,8,9,10,11,12',
    parcelas INTEGER DEFAULT 1,
    incide_inss INTEGER DEFAULT 1,
    incide_irt INTEGER DEFAULT 1,
    aplicar_a TEXT DEFAULT 'todos' CHECK(aplicar_a IN ('todos', 'categoria_especifica', 'individual')),
    categoria_aplicavel TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela subsidios criada');

// 3. Tabela de Atribuição de Subsídios a Funcionários
db.exec(`
  CREATE TABLE IF NOT EXISTS funcionarios_subsidios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER NOT NULL,
    subsidio_id INTEGER NOT NULL,
    valor_especifico REAL,
    ativo INTEGER DEFAULT 1,
    atribuido_em TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE,
    FOREIGN KEY (subsidio_id) REFERENCES subsidios(id) ON DELETE CASCADE,
    UNIQUE(funcionario_id, subsidio_id)
  )
`);
console.log('✅ Tabela funcionarios_subsidios criada');

// 4. Tabela de Turnos
db.exec(`
  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    entrada TEXT NOT NULL,
    saida TEXT NOT NULL,
    inicio_intervalo TEXT,
    fim_intervalo TEXT,
    tolerancia_entrada INTEGER DEFAULT 5,
    tolerancia_saida INTEGER DEFAULT 5,
    dias_semana TEXT DEFAULT '[1,2,3,4,5]',
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela turnos criada');

// 5. Tabela IRT (Escalões de Imposto sobre Rendimentos)
db.exec(`
  CREATE TABLE IF NOT EXISTS irt_grupos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem INTEGER NOT NULL UNIQUE,
    de REAL NOT NULL,
    ate REAL,
    parcela_fixa REAL NOT NULL,
    taxa REAL NOT NULL,
    excesso REAL NOT NULL,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ Tabela irt_grupos criada');

// 6. Tabela de Snapshots IRT (Histórico)
db.exec(`
  CREATE TABLE IF NOT EXISTS irt_snapshot_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS irt_grupos_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL,
    de REAL NOT NULL,
    ate REAL,
    parcela_fixa REAL NOT NULL,
    taxa REAL NOT NULL,
    excesso REAL NOT NULL,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY(snapshot_id) REFERENCES irt_snapshot_meta(id) ON DELETE CASCADE
  )
`);
console.log('✅ Tabelas irt_snapshot_meta e irt_grupos_snapshots criadas');

// 7. Tabela de Folhas de Pagamento Calculadas
db.exec(`
  CREATE TABLE IF NOT EXISTS folhas_pagamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    funcionario_id INTEGER NOT NULL,
    salario_base REAL NOT NULL,
    total_subsidios REAL DEFAULT 0,
    subsidios_isentos REAL DEFAULT 0,
    subsidios_tributaveis REAL DEFAULT 0,
    salario_bruto REAL NOT NULL,
    inss_empregado REAL DEFAULT 0,
    inss_patronal REAL DEFAULT 0,
    deducao_fixa REAL DEFAULT 60000,
    rendimento_colectavel REAL DEFAULT 0,
    irt REAL DEFAULT 0,
    total_descontos REAL DEFAULT 0,
    salario_liquido REAL NOT NULL,
    observacoes TEXT,
    calculado_em TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
  )
`);
console.log('✅ Tabela folhas_pagamento criada');

// 8. Tabela de Detalhes de Subsídios na Folha
db.exec(`
  CREATE TABLE IF NOT EXISTS folha_subsidios_detalhes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folha_id INTEGER NOT NULL,
    subsidio_id INTEGER,
    nome_subsidio TEXT NOT NULL,
    valor REAL NOT NULL,
    valor_isento REAL DEFAULT 0,
    valor_tributavel REAL DEFAULT 0,
    FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE,
    FOREIGN KEY (subsidio_id) REFERENCES subsidios(id)
  )
`);
console.log('✅ Tabela folha_subsidios_detalhes criada');

// 9. Tabela de Histórico de Funcionários (Auditoria)
db.exec(`
  CREATE TABLE IF NOT EXISTS funcionarios_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER,
    nome TEXT,
    categoria TEXT,
    salario_base REAL,
    acao TEXT CHECK(acao IN ('criado', 'atualizado', 'deletado', 'arquivado')),
    usuario_id INTEGER,
    data_acao TEXT DEFAULT (datetime('now', 'localtime')),
    dados_completos TEXT
  )
`);
console.log('✅ Tabela funcionarios_historico criada');

// 9. Atualizar tabela funcionarios existente
try {
  db.exec(`
    ALTER TABLE funcionarios ADD COLUMN subsidio_manual REAL
  `);
  console.log('✅ Coluna subsidio_manual adicionada à tabela funcionarios');
} catch (e) {
  if (!e.message.includes('duplicate column name')) {
    console.log('⚠️  Coluna subsidio_manual já existe');
  }
}

try {
  db.exec(`
    ALTER TABLE funcionarios ADD COLUMN categoria_id INTEGER REFERENCES categorias_funcionarios(id)
  `);
  console.log('✅ Coluna categoria_id adicionada à tabela funcionarios');
} catch (e) {
  if (!e.message.includes('duplicate column name')) {
    console.log('⚠️  Coluna categoria_id já existe');
  }
}

// ============================================================
// SEED DE DADOS INICIAIS
// ============================================================

console.log('\n📊 Populando dados iniciais...\n');

// SEED: IRT Grupos (12 Escalões - Angola)
const irtCount = db.prepare('SELECT COUNT(*) as count FROM irt_grupos').get();
if (irtCount.count === 0) {
  const irtEscaloes = [
    [1,     0.00,     100000.00,      0.00,  0.00,      0.00],
    [2, 100001.00,     150000.00,   3000.00,  0.13, 100001.00],
    [3, 150001.00,     200000.00,  12500.00,  0.16, 150001.00],
    [4, 200001.00,     300000.00,  31250.00,  0.18, 200001.00],
    [5, 300001.00,     500000.00,  49250.00,  0.19, 300001.00],
    [6, 500001.00,    1000000.00,  87250.00,  0.20, 500001.00],
    [7,1000001.00,    1500000.00, 187249.00,  0.21,1000001.00],
    [8,1500001.00,    2000000.00, 292249.00,  0.22,1500001.00],
    [9,2000001.00,    2500000.00, 402249.00,  0.23,2000001.00],
    [10,2500001.00,   5000000.00, 517249.00,  0.24,2500001.00],
    [11,5000001.00,  10000000.00,1117249.00,  0.245,5000001.00],
    [12,10000001.00,       null, 2342248.00,  0.25,10000001.00]
  ];

  const insIrt = db.prepare(`
    INSERT INTO irt_grupos (ordem, de, ate, parcela_fixa, taxa, excesso, ativo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  for (const escalao of irtEscaloes) {
    insIrt.run(escalao[0], escalao[1], escalao[2], escalao[3], escalao[4], escalao[5]);
  }
  console.log('✅ 12 Escalões IRT (Angola) inseridos');
}

// SEED: Categorias Profissionais
const catCount = db.prepare('SELECT COUNT(*) as count FROM categorias_funcionarios').get();
if (catCount.count === 0) {
  const categorias = [
    ['CEO/Diretor Geral', 'Alta direção da empresa', null],
    ['Direção/Gerência', 'Cargos de direção e gerência', null],
    ['Financeiro', 'Departamento financeiro e contabilidade', null],
    ['Recursos Humanos', 'Gestão de pessoal e RH', null],
    ['Produção', 'Área de produção e manufatura', null],
    ['Comercial/Vendas', 'Equipe comercial e vendas', null],
    ['Segurança', 'Segurança patrimonial', null],
    ['Auxiliar/Operacional', 'Funções operacionais e auxiliares', null],
    ['Limpeza', 'Serviços de limpeza', null],
    ['Administrativo', 'Apoio administrativo geral', null]
  ];

  const insCat = db.prepare(`
    INSERT INTO categorias_funcionarios (nome, descricao, encargos_especificos)
    VALUES (?, ?, ?)
  `);

  for (const cat of categorias) {
    insCat.run(cat[0], cat[1], cat[2]);
  }
  console.log('✅ 10 Categorias Profissionais inseridas');
}

// SEED: Subsídios Padrão
const subCount = db.prepare('SELECT COUNT(*) as count FROM subsidios').get();
if (subCount.count === 0) {
  const subsidios = [
    // [nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao, percentual, limite_isencao, meses, parcelas, inss, irt, aplicar_a]
    [
      'Subsídio de Alimentação',
      'Subsídio mensal para alimentação',
      'fixo',
      'regular',
      20000.00,
      0,
      30000.00,
      '1,2,3,4,5,6,7,8,9,10,11,12',
      1,
      1,
      1,
      'todos'
    ],
    [
      'Subsídio de Transporte',
      'Subsídio mensal para transporte',
      'fixo',
      'regular',
      15000.00,
      0,
      20000.00,
      '1,2,3,4,5,6,7,8,9,10,11,12',
      1,
      1,
      1,
      'todos'
    ],
    [
      'Abono de Família',
      'Abono de família (5% do salário base)',
      'percentual',
      'regular',
      0,
      5.00,
      0,
      '1,2,3,4,5,6,7,8,9,10,11,12',
      1,
      0,
      0,
      'todos'
    ],
    [
      '13º Salário (1ª Parcela)',
      'Primeira parcela do 13º salário (50% do salário base)',
      'percentual',
      'anual',
      0,
      50.00,
      0,
      '6',
      1,
      1,
      1,
      'todos'
    ],
    [
      '13º Salário (2ª Parcela)',
      'Segunda parcela do 13º salário (50% do salário base)',
      'percentual',
      'anual',
      0,
      50.00,
      0,
      '12',
      1,
      1,
      1,
      'todos'
    ],
    [
      'Subsídio de Função - Direção',
      'Subsídio especial para cargos de direção',
      'fixo',
      'especial',
      50000.00,
      0,
      40000.00,
      '1,2,3,4,5,6,7,8,9,10,11,12',
      1,
      1,
      1,
      'categoria_especifica'
    ]
  ];

  const insSub = db.prepare(`
    INSERT INTO subsidios (
      nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao_empresa,
      percentual, limite_isencao_fiscal, meses_pagamento, parcelas,
      incide_inss, incide_irt, aplicar_a
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const sub of subsidios) {
    insSub.run(...sub);
  }
  console.log('✅ 6 Subsídios Padrão inseridos');
}

console.log('\n🎉 Sistema Profissional de Folha de Pagamento configurado com sucesso!\n');
console.log('📋 Tabelas criadas:');
console.log('   - categorias_funcionarios (10 categorias)');
console.log('   - subsidios (6 subsídios padrão)');
console.log('   - funcionarios_subsidios');
console.log('   - irt_grupos (12 escalões Angola)');
console.log('   - irt_snapshot_meta + irt_grupos_snapshots');
console.log('   - folhas_pagamento');
console.log('   - folha_subsidios_detalhes');
console.log('   - funcionarios_historico');
console.log('\n✨ Sistema pronto para uso!\n');

if (require.main === module) {
  db.close();
}
