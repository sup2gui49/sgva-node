const db = require('../config/database');
const {
  getModuleConfig,
  shouldSyncFolhaToVendas
} = require('../config/module-flags');

const DIAS_UTEIS_PADRAO = Number(process.env.DIAS_UTEIS_PADRAO || 22);

function getDiasUteisPadrao() {
  const dias = Number.isFinite(DIAS_UTEIS_PADRAO) && DIAS_UTEIS_PADRAO > 0
    ? DIAS_UTEIS_PADRAO
    : 22;
  return dias;
}

/**
 * Serviço Profissional de Cálculo de Folha de Pagamento
 * Baseado no sistema folha_salarios com conformidade Angola
 */

// ==================== IRT (Imposto sobre Rendimentos do Trabalho) ====================

/**
 * Busca escalões IRT ativos
 */
function getEscaloesIRT() {
  // Tentar primeiro a tabela padrão nova: escaloes_irt
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='escaloes_irt'").get();
    
    if (tableExists) {
       const escaloes = db.prepare(`
        SELECT id, escalao, limite_inferior, limite_superior, taxa_percentual, parcela_abater, descricao
        FROM escaloes_irt
        ORDER BY escalao
      `).all();

      return escaloes.map(e => ({
        id: e.id,
        ordem: e.escalao,
        de: parseFloat(e.limite_inferior),
        ate: e.limite_superior ? parseFloat(e.limite_superior) : null,
        parcela: parseFloat(e.parcela_abater || 0),
        parcela_fixa: parseFloat(e.parcela_abater || 0),
        taxa: parseFloat(e.taxa_percentual) / 100.0,
        excesso: Math.max(0, parseFloat(e.limite_inferior) - 1)
      }));
    }
  } catch (err) {
    console.warn('Erro ao ler escaloes_irt, tentando tabela legado:', err);
  }

  // Fallback para tabela antiga (irt_grupos)
  try {
    const escaloes = db.prepare(`
      SELECT id, ordem, de, ate, parcela_fixa, taxa, excesso
      FROM irt_grupos
      WHERE ativo = 1
      ORDER BY ordem
    `).all();

    return escaloes.map(e => ({
      id: e.id,
      ordem: e.ordem,
      de: parseFloat(e.de),
      ate: e.ate ? parseFloat(e.ate) : null,
      parcela: parseFloat(e.parcela_fixa),
      parcela_fixa: parseFloat(e.parcela_fixa),
      taxa: parseFloat(e.taxa),
      excesso: parseFloat(e.excesso)
    }));
  } catch (err) {
    console.error('Falha crítica: Nenhuma tabela de IRT encontrada.');
    return [];
  }
}

/**
 * Calcula IRT baseado nos escalões progressivos de Angola
 * @param {number} rendimentoColectavel - RC após deduções
 * @returns {object} { irt, escalao, detalhes }
 */
function calcularIRT(rendimentoColectavel) {
  const rc = parseFloat(rendimentoColectavel);
  
  if (rc <= 0) {
    return { irt: 0, escalao: '1º Escalão', detalhes: 'Isento (até 70.000 KZ)' };
  }

  const escaloes = getEscaloesIRT();
  
  for (const e of escaloes) {
    // Verifica se RC está neste escalão
    if (rc >= e.de && (e.ate === null || rc <= e.ate)) {
      const irt = e.parcela + (e.taxa * (rc - e.excesso));
      
      return {
        irt: Math.max(0, irt),
        escalao: `${e.ordem}º Escalão`,
        detalhes: `Parcela: ${e.parcela.toLocaleString('pt-AO')} + ${(e.taxa * 100).toFixed(1)}% × (${rc.toLocaleString('pt-AO')} - ${e.excesso.toLocaleString('pt-AO')})`,
        taxa: e.taxa,
        parcela: e.parcela
      };
    }
  }

  // Fallback: último escalão
  const ultimo = escaloes[escaloes.length - 1];
  const irt = ultimo.parcela + (ultimo.taxa * (rc - ultimo.excesso));
  
  return {
    irt: Math.max(0, irt),
    escalao: `${ultimo.ordem}º Escalão`,
    detalhes: 'Escalão máximo',
    taxa: ultimo.taxa,
    parcela: ultimo.parcela
  };
}

// ==================== FALTAS ====================

/**
 * Busca faltas registradas para um funcionário no período
 */
