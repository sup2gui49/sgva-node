const axios = require('axios');

async function testarFluxoSemIntegracao() {
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
    
    // Verificar configuração diretamente do banco
    const db = require('better-sqlite3')('database/sgva.db');
    const config = db.prepare('SELECT * FROM sistema_modulos WHERE id = 1').get();
    db.close();
    
    console.log('📋 Configuração de módulos:');
    console.log('  Modo integração:', config.integracao_modo);
    console.log('  Vendas habilitado:', config.vendas_enabled ? 'Sim' : 'Não');
    console.log('  Folha habilitada:', config.folha_enabled ? 'Sim' : 'Não');
    
    const temIntegracao = config.integracao_modo !== 'nenhuma';
    console.log('  Verifica saldo?', temIntegracao ? 'Sim' : 'Não\n');
    
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
    
    if (!calcResponse.data.success) {
      console.error('❌ Erro ao calcular:', calcResponse.data.message);
      return;
    }
    
    console.log(`✅ Folha calculada: ${calcResponse.data.data.total} funcionários`);
    console.log(`   Sucessos: ${calcResponse.data.data.sucessos}, Erros: ${calcResponse.data.data.erros}\n`);
    
    // Preparar dados para confirmação
    const folhaData = {
      mes: 12,
      ano: 2025,
      folha_pagamento: calcResponse.data.data.folhas,
      resumo: calcResponse.data.data.resumo
    };
    
    // Fazer login novamente para evitar expiração de token
    const login2 = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    const token2 = login2.data.token;
    
    // Confirmar pagamento
    console.log('✅ Confirmando pagamento...');
    const confirmResponse = await axios.post('http://localhost:3000/api/folha/confirmar-pagamento', 
      folhaData,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token2}` 
        }
      }
    );
    
    console.log('✅', confirmResponse.data.message);
    console.log('   Integração ativa?', confirmResponse.data.data.integracao.ativo ? 'Sim' : 'Não');
    console.log('   Funcionários processados:', confirmResponse.data.data.funcionarios_processados);
    
    if (confirmResponse.data.data.integracao.ativo) {
      console.log('   Despesa salários ID:', confirmResponse.data.data.despesa_salarios_id);
      console.log('   Despesa INSS ID:', confirmResponse.data.data.despesa_inss_patronal_id);
    }
    
    // Verificar status no histórico
    console.log('\n📊 Verificando histórico de folhas...');
    const historicoResponse = await axios.get('http://localhost:3000/api/folha-profissional/folhas', {
      params: { mes: 12, ano: 2025 },
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    
    const folhas = historicoResponse.data.data;
    console.log(`   Folhas encontradas: ${folhas.length}`);
    
    const statusPagos = folhas.filter(f => f.status_pagamento === 'pago').length;
    const statusPendentes = folhas.filter(f => f.status_pagamento === 'pendente').length;
    
    console.log(`   Status "pago": ${statusPagos}`);
    console.log(`   Status "pendente": ${statusPendentes}`);
    
    if (statusPagos === folhas.length) {
      console.log('\n✅ SUCESSO! Todos os funcionários aparecem como "pago"\n');
    } else {
      console.log('\n❌ ERRO! Alguns funcionários ainda aparecem como "pendente"\n');
    }
    
    // Verificar DRE se houver integração
    if (temIntegracao) {
      console.log('📈 Verificando DRE...');
      const dreResponse = await axios.get('http://localhost:3000/api/financeiro/dre', {
        params: { mes: 12, ano: 2025 },
        headers: { 'Authorization': `Bearer ${token2}` }
      });
      
      const despesasPessoal = dreResponse.data.dre.despesas_pessoal;
      console.log('   Salários líquidos:', despesasPessoal.salarios_liquidos);
      console.log('   INSS patronal:', despesasPessoal.inss_patronal);
      console.log('   Total custo pessoal:', despesasPessoal.total_custo_pessoal);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testarFluxoSemIntegracao();
