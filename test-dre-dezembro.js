const axios = require('axios');

async function testDREDezembro() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login bem-sucedido\n');
    
    // Buscar DRE de Dezembro 2025
    const dreResponse = await axios.get('http://localhost:3000/api/financeiro/dre', {
      params: { mes: 12, ano: 2025 },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📊 DRE - Dezembro 2025\n');
    console.log('Resposta completa:', JSON.stringify(dreResponse.data, null, 2));
    
    if (dreResponse.data.despesas_operacionais?.despesas_pessoal) {
      console.log('\nDespesas Operacionais:');
      console.log('  Despesas Pessoal:', dreResponse.data.despesas_operacionais.despesas_pessoal);
      console.log('\nDetalhes:');
      console.log('  Total Custo Pessoal:', dreResponse.data.despesas_operacionais.despesas_pessoal.total_custo_pessoal?.toLocaleString('pt-AO') + ' KZ');
      console.log('  Folha Pagamento:', dreResponse.data.despesas_operacionais.despesas_pessoal.folha_pagamento?.toLocaleString('pt-AO') + ' KZ');
      console.log('  INSS Patronal:', dreResponse.data.despesas_operacionais.despesas_pessoal.inss_patronal?.toLocaleString('pt-AO') + ' KZ');
      
      // Comparar com o que esperamos
      const esperado = 522702.128011 + 48087.138399999996;
      console.log('\n🎯 Valor Esperado:', esperado.toLocaleString('pt-AO'), 'KZ');
      console.log('📊 Valor Retornado:', dreResponse.data.despesas_operacionais.despesas_pessoal.total_custo_pessoal?.toLocaleString('pt-AO'), 'KZ');
      
      if (Math.abs(dreResponse.data.despesas_operacionais.despesas_pessoal.total_custo_pessoal - esperado) < 0.01) {
        console.log('\n✅ DRE está correto!');
      } else {
        console.log('\n❌ DRE ainda mostra valor incorreto');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testDREDezembro();