function getFaltasFuncionario(funcionarioId, mes, ano) {
  const registro = db.prepare(`
    SELECT id, funcionario_id, mes, ano, dias_falta, tipo, dias_uteis, desconto_manual, observacoes
    FROM folha_faltas
    WHERE funcionario_id = ? AND mes = ? AND ano = ?
  `).get(funcionarioId, mes, ano);

  if (!registro) {
    return {
      dias_falta: 0,
      tipo: 'injustificada',
      dias_uteis: getDiasUteisPadrao(),
      desconto_manual: null,
      observacoes: null
    };
  }

  return {
    dias_falta: Number(registro.dias_falta) || 0,
    tipo: registro.tipo || 'injustificada',
    dias_uteis: Number(registro.dias_uteis) || getDiasUteisPadrao(),
    desconto_manual: registro.desconto_manual !== null ? Number(registro.desconto_manual) : null,
    observacoes: registro.observacoes || null
  };
}

// ==================== SUBSÍDIOS ====================

/**
 * Busca todos os subsídios ativos
 */
function getSubsidiosAtivos() {
  return db.prepare(`
    SELECT * FROM subsidios WHERE ativo = 1
  `).all();
}

/**
 * Busca subsídios atribuídos a um funcionário
 */
function getSubsidiosFuncionario(funcionarioId) {
  // Buscar subsídios atribuídos diretamente ao funcionário
  const subsidiosDiretos = db.prepare(`
    SELECT s.*, fs.valor_especifico
    FROM subsidios s
    JOIN funcionarios_subsidios fs ON s.id = fs.subsidio_id
    WHERE fs.funcionario_id = ? AND fs.ativo = 1 AND s.ativo = 1
  `).all(funcionarioId);

  // Buscar subsídios aplicáveis a todos
  const subsidiosTodos = db.prepare(`
    SELECT s.*, NULL as valor_especifico
    FROM subsidios s
    WHERE s.aplicar_a = 'todos' AND s.ativo = 1
  `).all();

  // Combinar todos (sem duplicatas)
  const todosSubsidios = [...subsidiosDiretos, ...subsidiosTodos];
  const subsidiosUnicos = Array.from(
    new Map(todosSubsidios.map(s => [s.id, s])).values()
  );

  return subsidiosUnicos;
}

/**
 * Calcula subsídios para um funcionário em um mês específico
 * Implementa REGRAS DE PREVALÊNCIA:
 * - subsidio_manual = NULL → usa subsídios automáticos
 * - subsidio_manual = 0 → sem subsídios
 * - subsidio_manual > 0 → usa valor manual (ignora automáticos)
 */
function calcularSubsidiosFuncionario(funcionario, mes, salarioBaseOverride = null) {
  const { id, salario_base, subsidio_manual, categoria } = funcionario;
  const salarioBase = salarioBaseOverride !== null ? salarioBaseOverride : salario_base;
  
  // REGRA 2: Subsídio Manual = 0 (zerado explicitamente)
  if (subsidio_manual === 0) {
    return {
      total: 0,
      isento: 0,
      tributavel: 0,
      detalhes: [],
      origem: 'manual_zero'
    };
  }

  // REGRA 3: Subsídio Manual > 0 (valor específico)
  if (subsidio_manual !== null && subsidio_manual > 0) {
    return {
      total: subsidio_manual,
      isento: Math.min(subsidio_manual, 30000), // Limite padrão isenção
      tributavel: Math.max(0, subsidio_manual - 30000),
      detalhes: [{
        nome: 'Subsídio Manual',
        valor: subsidio_manual,
        isento: Math.min(subsidio_manual, 30000),
        tributavel: Math.max(0, subsidio_manual - 30000)
      }],
      origem: 'manual'
    };
  }

  // REGRA 1: Subsídio Manual = NULL → Usa subsídios automáticos
  const subsidios = getSubsidiosFuncionario(id);
  const detalhes = [];
  let totalSubsidios = 0;
  let totalIsento = 0;
  let totalTributavel = 0;

  for (const sub of subsidios) {
    // Verificar se o subsídio é pago neste mês
    const mesesPagamento = sub.meses_pagamento ? 
      sub.meses_pagamento.split(',').map(m => parseInt(m.trim())) : 
      [1,2,3,4,5,6,7,8,9,10,11,12]; // Se não especificado, pagar todos os meses
    
    if (!mesesPagamento.includes(mes)) {
      continue; // Não pago neste mês
    }

    // Calcular valor do subsídio
    let valor = 0;
    
    // Se há valor específico definido para este funcionário, usar ele
    if (sub.valor_especifico !== null && sub.valor_especifico !== undefined) {
      valor = sub.valor_especifico;
    } else if (sub.tipo_calculo === 'fixo') {
      valor = sub.valor_padrao_empresa || 0;
    } else if (sub.tipo_calculo === 'percentual') {
      const percentual = sub.percentual || 0;
      valor = (salarioBase * percentual) / 100;
    }

    const parcelas = Math.max(1, parseInt(sub.parcelas, 10) || 1);
    const valorParcela = valor / parcelas;

    // Calcular isento vs tributável usando o valor da parcela
    let isento = 0;
    let tributavel = 0;
    
    if (sub.incide_irt === 0) {
      // Se não incide IRT, todo o valor é isento
      isento = valorParcela;
      tributavel = 0;
    } else {
      // Se incide IRT, aplicar limite de isenção
      const limiteIsencao = sub.limite_isencao_fiscal || 0;
      isento = Math.min(valorParcela, limiteIsencao);
      tributavel = Math.max(0, valorParcela - limiteIsencao);
    }

    detalhes.push({
      nome: sub.nome,
      tipo: sub.tipo_subsidio || 'regular',
      valor: valorParcela,
      isento: isento,
      tributavel: tributavel,
      incide_inss: sub.incide_inss === 1,
      incide_irt: sub.incide_irt === 1,
      parcelas: parcelas
    });

    totalSubsidios += valorParcela;
    totalIsento += isento;
    totalTributavel += tributavel;
  }

  return {
    total: totalSubsidios,
    isento: totalIsento,
    tributavel: totalTributavel,
    detalhes: detalhes,
    origem: 'automatico'
  };
}

