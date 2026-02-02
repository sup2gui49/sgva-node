const db = require('./src/config/database');

console.log('\n🧹 LIMPEZA DE FUNCIONÁRIOS DUPLICADOS\n');
console.log('======================================\n');

// Backup antes de deletar
console.log('📦 Criando backup de segurança...');
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-pre-cleanup-${timestamp}.db`);
fs.copyFileSync(
  path.join(__dirname, 'database', 'sgva.db'),
  backupFile
);
console.log(`✅ Backup criado: ${backupFile}\n`);

// 1. Remover duplicados de DENISIO (manter ID 12, remover ID 13)
console.log('🔧 Removendo DENISIO duplicado (ID 13)...');
try {
  // Verificar se há subsídios ou folhas vinculados ao ID 13
  const subsidiosDenisio13 = db.prepare('SELECT COUNT(*) as total FROM funcionarios_subsidios WHERE funcionario_id = 13').get();
  const folhasDenisio13 = db.prepare('SELECT COUNT(*) as total FROM folhas_pagamento WHERE funcionario_id = 13').get();
  
  console.log(`   - Subsídios vinculados: ${subsidiosDenisio13.total}`);
  console.log(`   - Folhas vinculadas: ${folhasDenisio13.total}`);
  
  if (subsidiosDenisio13.total > 0 || folhasDenisio13.total > 0) {
    console.log('   ⚠️  Movendo dados do ID 13 para ID 12...');
    
    // Mover subsídios (se houver)
    if (subsidiosDenisio13.total > 0) {
      db.prepare(`
        UPDATE funcionarios_subsidios 
        SET funcionario_id = 12 
        WHERE funcionario_id = 13 
        AND subsidio_id NOT IN (SELECT subsidio_id FROM funcionarios_subsidios WHERE funcionario_id = 12)
      `).run();
    }
    
    // Mover folhas (se houver) - folha_subsidios_detalhes não tem coluna funcionario_id
    if (folhasDenisio13.total > 0) {
      db.prepare('UPDATE folhas_pagamento SET funcionario_id = 12 WHERE funcionario_id = 13').run();
    }
  }
  
  // Deletar duplicado
  db.prepare('DELETE FROM funcionarios WHERE id = 13').run();
  console.log('✅ DENISIO ID 13 removido\n');
} catch (error) {
  console.error('❌ Erro ao remover DENISIO:', error.message);
}

// 2. Remover duplicados de João Silva Teste (manter ID 7, remover IDs 8, 9, 10, 11)
console.log('🔧 Removendo João Silva Teste duplicados (IDs 8, 9, 10, 11)...');
const idsRemover = [8, 9, 10, 11];

for (const id of idsRemover) {
  try {
    const subsidios = db.prepare('SELECT COUNT(*) as total FROM funcionarios_subsidios WHERE funcionario_id = ?').get(id);
    const folhas = db.prepare('SELECT COUNT(*) as total FROM folhas_pagamento WHERE funcionario_id = ?').get(id);
    
    console.log(`   - ID ${id}: ${subsidios.total} subsídios, ${folhas.total} folhas`);
    
    if (subsidios.total > 0 || folhas.total > 0) {
      console.log(`     ⚠️  Movendo dados do ID ${id} para ID 7...`);
      
      // Mover subsídios (evitar duplicatas)
      if (subsidios.total > 0) {
        db.prepare(`
          UPDATE funcionarios_subsidios 
          SET funcionario_id = 7 
          WHERE funcionario_id = ? 
          AND subsidio_id NOT IN (SELECT subsidio_id FROM funcionarios_subsidios WHERE funcionario_id = 7)
        `).run(id);
        
        // Deletar subsídios que ficaram duplicados
        db.prepare('DELETE FROM funcionarios_subsidios WHERE funcionario_id = ?').run(id);
      }
      
      // Mover folhas - folha_subsidios_detalhes não tem coluna funcionario_id
      if (folhas.total > 0) {
        db.prepare('UPDATE folhas_pagamento SET funcionario_id = 7 WHERE funcionario_id = ?').run(id);
      }
    }
    
    // Deletar duplicado
    db.prepare('DELETE FROM funcionarios WHERE id = ?').run(id);
    console.log(`   ✅ João Silva Teste ID ${id} removido`);
  } catch (error) {
    console.error(`   ❌ Erro ao remover ID ${id}:`, error.message);
  }
}

console.log('\n======================================');
console.log('📊 RESULTADO FINAL:\n');

// Verificar resultado
const funcionariosFinais = db.prepare('SELECT id, nome, salario_base FROM funcionarios ORDER BY nome').all();
console.log('Funcionários restantes:');
funcionariosFinais.forEach(f => {
  console.log(`   ${f.id} - ${f.nome} (${f.salario_base.toLocaleString('pt-AO')} KZ)`);
});

const duplicadosRestantes = db.prepare(`
  SELECT nome, COUNT(*) as quantidade
  FROM funcionarios
  GROUP BY nome
  HAVING COUNT(*) > 1
`).all();

console.log('\n');
if (duplicadosRestantes.length > 0) {
  console.log('⚠️  Ainda existem duplicados:');
  duplicadosRestantes.forEach(d => console.log(`   - ${d.nome}: ${d.quantidade} registros`));
} else {
  console.log('✅ NENHUM DUPLICADO RESTANTE!');
}

console.log('\n======================================\n');
console.log('💡 DICA: Se precisar restaurar o backup:\n');
console.log(`   const fs = require('fs');`);
console.log(`   fs.copyFileSync('${backupFile}', './database/sgva.db');`);
console.log('\n');
