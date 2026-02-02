/**
 * ATUALIZAÇÃO DOS ESCALÕES DE IRT 2025
 * Atualiza para os 12 escalões oficiais vigentes
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
const db = sqlite3(dbPath);

console.log('\n=== ATUALIZANDO ESCALÕES DE IRT 2025 ===\n');

try {
    // Escalões oficiais atuais (12 escalões)
    const escaloesAtuais = [
        { escalao: 1, limite_inferior: 0, limite_superior: 100000, taxa_percentual: 0, parcela_abater: 0 },
        { escalao: 2, limite_inferior: 100001, limite_superior: 150000, taxa_percentual: 13, parcela_abater: 3000 },
        { escalao: 3, limite_inferior: 150001, limite_superior: 200000, taxa_percentual: 16, parcela_abater: 12500 },
        { escalao: 4, limite_inferior: 200001, limite_superior: 300000, taxa_percentual: 18, parcela_abater: 31250 },
        { escalao: 5, limite_inferior: 300001, limite_superior: 500000, taxa_percentual: 19, parcela_abater: 49250 },
        { escalao: 6, limite_inferior: 500001, limite_superior: 1000000, taxa_percentual: 20, parcela_abater: 87250 },
        { escalao: 7, limite_inferior: 1000001, limite_superior: 1500000, taxa_percentual: 21, parcela_abater: 187249 },
        { escalao: 8, limite_inferior: 1500001, limite_superior: 2000000, taxa_percentual: 22, parcela_abater: 292249 },
        { escalao: 9, limite_inferior: 2000001, limite_superior: 2500000, taxa_percentual: 23, parcela_abater: 402249 },
        { escalao: 10, limite_inferior: 2500001, limite_superior: 5000000, taxa_percentual: 24, parcela_abater: 517249 },
        { escalao: 11, limite_inferior: 5000001, limite_superior: 10000000, taxa_percentual: 24.5, parcela_abater: 1117249 },
        { escalao: 12, limite_inferior: 10000001, limite_superior: null, taxa_percentual: 25, parcela_abater: 2342248 }
    ];

    db.exec('BEGIN TRANSACTION');

    // Limpar escalões antigos
    console.log('🗑️  Removendo escalões antigos...');
    const deleted = db.prepare('DELETE FROM escaloes_irt').run();
    console.log(`   ✅ ${deleted.changes} escalão(ões) removido(s)\n`);

    // Inserir novos escalões
    console.log('📝 Inserindo escalões atualizados (2025)...\n');
    const insert = db.prepare(`
        INSERT INTO escaloes_irt (escalao, limite_inferior, limite_superior, taxa_percentual, parcela_abater, descricao)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    escaloesAtuais.forEach((esc) => {
        const descricao = esc.limite_superior 
            ? `${esc.escalao}º Escalão: ${esc.limite_inferior.toLocaleString('pt-AO')} - ${esc.limite_superior.toLocaleString('pt-AO')} KZ`
            : `${esc.escalao}º Escalão: Acima de ${esc.limite_inferior.toLocaleString('pt-AO')} KZ`;
            
        insert.run(
            esc.escalao,
            esc.limite_inferior,
            esc.limite_superior,
            esc.taxa_percentual,
            esc.parcela_abater,
            descricao
        );
        
        const limiteSupStr = esc.limite_superior ? esc.limite_superior.toLocaleString('pt-AO') : '∞';
        console.log(`   ${esc.escalao}º escalão: ${esc.limite_inferior.toLocaleString('pt-AO')} - ${limiteSupStr} KZ | Taxa: ${esc.taxa_percentual}% | Parcela: ${esc.parcela_abater.toLocaleString('pt-AO')} KZ`);
    });

    db.exec('COMMIT');

    // Verificar resultado
    const total = db.prepare('SELECT COUNT(*) as count FROM escaloes_irt').get();
    console.log(`\n✅ ATUALIZAÇÃO CONCLUÍDA!`);
    console.log(`📊 Total de escalões: ${total.count}\n`);

    db.close();

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ ERRO:', error.message);
    db.close();
    process.exit(1);
}
