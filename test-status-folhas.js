const http = require('http');

http.get('http://localhost:3000/api/folha-profissional/folhas?mes=11&ano=2025', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Total de folhas:', json.total);
    console.log('\nDetalhes:\n');
    json.data.forEach(f => {
      console.log(`ID: ${f.id}`);
      console.log(`Funcionário: ${f.funcionario_nome}`);
      console.log(`Status: ${f.status_pagamento}`);
      console.log(`Líquido: ${f.salario_liquido} KZ`);
      if (f.pago_em) {
        console.log(`Pago em: ${f.pago_em}`);
      }
      console.log('---');
    });
  });
}).on('error', err => console.error('Erro:', err.message));
