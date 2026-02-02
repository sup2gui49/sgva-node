const db = require('./src/config/database');

try {
    console.log('--- Verificando Folhas de Pagamento (Jan/2026) ---');
    
    // 1. Listar todas as folhas para o período
    const folhas = db.prepare(`
        SELECT * FROM folhas_pagamento 
        WHERE ano = 2026 AND mes = 1
    `).all();

    console.log(`Encontradas ${folhas.length} folhas registradas.`);
    
    if (folhas.length > 0) {
        folhas.forEach(folha => {
            console.log(`\nID: ${folha.id} | Func: ${folha.funcionario_id} | Líquido: ${folha.salario_liquido} | Status: ${folha.status}`);
        });
    }

    // 2. Verificar funcionário Guilherme Monteiro
    const func = db.prepare(`SELECT * FROM funcionarios WHERE nome LIKE '%Guilherme%'`).get();
    if (func) {
        console.log(`\nFuncionário encontrado: ${func.nome} (ID: ${func.id})`);
        // Ver se tem folha para ele
        const folhaGuilherme = db.prepare(`SELECT * FROM folhas_pagamento WHERE funcionario_id = ? AND ano = 2026 AND mes = 1`).get(func.id);
        if (folhaGuilherme) {
            console.log('Folha do Guilherme encontrada no banco:', folhaGuilherme);
        } else {
            console.log('⚠️ Nenhuma folha encontrada para o Guilherme em 1/2026.');
        }
    } else {
        console.log('⚠️ Funcionário "Guilherme" não encontrado no banco.');
    }

    // 3. Verificar despesas de Salários
    console.log('\n--- Verificando Despesas (Jan/2026) ---');
    const despesas = db.prepare(`
        SELECT * FROM despesas 
        WHERE strftime('%Y', data) = '2026' 
        AND strftime('%m', data) = '01'
        AND categoria IN ('salarios', 'inss_patronal')
    `).all();
    console.log(`Encontradas ${despesas.length} despesas de salários/encargos.`);
    despesas.forEach(d => {
        console.log(`ID: ${d.id} | Categoria: ${d.categoria} | Valor: ${d.valor} | Pago: ${d.pago}`);
    });

} catch (err) {
    console.error('Erro:', err.message);
}
