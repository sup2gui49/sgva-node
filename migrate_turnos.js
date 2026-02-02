// Script para adicionar suporte a Turnos no Banco de Dados

const db = require('./src/config/database');

try {
    console.log('--- Iniciando Migração: Sistema de Turnos ---');

    // 1. Criar Tabela de Turnos
    db.prepare(`
        CREATE TABLE IF NOT EXISTS turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            entrada TEXT NOT NULL,
            saida TEXT NOT NULL,
            inicio_intervalo TEXT,
            fim_intervalo TEXT,
            tolerancia_entrada INTEGER DEFAULT 5, -- Minutos
            tolerancia_saida INTEGER DEFAULT 5, -- Minutos
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            ativo INTEGER DEFAULT 1
        )
    `).run();
    console.log('✅ Tabela "turnos" criada/verificada.');

    // 2. Inserir Turno Geral (Padrão) se não existir
    const checkTurno = db.prepare("SELECT count(*) as qtd FROM turnos").get();
    if (checkTurno.qtd === 0) {
        db.prepare(`
            INSERT INTO turnos (nome, entrada, saida, inicio_intervalo, fim_intervalo)
            VALUES (?, ?, ?, ?, ?)
        `).run('Geral', '08:00', '17:00', '12:00', '13:00');
        console.log('✅ Turno "Geral" padrão inserido.');
    }

    // 3. Adicionar coluna turno_id em funcionarios se não existir
    const cols = db.prepare("PRAGMA table_info(funcionarios)").all();
    const hasTurnoId = cols.some(c => c.name === 'turno_id');
    
    if (!hasTurnoId) {
        db.prepare(`ALTER TABLE funcionarios ADD COLUMN turno_id INTEGER REFERENCES turnos(id)`).run();
        console.log('✅ Coluna "turno_id" adicionada à tabela funcionarios.');
        
        // Atualizar todos os funcionarios existentes para o turno Geral (ID 1)
        db.prepare(`UPDATE funcionarios SET turno_id = 1 WHERE turno_id IS NULL`).run();
        console.log('✅ Funcionários existentes vinculados ao turno Geral.');
    } else {
        console.log('ℹ️ Coluna "turno_id" já existe em funcionarios.');
    }

    // 4. Criar Tabela de Presença (para o futuro módulo) se não existir
    db.prepare(`
        CREATE TABLE IF NOT EXISTS presencas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario_id INTEGER NOT NULL,
            data DATE NOT NULL,
            entrada_registrada DATETIME,
            saida_registrada DATETIME,
            status TEXT DEFAULT 'presente', -- presente, falta, atraso, folga, feriado
            observacao TEXT,
            turno_id INTEGER, -- Turno que deveria cumprir neste dia
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(funcionario_id) REFERENCES funcionarios(id)
        )
    `).run();
    console.log('✅ Tabela "presencas" criada/verificada.');

    console.log('\n--- Migração Concluída com Sucesso ---');

} catch (err) {
    console.error('❌ Erro na migração:', err.message);
}
