const axios = require('axios');

async function testarConfirmarPagamento() {
  try {
    console.log('🔐 Login...\n');
    
    const login = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    }, { headers: { 'Content-Type': 'application/json' } });
    
    const token = login.data.token;
    
    // Limpar dezembro
    const db = require('better-sqlite3')('database/sgva.db');
    console.log('🧹 Limpando dezembro...');
    db.prepare('DELETE FROM folhas_pagamento WHERE mes = 12 AND ano = 2025').run();
    db.prepare('DELETE FROM folha_pagamentos_status WHERE mes = 12 AND ano = 2025').run();
    db.prepare("DELETE FROM despesas WHERE data LIKE '2025-12%'").run();
    db.close();
    console.log('✅ Limpo\n');
    
    // Calcular folha
    console.log('💰 Calculando folha...');
    const calc = await axios.post('http://localhost:3000/api/folha-profissional/calcular-completa', {
      mes: 12,
      ano: 2025
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    
    console.log(`✅ ${calc.data.data.total} folhas calculadas\n`);
    
    // Novo login para garantir token válido
    const login2 = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    }, { headers: { 'Content-Type': 'application/json' } });
    const token2 = login2.data.token;
    
    // Preparar payload como o frontend faz
    const payload = {
      mes: 12,
      ano: 2025,
      folha_pagamento: calc.data.data.folhas,
      resumo: {
        total_funcionarios: calc.data.data.total,
        total_salario_base: calc.data.data.total_salario_base,
        total_inss_empregado: calc.data.data.total_inss_empregado,
        total_inss_patronal: calc.data.data.total_inss_patronal,
        total_irt: calc.data.data.total_irt,
        total_descontos: calc.data.data.total_descontos,
        total_salario_liquido: calc.data.data.total_liquido,
        total_custo_empresa: calc.data.data.total_empresa
      }
    };
    
    console.log('✅ Confirmando pagamento...');
    const confirm = await axios.post('http://localhost:3000/api/folha/confirmar-pagamento', 
      payload,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token2}` 
        }
      }
    );
    
    console.log('✅', confirm.data.message);
    console.log('   Funcionários processados:', confirm.data.data.funcionarios_processados);
    console.log('   Integração ativa:', confirm.data.data.integracao.ativo);
    
    if (confirm.data.data.integracao.ativo) {
      console.log('   Despesa salários ID:', confirm.data.data.despesa_salarios_id);
      console.log('   Despesa INSS ID:', confirm.data.data.despesa_inss_patronal_id);
    }
    
    console.log('\n✅ SUCESSO! Teste passou');
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testarConfirmarPagamento();
