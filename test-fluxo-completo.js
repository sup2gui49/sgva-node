const http = require('http');

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => reject(error));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testarFluxoCompleto() {
  console.log('🧪 Testando Fluxo Completo: Calcular → Confirmar → DRE\n');

  try {
    // 1. Login
    console.log('1️⃣  Login...');
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    });

    if (loginResult.status !== 200) {
      console.log('❌ Falhou');
      return;
    }

    const token = loginResult.data.data ? loginResult.data.data.token : loginResult.data.token;
    console.log('✅ OK\n');

    // 2. Calcular folha
    console.log('2️⃣  Calculando folha (dezembro/2025)...');
    const calcularResult = await makeRequest('/api/folha-profissional/calcular-completa', 'POST', {
      mes: 12,
      ano: 2025
    }, token);

    if (calcularResult.status !== 200) {
      console.log('❌ Erro:', calcularResult.data);
      return;
    }

    console.log('✅ Calculada!');
    console.log(`   Total funcionários: ${calcularResult.data.data.total}`);
    console.log(`   Total líquido: ${calcularResult.data.data.total_liquido.toFixed(2)} KZ\n`);

    const folhaCalculada = {
      mes: 12,
      ano: 2025,
      folha_pagamento: calcularResult.data.data.folhas,
      resumo: {
        total_funcionarios: calcularResult.data.data.total,
        total_salario_base: calcularResult.data.data.total_salario_base,
        total_inss_empregado: calcularResult.data.data.total_inss_empregado,
        total_inss_patronal: calcularResult.data.data.total_inss_patronal,
        total_irt: calcularResult.data.data.total_irt,
        total_descontos: calcularResult.data.data.total_descontos,
        total_salario_liquido: calcularResult.data.data.total_liquido,
        total_custo_empresa: calcularResult.data.data.total_empresa
      }
    };

    // 3. DRE Antes
    console.log('3️⃣  DRE ANTES do pagamento...');
    const dreAntesResult = await makeRequest('/api/financeiro/dre?mes=12&ano=2025', 'GET', null, token);
    const dreAntes = dreAntesResult.data.dre;
    const despesasAntesValue = typeof dreAntes.despesas_pessoal === 'object' 
      ? (dreAntes.despesas_pessoal?.total_custo_pessoal || '0.00')
      : (dreAntes.despesas_pessoal || '0.00');
    console.log(`   Despesas pessoal: ${despesasAntesValue} KZ\n`);

    // 4. Confirmar pagamento
    console.log('4️⃣  Confirmando pagamento...');
    const confirmarResult = await makeRequest('/api/folha/confirmar-pagamento', 'POST', folhaCalculada, token);

    if (confirmarResult.status === 200) {
      console.log('✅ Pagamento confirmado!');
      console.log(`   ${confirmarResult.data.message}\n`);
    } else {
      console.log(`⚠️  Status: ${confirmarResult.status}`);
      console.log('   Resposta:', JSON.stringify(confirmarResult.data, null, 2), '\n');
    }

    // 5. DRE Depois
    console.log('5️⃣  DRE DEPOIS do pagamento...');
    const dreDepoisResult = await makeRequest('/api/financeiro/dre?mes=12&ano=2025', 'GET', null, token);
    const dreDepois = dreDepoisResult.data.dre;
    const despesasDepoisValue = typeof dreDepois.despesas_pessoal === 'object'
      ? (dreDepois.despesas_pessoal?.total_custo_pessoal || '0.00')
      : (dreDepois.despesas_pessoal || '0.00');
    console.log(`   Despesas pessoal: ${despesasDepoisValue} KZ\n`);

    // 6. Comparar
    console.log('6️⃣  Validação:');
    const despesasAntes = parseFloat(despesasAntesValue || 0);
    const despesasDepois = parseFloat(despesasDepoisValue || 0);
    const diferenca = despesasDepois - despesasAntes;

    if (diferenca > 0) {
      console.log(`✅ Integração OK!`);
      console.log(`   Despesas aumentaram: +${diferenca.toFixed(2)} KZ`);
    } else {
      console.log(`⚠️  Atenção: Despesas não aumentaram`);
    }

    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testarFluxoCompleto();
