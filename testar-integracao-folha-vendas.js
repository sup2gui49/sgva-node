const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = 'C:\\xampp\\htdocs\\sgva-node\\database\\sgva.db';
const db = sqlite3(dbPath);

console.log('\n🔍 VERIFICAÇÃO DA INTEGRAÇÃO FOLHA → VENDAS\n');
console.log('='.repeat(60));

// 1. Verificar configuração do sistema
console.log('\n1️⃣ CONFIGURAÇÃO DO SISTEMA');
const config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
if (config) {
    console.log(`   ✅ Regime IVA: ${config.regime_iva}`);
    console.log(`   ✅ Taxa INSS: ${config.taxa_inss_empregado}% (empregado) / ${config.taxa_inss_patronal}% (patronal)`);
} else {
    console.log('   ❌ Configuração não encontrada');
}

// 2. Verificar estrutura das tabelas
console.log('\n2️⃣ ESTRUTURA DAS TABELAS');

const tabelasFolha = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'folhas%'
`).all();
console.log(`   ✅ Tabelas de folha: ${tabelasFolha.map(t => t.name).join(', ')}`);

const colunasFolha = db.prepare(`PRAGMA table_info(folhas_pagamento)`).all();
console.log(`   ✅ Colunas folhas_pagamento: ${colunasFolha.length} colunas`);
console.log(`      ${colunasFolha.map(c => c.name).join(', ')}`);

// 3. Verificar dados da folha
console.log('\n3️⃣ DADOS DA FOLHA DE PAGAMENTO');
const folhasRegistradas = db.prepare(`
    SELECT 
        ano,
        mes,
        COUNT(*) as total_registros,
        SUM(salario_base) as total_salario_base,
        SUM(inss_empregado) as total_inss_empregado,
        SUM(inss_patronal) as total_inss_patronal,
        SUM(irt) as total_irt,
        SUM(salario_liquido) as total_salario_liquido
    FROM folhas_pagamento
    GROUP BY ano, mes
    ORDER BY ano DESC, mes DESC
    LIMIT 5
`).all();

if (folhasRegistradas.length > 0) {
    console.log(`   ✅ ${folhasRegistradas.length} período(s) com folhas registradas:`);
    folhasRegistradas.forEach(f => {
        console.log(`\n   📅 ${f.mes}/${f.ano}`);
        console.log(`      - ${f.total_registros} funcionários`);
        console.log(`      - Salário Base Total: ${formatMoney(f.total_salario_base)} KZ`);
        console.log(`      - INSS Empregado: ${formatMoney(f.total_inss_empregado)} KZ`);
        console.log(`      - INSS Patronal: ${formatMoney(f.total_inss_patronal)} KZ`);
        console.log(`      - IRT: ${formatMoney(f.total_irt)} KZ`);
        console.log(`      - Salário Líquido: ${formatMoney(f.total_salario_liquido)} KZ`);
    });
} else {
    console.log('   ⚠️  Nenhuma folha registrada ainda');
}

// 4. Verificar despesas registradas
console.log('\n4️⃣ DESPESAS REGISTRADAS (Sistema de Vendas)');

const categoriasDespesas = db.prepare(`
    SELECT 
        categoria,
        COUNT(*) as total_registros,
        SUM(valor) as total_valor
    FROM despesas
    GROUP BY categoria
    ORDER BY categoria
`).all();

if (categoriasDespesas.length > 0) {
    console.log(`   ✅ ${categoriasDespesas.length} categoria(s) de despesas:`);
    categoriasDespesas.forEach(c => {
        console.log(`      - ${c.categoria}: ${c.total_registros} registro(s) = ${formatMoney(c.total_valor)} KZ`);
    });
} else {
    console.log('   ⚠️  Nenhuma despesa registrada');
}

// 5. Verificar integração (despesas de salários vs folha)
console.log('\n5️⃣ VERIFICAÇÃO DA INTEGRAÇÃO');

const despesasSalarios = db.prepare(`
    SELECT 
        strftime('%m', data) as mes,
        strftime('%Y', data) as ano,
        SUM(valor) as total_despesa
    FROM despesas
    WHERE categoria = 'salarios'
    GROUP BY mes, ano
    ORDER BY ano DESC, mes DESC
    LIMIT 5
`).all();

const despesasINSS = db.prepare(`
    SELECT 
        strftime('%m', data) as mes,
        strftime('%Y', data) as ano,
        SUM(valor) as total_despesa
    FROM despesas
    WHERE categoria = 'inss_patronal'
    GROUP BY mes, ano
    ORDER BY ano DESC, mes DESC
    LIMIT 5
