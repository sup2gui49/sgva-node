-- Configuração de módulos e dependências SGVA
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
