const http = require('http');

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando endpoints com autenticação\n');

  try {
    // 1. Fazer login
    console.log('📍 Fazendo login...');
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@sgva.com',
      senha: 'admin123'
    });

    if (loginResult.status !== 200) {
      console.log('❌ Login falhou:', loginResult.data);
      console.log('\n📍 Tentando criar usuário admin...');
      
      const registerResult = await makeRequest('/api/auth/register', 'POST', {
        nome: 'Administrador',
        email: 'admin@sgva.com',
        senha: 'admin123',
        funcao: 'admin',
        role: 'admin'
      });
      
      console.log('Registro:', registerResult);
      
      // Tentar login novamente
      const loginRetry = await makeRequest('/api/auth/login', 'POST', {
        email: 'admin@sgva.com',
        senha: 'admin123'
      });
      
      if (loginRetry.status !== 200) {
        console.log('❌ Login falhou novamente');
        return;
      }
      
      var token = loginRetry.data.data ? loginRetry.data.data.token : loginRetry.data.token;
    } else {
      var token = loginResult.data.data ? loginResult.data.data.token : loginResult.data.token;
    }

    console.log('✅ Login bem-sucedido!');
    console.log('Token:', token ? token.substring(0, 50) + '...' : 'sem token', '\n');

    // 2. Testar endpoints com token
    const tests = [
      { name: 'Calcular Completa', path: '/api/folha-profissional/calcular-completa', method: 'POST', data: { mes: 11, ano: 2025 } },
      { name: 'Confirmar Pagamento', path: '/api/folha/confirmar-pagamento', method: 'POST', data: { mes: 11, ano: 2025 } },
      { name: 'Funcionários', path: '/api/funcionarios' },
      { name: 'DRE', path: '/api/financeiro/dre' }
    ];

    for (const test of tests) {
      console.log(`📍 Testando: ${test.name} (${test.path})`);
      const result = await makeRequest(test.path, test.method || 'GET', test.data, token);
      
      if (result.status === 200) {
        console.log(`✅ Status: ${result.status}`);
        const preview = JSON.stringify(result.data, null, 2).substring(0, 300);
        console.log(`📦 Dados:`, preview);
      } else {
        console.log(`❌ Status: ${result.status}`);
        console.log(`Erro:`, result.data);
      }
      console.log();
    }

    console.log('✅ Testes concluídos!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

runTests();