// ==================== CÁLCULO COMPLETO DA FOLHA ====================

/**
 * Calcula folha de pagamento completa para um funcionário
 * Conformidade total com legislação Angola
 */
function calcularFolhaFuncionario(funcionarioId, mes, ano) {
  // Buscar funcionário
  const funcionario = db.prepare(`
    SELECT f.*, cf.nome as categoria_nome
    FROM funcionarios f
    LEFT JOIN categorias_funcionarios cf ON f.categoria_id = cf.id
    WHERE f.id = ?
  `).get(funcionarioId);

  if (!funcionario) {
    throw new Error('Funcionário não encontrado');
  }

  const salarioBase = parseFloat(funcionario.salario_base);

  // 1. CALCULAR FALTAS (desconto proporcional por faltas injustificadas)
  const faltas = getFaltasFuncionario(funcionario.id, mes, ano);
  const diasUteis = Math.max(1, Number(faltas.dias_uteis) || getDiasUteisPadrao());
  const diasFalta = Math.max(0, Number(faltas.dias_falta) || 0);

  let descontoFaltas = 0;
  if (faltas.desconto_manual !== null && Number.isFinite(faltas.desconto_manual)) {
    descontoFaltas = Math.max(0, Number(faltas.desconto_manual));
  } else if ((faltas.tipo || 'injustificada') === 'injustificada' && diasFalta > 0) {
    const valorDia = salarioBase / diasUteis;
    descontoFaltas = Math.max(0, valorDia * diasFalta);
  }

  descontoFaltas = Math.min(descontoFaltas, salarioBase);
  const salarioBaseAjustado = Math.max(0, salarioBase - descontoFaltas);

  // 2. CALCULAR SUBSÍDIOS
  const subsidios = calcularSubsidiosFuncionario(funcionario, mes, salarioBaseAjustado);

  // 3. SALÁRIO BRUTO (Base ajustada + Subsídios)
  const salarioBruto = salarioBaseAjustado + subsidios.total;

  // 4. BASE PARA INSS (Salário Bruto - Subsídios isentos de INSS)
  const subsidiosIsentosINSS = subsidios.detalhes
    .filter(s => s.incide_inss === false)
    .reduce((sum, s) => sum + s.valor, 0);
  const baseINSS = salarioBruto - subsidiosIsentosINSS;

  // 5. INSS EMPREGADO (3% sobre base INSS)
  const inssEmpregado = baseINSS * 0.03;

  // 6. INSS PATRONAL (8% sobre base INSS)
  const inssPatronal = baseINSS * 0.08;

  // 7. DEDUÇÃO FIXA (desativada: ajustes serão tratados por subsídios isentos)
  const deducaoFixa = 0;

  // 8. RENDIMENTO COLECTÁVEL (RC) - BASE TRIBUTÁVEL PARA IRT
  // RC = Salário Base + Subsídios que incidem IRT - INSS Empregado
  const subsidiosTributaveisIRT = subsidios.detalhes
    .filter(s => s.incide_irt === true)
    .reduce((sum, s) => sum + s.valor, 0);
  const rendimentoColectavel = salarioBaseAjustado + subsidiosTributaveisIRT - inssEmpregado;
  
  console.log(`\n📊 Cálculo do Rendimento Coletável (Base Tributável IRT):`);
  console.log(`   - Salário Base (ajustado): ${salarioBaseAjustado}`);
  console.log(`   - Subsídios que incidem IRT: ${subsidiosTributaveisIRT}`);
  console.log(`   - INSS Empregado (3%): ${inssEmpregado}`);
  console.log(`   → RC = ${salarioBaseAjustado} + ${subsidiosTributaveisIRT} - ${inssEmpregado}`);
  console.log(`   → Rendimento Coletável: ${rendimentoColectavel}`);

  // 9. CALCULAR IRT
  const resultadoIRT = calcularIRT(Math.max(0, rendimentoColectavel));
  console.log(`   → IRT Calculado: ${resultadoIRT.irt} (${resultadoIRT.escalao})\n`);

  // 10. TOTAL DE DESCONTOS
  const totalDescontos = inssEmpregado + resultadoIRT.irt;

  // 11. SALÁRIO LÍQUIDO (A RECEBER)
  const salarioLiquido = salarioBruto - totalDescontos;

  return {
    funcionario: {
      id: funcionario.id,
      nome: funcionario.nome,
      categoria: funcionario.categoria_nome || funcionario.categoria
    },
    periodo: { mes, ano },
    
    // REMUNERAÇÃO
    salario_base: salarioBaseAjustado,
    salario_base_original: salarioBase,
    desconto_faltas: descontoFaltas,
    faltas: {
      dias_falta: diasFalta,
      dias_uteis: diasUteis,
      tipo: faltas.tipo || 'injustificada',
      desconto_manual: faltas.desconto_manual,
      observacoes: faltas.observacoes
    },
    subsidios: {
      total: subsidios.total,
      isento: subsidios.isento,
      tributavel: subsidios.tributavel,
      detalhes: subsidios.detalhes,
      origem: subsidios.origem
    },
    salario_bruto: salarioBruto,

    // DESCONTOS
    inss: {
      empregado: inssEmpregado,
      patronal: inssPatronal,
      taxa_empregado: 0.03,
      taxa_patronal: 0.08
    },
    deducao_fixa: deducaoFixa,
    rendimento_colectavel: Math.max(0, rendimentoColectavel),
    irt: {
      valor: resultadoIRT.irt,
      escalao: resultadoIRT.escalao,
      detalhes: resultadoIRT.detalhes,
      taxa: resultadoIRT.taxa,
      parcela: resultadoIRT.parcela
    },
    total_descontos: totalDescontos,

    // LÍQUIDO
    salario_liquido: salarioLiquido,

    // CUSTOS EMPRESA
    custo_total_empresa: salarioBruto + inssPatronal
  };
}

