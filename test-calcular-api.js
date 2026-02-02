const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testarCalcular() {
  console.log('🧪 Testando API /calcular\n');

  // 1. Login para obter token
  console.log('1️⃣ Fazendo login...');
  const loginResponse = await fetch('http://localhost:3000/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@sgva.com',
      senha: 'admin123'
    })
  });
  const loginData = await loginResponse.json();
  
  if (!loginData.success) {
    console.error('❌ Erro no login:', loginData);
    return;
  }
  
  const token = loginData.token;
  console.log('✅ Login bem-sucedido!\n');

  // 2. Buscar funcionários
  console.log('2️⃣ Buscando funcionários...');
  const funcResponse = await fetch('http://localhost:3000/api/funcionarios', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const funcData = await funcResponse.json();
  
  if (!funcData.success || !funcData.data || funcData.data.length === 0) {
    console.error('❌ Nenhum funcionário encontrado:', funcData);
    return;
  }
  
  const funcionario = funcData.data[0];
  console.log(`✅ Funcionário encontrado: ${funcionario.nome} (ID: ${funcionario.id})\n`);

  // 3. Calcular folha
  console.log('3️⃣ Calculando folha...');
  const calcResponse = await fetch(`http://localhost:3000/api/folha-profissional/calcular/${funcionario.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ mes: 11, ano: 2025 })
  });
  
  console.log('Status:', calcResponse.status);
  
  const calcData = await calcResponse.json();
  console.log('Resposta completa:', JSON.stringify(calcData, null, 2));
  
  if (calcData.success && calcData.data) {
    console.log('\n✅ CÁLCULO BEM-SUCEDIDO!');
    console.log('Funcionário:', calcData.data.funcionario.nome);
    console.log('Salário Base:', calcData.data.salario_base);
    console.log('Subsídios Total:', calcData.data.subsidios?.total || 0);
    console.log('Subsídios Detalhes:', calcData.data.subsidios?.detalhes?.length || 0, 'itens');
    console.log('Salário Líquido:', calcData.data.salario_liquido);
  } else {
    console.error('\n❌ ERRO NO CÁLCULO!');
    console.error('Mensagem:', calcData.message);
    console.error('Erro:', calcData.error);
  }
}

testarCalcular().catch(console.error);
