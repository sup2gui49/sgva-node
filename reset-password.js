const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function resetSenha() {
  const senha = '123456';
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(senha, salt);

  db.prepare('UPDATE usuarios SET senha = ? WHERE email = ?').run(senhaHash, 'admin@sgva.com');

  console.log('✅ Senha resetada para: 123456');
  console.log('Email: admin@sgva.com');
}

resetSenha();
