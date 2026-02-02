const http = require('http');

function httpRequest(url, method, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testarLogin() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TESTE: Login API');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const credenciais = {
        email: 'admin@sgva.com',
        senha: 'admin123'
    };
    
    console.log('1. Testando login com:', credenciais.email);
    
    try {
        const result = await httpRequest('http://localhost:3000/api/auth/login', 'POST', credenciais);
        
        console.log('\n2. Resposta:');
        console.log(`Status: ${result.status}`);
        console.log('Dados:', JSON.stringify(result.data, null, 2));
        
        if (result.data.success) {
            console.log('\n✓ LOGIN FUNCIONANDO!');
            console.log(`Token: ${result.data.data.token.substring(0, 20)}...`);
            console.log(`Usuário: ${result.data.data.user.nome}`);
        } else {
            console.log('\n✗ FALHA:', result.data.message);
        }
        
    } catch (error) {
        console.error('\n✗ ERRO:', error.message);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
}

testarLogin();
