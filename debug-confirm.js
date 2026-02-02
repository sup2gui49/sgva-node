const fetch = globalThis.fetch || require('node-fetch');

(async () => {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sgva.com', senha: 'admin123' })
    });
    const loginData = await loginRes.json();
    console.log('login status', loginRes.status, loginData.message);
    const token = loginData.data?.token;
    if (!token) throw new Error('Sem token');

    const calcRes = await fetch('http://localhost:3000/api/folha-profissional/calcular-completa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ mes: 12, ano: 2025 })
    });
    const calcData = await calcRes.json();
    console.log('calc status', calcRes.status, calcData.message);

    const payload = {
      mes: 12,
      ano: 2025,
      folha_pagamento: calcData.data?.folhas || [],
      resumo: {
        total_funcionarios: calcData.data?.total,
        total_salario_base: calcData.data?.total_salario_base,
        total_inss_empregado: calcData.data?.total_inss_empregado,
        total_inss_patronal: calcData.data?.total_inss_patronal,
        total_irt: calcData.data?.total_irt,
        total_descontos: calcData.data?.total_descontos,
        total_salario_liquido: calcData.data?.total_liquido,
        total_custo_empresa: calcData.data?.total_empresa
      }
    };

    const confirmRes = await fetch('http://localhost:3000/api/folha/confirmar-pagamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const confirmData = await confirmRes.json();
    console.log('confirm status', confirmRes.status, confirmData);
  } catch (err) {
    console.error('erro', err);
  }
})();
