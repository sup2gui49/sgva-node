/**
 * ATUALIZAÇÃO DOS ESCALÕES DE IRT
 * Atualiza para os 12 escalões do IRT vigente em Angola (2024/2025)
 * Baseado no Decreto Presidencial mais recente
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
const db = sqlite3(dbPath);

console.log('\n=== ATUALIZAÇÃO DOS ESCALÕES DE IRT ===\n');

// Escalões de IRT atualizados (12 escalões)
const escaloesAtualizados = [
    {
        escalao: 1,
        limite_inferior: 0,
        limite_superior: 70000,
        taxa_percentual: 0,
        parcela_abater: 0,
        descricao: 'Isento'
    },
    {
        escalao: 2,
        limite_inferior: 70000.01,
        limite_superior: 100000,
        taxa_percentual: 13,
        parcela_abater: 9100,
        descricao: '13% sobre excedente'
    },
    {
        escalao: 3,
        limite_inferior: 100000.01,
        limite_superior: 150000,
        taxa_percentual: 16,
        parcela_abater: 12100,
        descricao: '16% sobre excedente'
    },
    {
        escalao: 4,
        limite_inferior: 150000.01,
        limite_superior: 200000,
        taxa_percentual: 18,
        parcela_abater: 15100,
        descricao: '18% sobre excedente'
    },
    {
        escalao: 5,
        limite_inferior: 200000.01,
        limite_superior: 300000,
        taxa_percentual: 19,
        parcela_abater: 17100,
        descricao: '19% sobre excedente'
    },
    {
        escalao: 6,
        limite_inferior: 300000.01,
        limite_superior: 500000,
        taxa_percentual: 20,
        parcela_abater: 20100,
        descricao: '20% sobre excedente'
    },
    {
        escalao: 7,
        limite_inferior: 500000.01,
        limite_superior: 1000000,
        taxa_percentual: 21,
        parcela_abater: 25100,
        descricao: '21% sobre excedente'
    },
    {
        escalao: 8,
        limite_inferior: 1000000.01,
        limite_superior: 1500000,
        taxa_percentual: 22,
        parcela_abater: 35100,
        descricao: '22% sobre excedente'
    },
    {
        escalao: 9,
        limite_inferior: 1500000.01,
        limite_superior: 2000000,
        taxa_percentual: 23,
        parcela_abater: 50100,
        descricao: '23% sobre excedente'
    },
    {
        escalao: 10,
        limite_inferior: 2000000.01,
        limite_superior: 2500000,
        taxa_percentual: 24,
        parcela_abater: 70100,
        descricao: '24% sobre excedente'
    },
    {
        escalao: 11,
        limite_inferior: 2500000.01,
        limite_superior: 10000000,
        taxa_percentual: 24.5,
        parcela_abater: 82600,
        descricao: '24,5% sobre excedente'
    },
    {
        escalao: 12,
        limite_inferior: 10000000.01,
        limite_superior: null,
        taxa_percentual: 25,
        parcela_abater: 132600,
        descricao: '25% sobre excedente'
    }
];

try {
    console.log('📋 Verificando escalões atuais...');
    const escaloesAtuais = db.prepare('SELECT COUNT(*) as count FROM escaloes_irt').get();
    console.log(`   Escalões atuais: ${escaloesAtuais.count}`);

    // Iniciar transação
    const atualizar = db.transaction(() => {
        // 1. Deletar escalões antigos
        console.log('\n🗑️  Removendo escalões antigos...');
        const deleted = db.prepare('DELETE FROM escaloes_irt').run();
        console.log(`   ✅ ${deleted.changes} escalão(ões) removido(s)`);

        // 2. Inserir novos escalões
        console.log('\n➕ Inserindo novos escalões (12 escalões)...');
        const insert = db.prepare(`
            INSERT INTO escaloes_irt (
                escalao, 
                limite_inferior, 
                limite_superior, 
                taxa_percentual, 
                parcela_abater, 
                descricao, 
                ativo
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `);

        let contador = 0;
        escaloesAtualizados.forEach(escalao => {
            insert.run(
                escalao.escalao,
                escalao.limite_inferior,
                escalao.limite_superior,
                escalao.taxa_percentual,
                escalao.parcela_abater,
                escalao.descricao
            );
            contador++;
            console.log(`   ✅ Escalão ${escalao.escalao}: ${escalao.descricao} (${escalao.taxa_percentual}%)`);
        });

        // 3. Reset autoincrement
        db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('escaloes_irt');

        return contador;
    });

    // Executar transação
    const total = atualizar();

    console.log('\n📊 Verificando resultado...');
    const novosEscaloes = db.prepare('SELECT COUNT(*) as count FROM escaloes_irt').get();
    console.log(`   Total de escalões: ${novosEscaloes.count}`);

    // Mostrar resumo
    console.log('\n📋 RESUMO DOS ESCALÕES ATUALIZADOS:\n');
    const escaloes = db.prepare('SELECT * FROM escaloes_irt ORDER BY escalao').all();
    escaloes.forEach(e => {
        const limSup = e.limite_superior ? e.limite_superior.toLocaleString('pt-AO') : '∞';
        const limInf = e.limite_inferior.toLocaleString('pt-AO');
        console.log(`   ${e.escalao}. ${limInf} - ${limSup} KZ → ${e.taxa_percentual}% (abater: ${e.parcela_abater.toLocaleString('pt-AO')} KZ)`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ ESCALÕES DE IRT ATUALIZADOS COM SUCESSO!');
    console.log('='.repeat(70));
    console.log(`\n📊 Total: ${total} escalões cadastrados`);
    console.log('\n💡 Os cálculos de IRT agora usarão os escalões atualizados.\n');

} catch (error) {
    console.error('\n❌ ERRO ao atualizar escalões:', error.message);
    console.error(error);
} finally {
    db.close();
}
