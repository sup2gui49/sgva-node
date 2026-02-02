const http = require('http');

const BASE_URL = 'http://localhost:3000';

function testEndpoint(path, method = 'GET') {
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

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando endpoints da API SGVA\n');

  const tests = [
    { name: 'Subsídios', path: '/api/subsidios' },
    { name: 'DRE', path: '/api/financeiro/dre' },
    { name: 'Funcionários', path: '/api/funcionarios' },
    { name: 'Calcular Completa', path: '/api/folha/calcular-completa' },
    { name: 'Confirmar Pagamento', path: '/api/folha/confirmar-pagamento' }
  ];

  for (const test of tests) {
    try {
      console.log(`\n📍 Testando: ${test.name} (${test.path})`);
      const result = await testEndpoint(test.path);
      
      if (result.status === 200) {
        console.log(`✅ Status: ${result.status}`);
        console.log(`📦 Dados:`, JSON.stringify(result.data, null, 2).substring(0, 500));
      } else {
        console.log(`⚠️  Status: ${result.status}`);
        console.log(`❌ Erro:`, result.data);
      }
    } catch (error) {
      console.log(`❌ Erro ao testar ${test.name}:`, error.message);
    }
  }

  console.log('\n✅ Testes concluídos!');
}

runTests().catch(console.error);