function registrarPagamentoSalario(calculo, mes, ano, pagamentoInfo = {}) {
  const moduleConfig = getModuleConfig();
  const syncWithVendas = shouldSyncFolhaToVendas(moduleConfig);

  if (!syncWithVendas) {
    return null;
  }

  const descricao = pagamentoInfo.descricao || `Pagamento Salário - ${calculo.funcionario.nome} - ${mes}/${ano}`;
  const observacoes = pagamentoInfo.observacoes || `Folha ${mes}/${ano} | Funcionário ${calculo.funcionario.id}`;
  const valorPagamento = pagamentoInfo.valor !== undefined ? pagamentoInfo.valor : calculo.salario_liquido;

  const stmt = db.prepare(`
    INSERT INTO despesas (
      tipo, categoria, descricao, valor, data, recorrente, pago, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    'fixa',
    'salarios',
    descricao,
    valorPagamento,
    pagamentoInfo.data || new Date().toISOString().split('T')[0],
    0,
    1,
    observacoes
  );

  return info.lastInsertRowid;
}

/**
 * Calcula folha para todos os funcionários ativos em um mês
 */
function calcularFolhaCompleta(mes, ano) {
  const funcionarios = db.prepare(`
    SELECT id FROM funcionarios WHERE ativo = 1
  `).all();

  const resultados = [];

  for (const func of funcionarios) {
    try {
      const calculo = calcularFolhaFuncionario(func.id, mes, ano);
      resultados.push({ ...calculo, sucesso: true });
    } catch (error) {
      resultados.push({ 
        funcionario_id: func.id, 
        sucesso: false, 
        erro: error.message 
      });
    }
  }

  return resultados;
}

module.exports = {
  getEscaloesIRT,
  calcularIRT,
  getFaltasFuncionario,
  getSubsidiosAtivos,
  getSubsidiosFuncionario,
  calcularSubsidiosFuncionario,
  calcularFolhaFuncionario,
  registrarPagamentoSalario,
  calcularFolhaCompleta
};
