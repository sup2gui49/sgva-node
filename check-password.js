const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

console.log('🔍 Verificando senha do admin...\n');

// Buscar o usuário admin
const admin = db.prepare('SELECT id, nome, email, senha FROM usuarios WHERE email = ?').get('admin@sgva.com');

if (!admin) {
    console.log('❌ Usuário admin@sgva.com não encontrado!');
    process.exit(1);
}

console.log('✅ Usuário encontrado:');
console.log(`   ID: ${admin.id}`);
console.log(`   Nome: ${admin.nome}`);
console.log(`   Email: ${admin.email}`);
console.log(`   Hash armazenado: ${admin.senha.substring(0, 20)}...`);

// Testar senhas comuns
const senhasTeste = ['admin123', 'admin', '123456', 'Admin123'];

console.log('\n🧪 Testando senhas comuns:\n');

for (const senha of senhasTeste) {
    const match = bcrypt.compareSync(senha, admin.senha);
    console.log(`   "${senha}": ${match ? '✅ MATCH!' : '❌'}`);
    if (match) {
        console.log(`\n🎉 SENHA CORRETA: "${senha}"\n`);
        process.exit(0);
    }
}

console.log('\n❌ Nenhuma senha testada funcionou.');
console.log('\n💡 Opções:');
console.log('   1. Resetar senha do admin para "admin123"');
console.log('   2. Descobrir qual a senha correta');
