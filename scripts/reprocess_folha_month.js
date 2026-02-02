const db = require('../src/config/database');
const folhaService = require('../src/services/folha-calculo.service');
const { getModuleConfig, shouldSyncFolhaToVendas } = require('../src/config/module-flags');

const mes = parseInt(process.argv[2] || '12', 10);
const ano = parseInt(process.argv[3] || '2025', 10);

async function main() {
  const funcionarios = db.prepare('SELECT * FROM funcionarios WHERE ativo = 1').all();
  if (!funcionarios.length) {
    console.log('Nenhum funcionário ativo para processar.');
    return;
  }

  console.log(`Recalculando folha para ${funcionarios.length} funcionário(s) - ${mes}/${ano}`);

  const folha = funcionarios.map(func => folhaService.calcularFolhaFuncionario(func.id, mes, ano));

  const resumo = folha.reduce((acc, item) => {
    acc.total_salario_base += item.salario_base || 0;
    acc.total_subsidios += item.subsidios?.total || 0;
    acc.total_descontos += item.total_descontos || 0;
    acc.total_salario_liquido += item.salario_liquido || 0;
    acc.total_inss_patronal += item.inss?.patronal || 0;
    acc.total_inss_empregado += item.inss?.empregado || 0;
    acc.total_irt += item.irt?.valor || 0;
    return acc;
  }, {
    total_salario_base: 0,
    total_subsidios: 0,
    total_descontos: 0,
    total_salario_liquido: 0,
    total_inss_patronal: 0,
    total_inss_empregado: 0,
    total_irt: 0
  });

  console.log('Resumo recalculado:', resumo);

  const moduleConfig = getModuleConfig();
  const syncWithVendas = shouldSyncFolhaToVendas(moduleConfig);

  const dataPagamento = new Date(ano, mes, 0).toISOString().split('T')[0];
  let despesaSalariosId = null;
  let despesaInssId = null;

  if (syncWithVendas) {
    const existente = db.prepare(`
      SELECT id FROM despesas 
      WHERE categoria = 'salarios' 
        AND strftime('%Y', data) = ? 
        AND strftime('%m', data) = ?
    `).get(ano.toString(), mes.toString().padStart(2, '0'));

    if (existente) {
      throw new Error(`Já existe despesa de salários para ${mes}/${ano}`);
    }

    const resultSalarios = db.prepare(`
      INSERT INTO despesas (tipo, categoria, descricao, valor, data, pago, observacoes)
      VALUES ('fixa', 'salarios', ?, ?, ?, 1, ?)
    `).run(
      `Folha de Pagamento - ${mes}/${ano}`,
      resumo.total_salario_liquido,
      dataPagamento,
      `Salários pagos a ${funcionarios.length} funcionários. Base: ${resumo.total_salario_base} KZ`
    );

    const resultINSSPatronal = db.prepare(`
      INSERT INTO despesas (tipo, categoria, descricao, valor, data, pago, observacoes)
      VALUES ('fixa', 'inss_patronal', ?, ?, ?, 1, ?)
    `).run(
      `INSS Patronal - ${mes}/${ano}`,
      resumo.total_inss_patronal,
      dataPagamento,
      `Contribuição patronal 8% sobre folha de ${mes}/${ano}`
    );

    despesaSalariosId = resultSalarios.lastInsertRowid;
    despesaInssId = resultINSSPatronal.lastInsertRowid;
  }

  const insertFolha = db.prepare(`
    INSERT INTO folhas_pagamento (
      mes, ano, funcionario_id, salario_base, total_subsidios, 
      subsidios_isentos, subsidios_tributaveis, salario_bruto,
      inss_empregado, inss_patronal, deducao_fixa, rendimento_colectavel,
      irt, total_descontos, salario_liquido, calculado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  const insertSubsidioDetalhe = db.prepare(`
    INSERT INTO folha_subsidios_detalhes (
      folha_id, subsidio_id, nome_subsidio, valor, valor_isento, valor_tributavel
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStatus = db.prepare(`
    INSERT OR REPLACE INTO folha_pagamentos_status (
      funcionario_id, mes, ano, status, valor_pago, pago_em
    ) VALUES (?, ?, ?, 'pago', ?, datetime('now', 'localtime'))
  `);

  folha.forEach(calculo => {
    const funcionarioId = calculo.funcionario?.id;
    const result = insertFolha.run(
      mes,
      ano,
      funcionarioId,
      calculo.salario_base,
      calculo.subsidios?.total || 0,
      calculo.subsidios?.isento || 0,
      calculo.subsidios?.tributavel || 0,
      calculo.salario_bruto,
      calculo.inss?.empregado || 0,
      calculo.inss?.patronal || 0,
      calculo.deducao_fixa || 0,
      calculo.rendimento_colectavel || 0,
      calculo.irt?.valor || 0,
      calculo.total_descontos || 0,
      calculo.salario_liquido || 0
    );

    const folhaId = result.lastInsertRowid;

    (calculo.subsidios?.detalhes || []).forEach(det => {
      insertSubsidioDetalhe.run(
        folhaId,
        det.id || det.subsidio_id || null,
        det.nome,
        det.valor,
        det.isento,
        det.tributavel
      );
    });

    insertStatus.run(funcionarioId, mes, ano, calculo.salario_liquido || 0);
  });

  console.log(`Folha de ${mes}/${ano} recalculada e salva com sucesso.`);
  if (syncWithVendas) {
    console.log('Despesas registradas:', { despesaSalariosId, despesaInssId });
  }
}

main().catch(err => {
  console.error('Erro ao reprocessar folha:', err.message);
  process.exit(1);
});
