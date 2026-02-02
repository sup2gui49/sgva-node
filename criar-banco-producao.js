const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database', 'sgva_producao.db');

console.log('🆕 CRIANDO BANCO DE DADOS PARA PRODUÇÃO\n');

// Remover se existir
if (fs.existsSync(dbPath)) {
  console.log('⚠️  Banco de produção já existe. Removendo...');
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

console.log('📋 Criando estrutura do banco...\n');

// Executar todas as migrações
const migrationsDir = path.join(__dirname, 'database', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir).sort();

for (const file of migrationFiles) {
  if (!file.endsWith('.sql')) continue;
  
  const migrationPath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  if (sql.trim()) {
    console.log(`✅ Executando: ${file}`);
    db.exec(sql);
  } else {
    console.log(`⏭️  Pulando: ${file} (vazio)`);
  }
}

// Inserir dados essenciais
console.log('\n📦 Inserindo configurações padrão...\n');

// 1. Sistema de módulos
db.exec(`
  INSERT INTO sistema_modulos (id, vendas_enabled, folha_enabled, integracao_modo)
  VALUES (1, 1, 1, 'bidirecional');
`);
console.log('✅ Módulos do sistema configurados');

// 2. Escalões IRT 2025
db.exec(`
  INSERT INTO irt_escaloes (escalao, limite_inferior, limite_superior, taxa, deducao_fixa, ano_vigencia) VALUES
  (1, 0, 70000, 0, 0, 2025),
  (2, 70000.01, 100000, 13, 9100, 2025),
  (3, 100000.01, 150000, 16, 12100, 2025),
  (4, 150000.01, 200000, 18, 15100, 2025),
  (5, 200000.01, 300000, 19, 17100, 2025),
  (6, 300000.01, 500000, 20, 20100, 2025),
  (7, 500000.01, 1000000, 21, 25100, 2025),
  (8, 1000000.01, 1500000, 22, 35100, 2025),
  (9, 1500000.01, 2000000, 23, 50100, 2025),
  (10, 2000000.01, 5000000, 24, 70100, 2025),
  (11, 5000000.01, 10000000, 24.5, 95100, 2025),
  (12, 10000000.01, 999999999999, 25, 145100, 2025);
`);
console.log('✅ Escalões IRT 2025 inseridos');

// 3. Categorias de funcionários
db.exec(`
  INSERT INTO categorias_funcionarios (nome, descricao, salario_minimo, inss_percentual, inss_patronal_percentual) VALUES
  ('CEO/Diretor Geral', 'Direção executiva e estratégica da empresa', 300000, 3, 8),
  ('Gerente/Coordenador', 'Gestão de departamentos e equipes', 150000, 3, 8),
  ('Supervisor/Chefe', 'Supervisão de operações e processos', 100000, 3, 8),
  ('Técnico/Especialista', 'Funções técnicas especializadas', 80000, 3, 8),
  ('Administrativo', 'Funções administrativas e suporte', 50000, 3, 8),
  ('Auxiliar/Operacional', 'Funções operacionais e apoio', 35000, 3, 8);
`);
console.log('✅ Categorias de funcionários inseridas');

// 4. Subsídios
db.exec(`
  INSERT INTO subsidios (nome, descricao, tipo_calculo, tipo_subsidio, valor_padrao_empresa, percentual, 
                        limite_isencao_fiscal, meses_pagamento, parcelas, incide_inss, incide_irt, aplicar_a) VALUES
  ('Subsídio de Alimentação', 'Ajuda de custo para alimentação', 'fixo', 'mensal', 15000, NULL, 15000, '1,2,3,4,5,6,7,8,9,10,11,12', NULL, 0, 0, 'todos'),
  ('Subsídio de Transporte', 'Ajuda de custo para transporte', 'fixo', 'mensal', 10000, NULL, 10000, '1,2,3,4,5,6,7,8,9,10,11,12', NULL, 0, 0, 'todos'),
  ('Subsídio de Família', 'Apoio por dependente familiar', 'fixo', 'mensal', 5000, NULL, 0, '1,2,3,4,5,6,7,8,9,10,11,12', NULL, 1, 1, 'individual'),
  ('13º Salário (1ª Parcela)', 'Primeira parcela do 13º salário (50% do salário base)', 'percentual', 'anual', 0, 50, 0, '6', 1, 1, 1, 'individual'),
  ('13º Salário (2ª Parcela)', 'Segunda parcela do 13º salário (50% do salário base)', 'percentual', 'anual', 0, 50, 0, '11', 2, 1, 1, 'individual'),
  ('Subsídio de Férias', 'Subsídio de férias correspondente ao salário base', 'percentual', 'anual', 0, 100, 0, '', NULL, 1, 1, 'individual'),
  ('Prêmio/Bônus', 'Bonificação por desempenho ou produtividade', 'fixo', 'eventual', 0, NULL, 0, '', NULL, 1, 1, 'individual');
`);
console.log('✅ Subsídios padrão inseridos');

// 5. Criar usuário admin
const bcrypt = require('bcryptjs');
const senhaHash = bcrypt.hashSync('admin123', 10);

db.prepare(`
  INSERT INTO usuarios (nome, email, senha, funcao, role, ativo)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('Administrador', 'admin@sistema.ao', senhaHash, 'admin', 'admin', 1);

console.log('✅ Usuário administrador criado');

db.close();

console.log('\n✅ BANCO DE PRODUÇÃO CRIADO COM SUCESSO!\n');
console.log('📍 Localização: ' + dbPath);
console.log('\n👤 Credenciais de acesso:');
console.log('   Email: admin@sistema.ao');
console.log('   Senha: admin123');
console.log('   ⚠️  ALTERE A SENHA AO FAZER LOGIN!\n');

console.log('📋 INSTRUÇÕES PARA USAR EM PRODUÇÃO:\n');
console.log('1. Copie o arquivo sgva_producao.db para sgva.db:');
console.log('   copy database\\sgva_producao.db database\\sgva.db\n');
console.log('2. Ou altere o .env para usar o banco de produção:');
console.log('   DB_PATH=./database/sgva_producao.db\n');
console.log('3. Inicie o servidor e faça login');
console.log('4. Configure os dados da empresa');
console.log('5. Cadastre funcionários e produtos\n');
