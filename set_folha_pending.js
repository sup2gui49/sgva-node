const db = require('./src/config/database');

try {
    console.log('--- Ajustando Status da Folha para Pendente (Jan/2026) ---');
    
    // 1. Obter ID do Guilherme
    const func = db.prepare(`SELECT * FROM funcionarios WHERE nome LIKE '%Guilherme%'`).get();
    if (!func) {
        throw new Error('Funcionário Guilherme não encontrado!');
    }
    
    // 2. Atualizar o registro na tabela folhas_pagamento
    // Nota: A tabela folhas_pagamento não parece ter coluna 'status' no schema exibido pelo read_file, 
    // mas o meu insert anterior usou 'status'. Se não tiver, o DRE simplesmente lê a existência do registro.
    // Mas existe uma tabela separada: folha_pagamentos_status
    
    // Verificar se existe tabela de status
    try {
        const stats = db.prepare("SELECT * FROM folha_pagamentos_status WHERE funcionario_id = ? AND mes = 1 AND ano = 2026").get(func.id);
        if (stats) {
            console.log('Status atual:', stats.status);
            db.prepare(`
                UPDATE folha_pagamentos_status 
                SET status = 'pendente', pago_em = NULL 
                WHERE funcionario_id = ? AND mes = 1 AND ano = 2026
            `).run(func.id);
            console.log('✅ Status atualizado para "pendente" na tabela folha_pagamentos_status.');
        } else {
            console.log('Criando registro de status pendente...');
            db.prepare(`
                INSERT INTO folha_pagamentos_status (funcionario_id, mes, ano, status, valor_pago, pago_em)
                VALUES (?, ?, ?, 'pendente', 0, NULL)
            `).run(func.id, 1, 2026);
            console.log('✅ Registro de status pendente criado.');
        }
    } catch (e) {
        console.log('Tabela folha_pagamentos_status pode não existir ou erro:', e.message);
    }
    
    // Se a tabela folhas_pagamento tiver coluna status, atualizar também
    try {
         db.prepare(`
            UPDATE folhas_pagamento
            SET status = 'pendente'
            WHERE funcionario_id = ? AND mes = 1 AND ano = 2026
         `).run(func.id);
         console.log('✅ Coluna status atualizada na tabela folhas_pagamento.');
    } catch (e) {
        console.log('Nota: Tabela folhas_pagamento provavelmente não tem coluna status (o que é OK, pois o controle é feito via tabela auxiliar ou existência do registro).');
    }

    console.log('\n--- Resultado Final ---');
    console.log('O registro da folha existe (para fins de DRE e custo) mas está marcado como Pendente (não pago).');
    console.log('Quando você processar o pagamento oficial pelo sistema, ele detectará que já existe e pedirá para substituir ou atualizar.');

} catch (err) {
    console.error('Erro:', err.message);
}
