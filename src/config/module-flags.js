const db = require('../config/database');

const DEFAULT_CONFIG = {
  id: 1,
  vendas_enabled: 1,
  folha_enabled: 1,
  integracao_modo: 'bidirecional'
};

const VALID_MODES = ['nenhuma', 'folha->vendas', 'vendas->folha', 'bidirecional'];

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sistema_modulos (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      vendas_enabled INTEGER NOT NULL DEFAULT 1,
      folha_enabled INTEGER NOT NULL DEFAULT 1,
      integracao_modo TEXT NOT NULL DEFAULT 'bidirecional',
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      CHECK (vendas_enabled IN (0,1)),
      CHECK (folha_enabled IN (0,1)),
      CHECK (integracao_modo IN ('nenhuma','folha->vendas','vendas->folha','bidirecional'))
    );

    INSERT INTO sistema_modulos (id, vendas_enabled, folha_enabled, integracao_modo)
    VALUES (1, 1, 1, 'bidirecional')
    ON CONFLICT(id) DO NOTHING;
  `);
}

// Garantir que a tabela existe mesmo em bases antigas
ensureTable();

function ensureConfigRow() {
  const existing = db.prepare('SELECT * FROM sistema_modulos WHERE id = 1').get();
  if (!existing) {
    db.prepare(`
      INSERT INTO sistema_modulos (id, vendas_enabled, folha_enabled, integracao_modo)
      VALUES (@id, @vendas_enabled, @folha_enabled, @integracao_modo)
    `).run(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  return existing;
}

function getModuleConfig() {
  try {
    try {
      ensureTable();
    } catch (ensureError) {
      console.warn('⚠️ Falha ao garantir tabela sistema_modulos:', ensureError?.message || ensureError);
      return DEFAULT_CONFIG;
    }

    const config = db.prepare('SELECT * FROM sistema_modulos WHERE id = 1').get();
    if (!config) {
      return ensureConfigRow();
    }
    return config;
  } catch (err) {
    // Auto-heal bases que ainda não têm a tabela
    if (err && /no such table/i.test(err.message || '')) {
      ensureTable();
      return ensureConfigRow();
    }
    throw err;
  }
}

function updateModuleConfig(updates = {}) {
  const current = getModuleConfig();
  const next = { ...current };

  if (Object.prototype.hasOwnProperty.call(updates, 'vendasEnabled')) {
    next.vendas_enabled = updates.vendasEnabled ? 1 : 0;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'folhaEnabled')) {
    next.folha_enabled = updates.folhaEnabled ? 1 : 0;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'integracaoModo')) {
    const normalized = String(updates.integracaoModo || '').toLowerCase();
    if (!VALID_MODES.includes(normalized)) {
      throw new Error('Modo de integração inválido');
    }
    next.integracao_modo = normalized;
  }

  db.prepare(`
    UPDATE sistema_modulos
    SET vendas_enabled = ?,
        folha_enabled = ?,
        integracao_modo = ?,
        updated_at = datetime('now','localtime')
    WHERE id = 1
  `).run(next.vendas_enabled, next.folha_enabled, next.integracao_modo);

  return getModuleConfig();
}

function isModuleEnabled(config, moduleKey) {
  if (!config) return true;
  return config[`${moduleKey}_enabled`] === 1;
}

function requireModuleEnabled(moduleKey) {
  return (req, res, next) => {
    const config = getModuleConfig();
    req.moduleConfig = config;
    if (!isModuleEnabled(config, moduleKey)) {
      return res.status(403).json({
        success: false,
        message: `Módulo ${moduleKey} está desativado para esta empresa`
      });
    }
    next();
  };
}

function shouldSyncFolhaToVendas(config) {
  const cfg = config || getModuleConfig();
  if (!cfg) return true;

  if (cfg.vendas_enabled !== 1 || cfg.folha_enabled !== 1) {
    return false;
  }

  return ['bidirecional', 'folha->vendas'].includes(cfg.integracao_modo);
}

function shouldSyncVendasToFolha(config) {
  const cfg = config || getModuleConfig();
  if (!cfg) return true;

  if (cfg.vendas_enabled !== 1 || cfg.folha_enabled !== 1) {
    return false;
  }

  return ['bidirecional', 'vendas->folha'].includes(cfg.integracao_modo);
}

module.exports = {
  getModuleConfig,
  updateModuleConfig,
  requireModuleEnabled,
  shouldSyncFolhaToVendas,
  shouldSyncVendasToFolha,
  VALID_MODES
};