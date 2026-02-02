const http = require('http');

const API_URL = 'http://localhost:3000/api';

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

async function testarCadastroCategoria() {
    console.log('='.repeat(70));
    console.log('TESTE: Cadastro de Categoria');
    console.log('='.repeat(70));
    
    const novaCategoria = {
        nome: 'Teste Categoria Nova',
        descricao: 'Categoria de teste criada via API',
        encargos_especificos: 'Teste 10%',
        ativo: 1
    };
    
    console.log('\n1. Enviando requisição POST...');
    console.log('Dados:', JSON.stringify(novaCategoria, null, 2));
    
    try {
        const result = await httpRequest(`${API_URL}/folha-profissional`, 'POST', novaCategoria);
        
        console.log('\n2. Resposta:');
        console.log(`Status: ${result.status}`);
        console.log('Dados:', JSON.stringify(result.data, null, 2));
        
        if (result.data.success) {
            console.log('\n✓ SUCESSO! Categoria criada com ID:', result.data.data.id);
        } else {
            console.log('\n✗ FALHA:', result.data.message);
        }
        
    } catch (error) {
        console.error('\n✗ ERRO:', error.message);
    }
    
    console.log('\n' + '='.repeat(70));
}

async function testarAtribuicaoSubsidio() {
    console.log('\n\n');
    console.log('='.repeat(70));
    console.log('TESTE: Atribuição de Subsídio');
    console.log('='.repeat(70));
    
    console.log('\n1. Buscando subsídio e funcionário...');
    
    try {
        const subsResp = await httpRequest(`${API_URL}/subsidios`, 'GET');
        const funcResp = await httpRequest(`${API_URL}/funcionarios`, 'GET');
        
        if (!subsResp.data.data || subsResp.data.data.length === 0) {
            console.log('✗ Nenhum subsídio encontrado!');
            return;
        }
        
        if (!funcResp.data.data || funcResp.data.data.length === 0) {
            console.log('✗ Nenhum funcionário encontrado!');
            return;
        }
        
        const subsidio = subsResp.data.data[0];
        const funcionario = funcResp.data.data[0];
        
        console.log(`  Subsídio: [${subsidio.id}] ${subsidio.nome}`);
        console.log(`  Funcionário: [${funcionario.id}] ${funcionario.nome}`);
        
        console.log('\n2. Atribuindo subsídio ao funcionário...');
        
        const atribuicao = {
            funcionario_id: funcionario.id,
            subsidio_id: subsidio.id,
            valor_especifico: null
        };
        
        const result = await httpRequest(`${API_URL}/subsidios/atribuir`, 'POST', atribuicao);
        
        console.log('\n3. Resposta:');
        console.log(`Status: ${result.status}`);
        console.log('Dados:', JSON.stringify(result.data, null, 2));
        
        if (result.data.success) {
            console.log('\n✓ SUCESSO! Subsídio atribuído');
        } else {
            console.log('\n✗ FALHA:', result.data.message);
        }
        
    } catch (error) {
        console.error('\n✗ ERRO:', error.message);
    }
    
    console.log('\n' + '='.repeat(70));
}

async function main() {
    await testarCadastroCategoria();
    await testarAtribuicaoSubsidio();
}

main();
