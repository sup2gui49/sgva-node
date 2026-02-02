-- Criar tabela para informações da empresa
CREATE TABLE IF NOT EXISTS empresa (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nome TEXT NOT NULL,
    nif TEXT,
    endereco TEXT,
    cidade TEXT,
    telefone TEXT,
    email TEXT,
    website TEXT,
    logo_base64 TEXT,
    rodape_documentos TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados padrão
INSERT OR IGNORE INTO empresa (id, nome, nif, endereco, cidade, telefone, email, rodape_documentos)
VALUES (
    1,
    'Sua Empresa Lda',
    '000000000',
    'Rua Principal, nº 123',
    'Luanda, Angola',
    '+244 900 000 000',
    'contato@suaempresa.ao',
    'Este documento foi gerado automaticamente pelo SGVA'
);
