const db = require('./src/config/database');

console.log('USUÁRIOS NO SISTEMA:');
console.log('='.repeat(70));

const usuarios = db.prepare('SELECT id, nome, email, role FROM usuarios').all();

if (usuarios.length === 0) {
    console.log('Nenhum usuário cadastrado!');
} else {
    usuarios.forEach(u => {
        console.log(`[${u.id}] ${u.nome}`);
        console.log(`    Email: ${u.email}`);
        console.log(`    Role: ${u.role}`);
        console.log();
    });
}

console.log(`Total: ${usuarios.length} usuário(s)`);
