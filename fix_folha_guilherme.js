const db = require('./src/config/database');

try {
    console.log('--- Inserindo Folha de Pagamento Manual (Jan/2026) ---');
    
    // 1. Obter ID do Guilherme
    const func = db.prepare(`SELECT * FROM funcionarios WHERE nome LIKE '%Guilherme%'`).get();
    if (!func) {
        throw new Error('Funcionário Guilherme não encontrado!');
    }
    
    console.log(`Inserindo folha para: ${func.nome} (ID: ${func.id})`);

    // 2. Dados mapeados para o schema correto
    const dadosDados = {
        funcionario_id: func.id,
        mes: 1,
        ano: 2026,
        salario_base: 100000.00,
        total_subsidios: 60000.00,
        subsidios_isentos: 60000.00,
        subsidios_tributaveis: 0,
        salario_bruto: 160000.00,
        inss_empregado: 4800.00,
        inss_patronal: 12800.00,
        deducao_fixa: 0,
        rendimento_colectavel: 95200.00,
        irt: 0.00,
        total_descontos: 4800.00,
        salario_liquido: 155200.00,
        observacoes: 'Inserção manual para correção do DRE',
        calculado_em: new Date().toISOString()
    };

    // 3. Preparar INSERT corrigido
    const insert = db.prepare(`
        INSERT INTO folhas_pagamento (
            funcionario_id, mes, ano, 
            salario_base, total_subsidios, subsidios_isentos, subsidios_tributaveis,
            salario_bruto, inss_empregado, inss_patronal, 
            deducao_fixa, rendimento_colectavel, irt, total_descontos,
            salario_liquido, observacoes, calculado_em
        ) VALUES (
            @funcionario_id, @mes, @ano,
            @salario_base, @total_subsidios, @subsidios_isentos, @subsidios_tributaveis,
            @salario_bruto, @inss_empregado, @inss_patronal,
            @deducao_fixa, @rendimento_colectavel, @irt, @total_descontos,
            @salario_liquido, @observacoes, @calculado_em
        )
    `);

    insert.run(dadosDados);
    
    console.log('✅ Folha de pagamento inserida com sucesso!');
    console.log('O DRE agora deve ler este registro e remover o status "Estimativa".');

} catch (err) {
    console.error('Erro:', err.message);
}