`).all();

if (despesasSalarios.length > 0) {
    console.log('   ✅ Despesas de Salários registradas:');
    despesasSalarios.forEach(d => {
        const folha = folhasRegistradas.find(f => f.mes == d.mes && f.ano == d.ano);
        const inss = despesasINSS.find(i => i.mes == d.mes && i.ano == d.ano);
        
        console.log(`\n   📅 ${d.mes}/${d.ano}`);
        console.log(`      - Despesa Salários: ${formatMoney(d.total_despesa)} KZ`);
        if (inss) {
            console.log(`      - Despesa INSS Patronal: ${formatMoney(inss.total_despesa)} KZ`);
        }
        if (folha) {
            const diferenca = Math.abs(parseFloat(d.total_despesa) - parseFloat(folha.total_salario_liquido));
            if (diferenca < 0.01) {
                console.log(`      ✅ INTEGRADO: Valores correspondem à folha`);
            } else {
                console.log(`      ⚠️  Diferença: ${formatMoney(diferenca)} KZ`);
            }
        } else {
            console.log(`      ⚠️  Sem folha correspondente`);
        }
    });
} else {
    console.log('   ⚠️  Nenhuma despesa de salários registrada');
    console.log('   💡 Para integrar, calcule uma folha e clique em "Confirmar Pagamento"');
}

// 6. Simular cálculo do DRE
console.log('\n6️⃣ SIMULAÇÃO DO CÁLCULO DRE');

const mesAtual = new Date().getMonth() + 1;
const anoAtual = new Date().getFullYear();

const despesasSalariosAtual = db.prepare(`
    SELECT SUM(valor) as total
    FROM despesas
    WHERE strftime('%Y', data) = ?
    AND strftime('%m', data) = ?
    AND categoria = 'salarios'
    AND pago = 1
`).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0'));

const despesasINSSAtual = db.prepare(`
    SELECT SUM(valor) as total
    FROM despesas
    WHERE strftime('%Y', data) = ?
    AND strftime('%m', data) = ?
    AND categoria = 'inss_patronal'
    AND pago = 1
`).get(anoAtual.toString(), mesAtual.toString().padStart(2, '0'));

const folhaAtual = db.prepare(`
    SELECT 
        SUM(salario_base) as total_salario_base,
        SUM(salario_liquido) as total_salario_liquido,
        SUM(inss_patronal) as total_inss_patronal,
        COUNT(*) as total_funcionarios
    FROM folhas_pagamento
    WHERE ano = ? AND mes = ?
`).get(anoAtual, mesAtual);

console.log(`   📅 Mês atual: ${mesAtual}/${anoAtual}`);

if (despesasSalariosAtual.total > 0) {
    console.log(`   ✅ DRE usará valores REAIS:`);
    console.log(`      - Salários Líquidos: ${formatMoney(despesasSalariosAtual.total)} KZ`);
    console.log(`      - INSS Patronal: ${formatMoney(despesasINSSAtual.total || 0)} KZ`);
    console.log(`      - Total Custo Pessoal: ${formatMoney((despesasSalariosAtual.total || 0) + (despesasINSSAtual.total || 0))} KZ`);
} else {
    const funcionariosAtivos = db.prepare(`
        SELECT SUM(salario_base) as total, COUNT(*) as qtd
        FROM funcionarios WHERE ativo = 1
    `).get();
    
    const salarioEstimado = (funcionariosAtivos.total || 0) * 0.87;
    const inssEstimado = (funcionariosAtivos.total || 0) * 0.08;
    
    console.log(`   ⚠️  DRE usará ESTIMATIVAS:`);
    console.log(`      - ${funcionariosAtivos.qtd || 0} funcionários ativos`);
    console.log(`      - Salário Base: ${formatMoney(funcionariosAtivos.total || 0)} KZ`);
    console.log(`      - Salários Líquidos (est.): ${formatMoney(salarioEstimado)} KZ`);
    console.log(`      - INSS Patronal (est.): ${formatMoney(inssEstimado)} KZ`);
    console.log(`\n   💡 Para usar valores reais:`);
    console.log(`      1. Acesse: http://localhost:3000/folha-calculo.html`);
    console.log(`      2. Selecione o mês/ano`);
    console.log(`      3. Clique em "Calcular Todos"`);
    console.log(`      4. Clique em "Confirmar Pagamento e Registrar nas Despesas"`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Verificação concluída!\n');

function formatMoney(value) {
    const numero = Number(value);
    return new Intl.NumberFormat('pt-AO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number.isFinite(numero) ? numero : 0);
}

db.close();
