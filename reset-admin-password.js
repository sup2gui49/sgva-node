const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

console.log('🔐 Atualizando senha do admin para "admin123"...\n');

// Gerar novo hash
const novaSenha = 'admin123';
const novoHash = bcrypt.hashSync(novaSenha, 10);

// Atualizar no banco
const result = db.prepare('UPDATE usuarios SET senha = ? WHERE email = ?').run(novoHash, 'admin@sgva.com');

if (result.changes > 0) {
    console.log('✅ Senha atualizada com sucesso!');
    console.log('\n📋 Credenciais do Admin:');
    console.log('   Email: admin@sgva.com');
    console.log('   Senha: admin123');
    
    // Verificar se funciona
    const admin = db.prepare('SELECT senha FROM usuarios WHERE email = ?').get('admin@sgva.com');
    const teste = bcrypt.compareSync(novaSenha, admin.senha);
    
    console.log(`\n🧪 Teste de verificação: ${teste ? '✅ OK' : '❌ FALHOU'}`);
} else {
    console.log('❌ Erro ao atualizar senha!');
}
