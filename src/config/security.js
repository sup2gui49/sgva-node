const BLOCKED_SECRETS = new Set([
  'sgva_secret_key_2025_mudar_em_producao',
  'segredo-super-secreto-sgva-2025',
  'sua_chave_secreta_muito_segura_aqui_2025'
]);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET não configurado. Defina no .env antes de iniciar o servidor.');
  }

  if (BLOCKED_SECRETS.has(secret)) {
    throw new Error('JWT_SECRET inseguro. Troque por um valor aleatório forte.');
  }

  if (secret.trim().length < 32) {
    throw new Error('JWT_SECRET muito curto. Use no mínimo 32 caracteres.');
  }

  return secret;
}

module.exports = {
  getJwtSecret
};
