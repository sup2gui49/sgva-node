const axios = require('axios');

async function testarPagamentoIndividual() {
  try {
    console.log('🔐 Fazendo login...\n');
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login bem-sucedido\n');
    
    // Limpar status anterior
    const db = require('better-sqlite3')('database/sgva.db');
    console.log('🧹 Limpando status de dezembro...');
    db.prepare('DELETE FROM folha_pagamentos_status WHERE mes = 12 AND ano = 2025').run();
    console.log('✅ Limpo\n');
    
    // Calcular folha
    console.log('💰 Calculando folha de dezembro 2025...');
    const calcResponse = await axios.post('http://localhost:3000/api/folha-profissional/calcular-completa', {
      mes: 12,
      ano: 2025
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    
    const folhas = calcResponse.data.data.folhas;
    console.log(`✅ ${folhas.length} folhas calculadas\n`);
    
    // Pegar primeiro funcionário
    const primeiroFunc = folhas[0];
    console.log(`👤 Pagando ${primeiroFunc.funcionario.nome}...`);
    console.log(`   Valor: ${primeiroFunc.salario_liquido.toLocaleString('pt-AO')} KZ`);
    
    // Fazer pagamento individual
    const pagamentoResponse = await axios.post('http://localhost:3000/api/folha-profissional/pagamentos', {
      mes: 12,
      ano: 2025,
      pagamentos: [{
        funcionario_id: primeiroFunc.funcionario.id,
        valor: primeiroFunc.salario_liquido,
        descricao: `Pagamento Salário - ${primeiroFunc.funcionario.nome} - 12/2025`,
        observacoes: `Ref: ${primeiroFunc.funcionario.nome} - 12/2025`
      }]
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    
    console.log('✅', pagamentoResponse.data.message);
    
    // Verificar status no banco
    console.log('\n📊 Verificando status no banco...');
    const status = db.prepare(`
      SELECT * FROM folha_pagamentos_status 
      WHERE funcionario_id = ? AND mes = 12 AND ano = 2025
    `).get(primeiroFunc.funcionario.id);
    
    if (status) {
      console.log(`   Status: ${status.status}`);
      console.log(`   Valor pago: ${status.valor_pago.toLocaleString('pt-AO')} KZ`);
      console.log(`   Pago em: ${status.pago_em}`);
    } else {
      console.log('   ❌ Nenhum status encontrado!');
    }
    
    // Verificar via API
    console.log('\n📋 Verificando via API /folhas...');
    const folhasResponse = await axios.get('http://localhost:3000/api/folha-profissional/folhas', {
      params: { mes: 12, ano: 2025, funcionario_id: primeiroFunc.funcionario.id },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const folhaAPI = folhasResponse.data.data[0];
    if (folhaAPI) {
      console.log(`   ${folhaAPI.funcionario_nome}: ${folhaAPI.status_pagamento}`);
      
      if (folhaAPI.status_pagamento === 'pago') {
        console.log('\n✅ SUCESSO! Status atualizado para "pago"');
      } else {
        console.log('\n❌ ERRO! Status ainda é "pendente"');
      }
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testarPagamentoIndividual();
