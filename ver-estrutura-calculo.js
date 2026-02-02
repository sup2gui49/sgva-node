const folhaService = require('./src/services/folha-calculo.service');

// Calcular folha de um funcionário
const calculo = folhaService.calcularFolhaFuncionario(1, 11, 2025);

console.log('Estrutura do cálculo:');
console.log(JSON.stringify(calculo, null, 2));
