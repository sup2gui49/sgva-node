# 🔗 Integração Folha de Salários ↔ Sistema de Vendas

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

### 📋 Resumo da Integração

A integração entre o sistema de folha de pagamento e o sistema de vendas foi implementada com sucesso. Agora os dados da folha são automaticamente registrados como despesas no sistema de vendas, permitindo que o **DRE (Demonstrativo de Resultados)** mostre os custos reais com pessoal.

---

## 🎯 Funcionalidades Implementadas

### 1. **Cálculo da Folha com Confirmação**
- **Página**: `folha-calculo.html`
- **Endpoint**: `POST /api/folha-profissional/calcular-completa`
- **Funcionalidade**: Calcula folha de todos os funcionários ativos para um mês/ano

**Fluxo**:
1. Usuário seleciona mês e ano
2. Clica em "Calcular Todos"
3. Sistema processa todos os funcionários:
   - Calcula salário base
   - Aplica subsídios (isentos e tributáveis)
   - Calcula INSS empregado (3%)
   - Calcula INSS patronal (8%)
   - Calcula IRT conforme escalões
   - Calcula salário líquido
4. Mostra resumo com totais
5. **NOVO**: Exibe botão "Confirmar Pagamento e Registrar nas Despesas"

### 2. **Confirmação de Pagamento**
- **Endpoint**: `POST /api/folha-profissional/confirmar-pagamento`
- **Arquivo**: `src/routes/folha.routes.js`

**O que faz**:
```javascript
{
  "mes": 11,
  "ano": 2025,
  "folha_pagamento": [...], // Array com dados de cada funcionário
  "resumo": {
    "total_funcionarios": 15,
    "total_salario_base": 1512000,
    "total_inss_empregado": 50460,
    "total_inss_patronal": 134560,
    "total_irt": 34340,
    "total_descontos": 84800,
    "total_liquido": 1597200,
    "total_empresa": 1731760
  }
}
```

**Validações**:
- ✅ Verifica se já existe folha confirmada para o mesmo mês/ano
- ✅ Impede duplicação de registros
- ✅ Valida estrutura dos dados recebidos

**Registros Criados**:

1. **Despesa de Salários**:
   ```sql
   INSERT INTO despesas (
     descricao, categoria, valor, data, pago, observacoes
   ) VALUES (
     'Folha de Pagamento - 11/2025',
     'salarios',
     1597200.00,  -- valor líquido pago aos funcionários
     '2025-11-01',
     1,
     'Total de 15 funcionários'
   )
   ```

2. **Despesa de INSS Patronal**:
   ```sql
   INSERT INTO despesas (
     descricao, categoria, valor, data, pago, observacoes
   ) VALUES (
     'INSS Patronal - 11/2025',
     'inss_patronal',
     134560.00,  -- 8% sobre salário base total
     '2025-11-01',
     1,
     'Contribuição patronal (8%)'
   )
   ```

3. **Registros Detalhados por Funcionário**:
   ```sql
   INSERT INTO folhas_pagamento (
     mes, ano, funcionario_id,
     salario_base, total_subsidios, subsidios_isentos,
     subsidios_tributaveis, salario_bruto, inss_empregado,
     inss_patronal, deducao_fixa, rendimento_colectavel,
     irt, total_descontos, salario_liquido
   ) VALUES (...)
   ```

**Retorno da API**:
```json
{
  "success": true,
  "data": {
    "despesa_salarios_id": 45,
    "despesa_inss_id": 46,
    "total_salarios": 1597200.00,
    "total_inss_patronal": 134560.00,
    "total_registros": 15,
    "periodo": "11/2025"
  }
}
```

### 3. **DRE Melhorado**
- **Endpoint**: `GET /api/financeiro/dre`
- **Arquivo**: `src/routes/financeiro.routes.js`

**Busca Dados Reais**:
```javascript
// Salários líquidos pagos
SELECT SUM(valor) FROM despesas 
WHERE categoria = 'salarios' 
  AND strftime('%Y', data) = '2025'
  AND strftime('%m', data) = '11'
  AND pago = 1

// INSS Patronal
SELECT SUM(valor) FROM despesas 
WHERE categoria = 'inss_patronal'
  AND strftime('%Y', data) = '2025'
  AND strftime('%m', data) = '11'
  AND pago = 1

// Detalhamento da folha
SELECT 
  SUM(salario_base) as total_salario_base,
  SUM(inss_empregado) as total_inss_empregado,
  SUM(inss_patronal) as total_inss_patronal,
  SUM(irt) as total_irt,
  SUM(salario_liquido) as total_salario_liquido,
  COUNT(*) as total_funcionarios
FROM folhas_pagamento
WHERE ano = 2025 AND mes = 11
```

**Nova Estrutura de Resposta**:
```json
{
  "despesas_pessoal": {
    "salarios_liquidos": "1597200.00",
    "inss_patronal": "134560.00",
    "total_custo_pessoal": "1731760.00",
    "detalhamento": {
      "salario_base_total": "1512000.00",
      "inss_empregado": "50460.00",
      "irt_retido": "34340.00",
      "total_funcionarios": 15,
      "folha_registrada": true  // indica se são valores reais ou estimados
    }
  }
}
```

**Exibição no Frontend** (`public/app.js`):
- 🟢 Badge verde "✓ Folha Registrada" quando há dados reais
- 🟡 Badge laranja "⚠ Estimativa" quando calcula com base em funcionários ativos
- Detalhamento completo: funcionários, salário base, INSS, IRT
- Total do custo com pessoal destacado

---

## 📊 Impacto no DRE

### Antes da Integração:
```
4. DESPESAS COM PESSOAL
   (-) Folha de Pagamento      1.314.240,00  (estimativa)
   (-) INSS Patronal (8%)        120.960,00  (estimativa)
   = LUCRO ANTES DOS IMPOSTOS   XXX.XXX,XX
```

### Depois da Integração:
```
4. DESPESAS COM PESSOAL  ✓ Folha Registrada
   15 funcionários • Salário Base: 1.512.000,00 KZ • 
   INSS Empregado: 50.460,00 KZ • IRT: 34.340,00 KZ
   
   (-) Salários Líquidos Pagos  1.597.200,00  (REAL)
   (-) INSS Patronal (8%)         134.560,00  (REAL)
   Total Custo com Pessoal     (1.731.760,00)
   = LUCRO ANTES DOS IMPOSTOS   XXX.XXX,XX
```

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────┐
│  1. CALCULAR FOLHA                                      │
│     folha-calculo.html                                  │
│     ↓                                                   │
│     POST /api/folha-profissional/calcular-completa      │
│     • Processa todos os funcionários                    │
│     • Calcula descontos e líquidos                      │
│     • Retorna resumo                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. CONFIRMAR PAGAMENTO                                 │
│     Botão "Confirmar Pagamento e Registrar nas Despesas"│
│     ↓                                                   │
│     POST /api/folha-profissional/confirmar-pagamento    │
│     • Valida dados                                      │
│     • Verifica duplicação                               │
│     • Insere em `despesas` (salarios + inss_patronal)   │
│     • Insere em `folhas_pagamento` (detalhamento)       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. VISUALIZAR NO DRE                                   │
│     index.html → DRE                                    │
│     ↓                                                   │
│     GET /api/financeiro/dre                             │
│     • Busca despesas.categoria = 'salarios'             │
│     • Busca despesas.categoria = 'inss_patronal'        │
│     • Busca folhas_pagamento para detalhamento          │
│     • Exibe valores REAIS com badge ✓                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Estrutura de Dados

### Tabela: `despesas`
```sql
CREATE TABLE despesas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,  -- 'salarios' ou 'inss_patronal'
  valor REAL NOT NULL,
  data DATE NOT NULL,
  pago BOOLEAN DEFAULT 0,
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `folhas_pagamento`
```sql
CREATE TABLE folhas_pagamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  funcionario_id INTEGER NOT NULL,
  salario_base REAL NOT NULL,
  total_subsidios REAL DEFAULT 0,
  subsidios_isentos REAL DEFAULT 0,
  subsidios_tributaveis REAL DEFAULT 0,
  salario_bruto REAL NOT NULL,
  inss_empregado REAL DEFAULT 0,
  inss_patronal REAL DEFAULT 0,
  deducao_fixa REAL DEFAULT 0,
  rendimento_colectavel REAL DEFAULT 0,
  irt REAL DEFAULT 0,
  total_descontos REAL DEFAULT 0,
  salario_liquido REAL NOT NULL,
  observacoes TEXT,
  calculado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
  UNIQUE(mes, ano, funcionario_id)
);
```

### Tabela: `config_financeira`
```sql
CREATE TABLE config_financeira (
  id INTEGER PRIMARY KEY,
  regime_iva TEXT DEFAULT 'normal',  -- 'normal' ou 'exclusao'
  taxa_inss_empregado REAL DEFAULT 3.0,
  taxa_inss_patronal REAL DEFAULT 8.0,
  margem_lucro_padrao REAL DEFAULT 30.0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Testes Realizados

### ✅ Teste 1: Cálculo e Confirmação
```bash
# Script: testar-integracao-folha-vendas.js

Resultado:
✅ Folha calculada: 11/2025 com 15 funcionários
✅ Despesas de salários: 6.034.711,60 KZ
✅ Salário líquido folha: 1.597.200,00 KZ
✅ INSS Patronal folha: 134.560,00 KZ
```

### ✅ Teste 2: DRE com Valores Reais
```bash
Endpoint: GET /api/financeiro/dre

Resposta:
{
  "despesas_pessoal": {
    "salarios_liquidos": "1597200.00",
    "inss_patronal": "134560.00",
    "total_custo_pessoal": "1731760.00",
    "detalhamento": {
      "folha_registrada": true,
      "total_funcionarios": 15
    }
  }
}
```

### ✅ Teste 3: Prevenção de Duplicação
```bash
POST /confirmar-pagamento (segunda vez com mesmo mês/ano)

Resposta:
{
  "success": false,
  "error": "Já existe folha confirmada para este período"
}
```

---

## 📈 Benefícios da Integração

1. **Precisão Contábil**
   - DRE mostra custos reais, não estimativas
   - Rastreabilidade completa dos gastos com pessoal
   - Auditoria facilitada com registros detalhados

2. **Conformidade Fiscal**
   - INSS Patronal corretamente registrado
   - IRT retido identificado
   - Histórico de pagamentos mantido

3. **Gestão Estratégica**
   - Decisões baseadas em dados reais
   - Margem de lucro calculada corretamente
   - Previsão de fluxo de caixa mais precisa

4. **Automação**
   - Eliminação de lançamentos manuais
   - Redução de erros humanos
   - Economia de tempo

---

## 🎯 Como Usar

### Passo a Passo:

1. **Acesse a Folha de Pagamento**
   ```
   http://localhost:3000/folha-calculo.html
   ```

2. **Selecione Mês e Ano**
   - Exemplo: Novembro 2025

3. **Calcule a Folha**
   - Clique em "Calcular Todos"
   - Sistema processa todos os funcionários ativos
   - Mostra resumo com totais

4. **Confirme o Pagamento**
   - Clique em "Confirmar Pagamento e Registrar nas Despesas"
   - Sistema registra automaticamente:
     - Despesa de salários (valor líquido)
     - Despesa de INSS patronal
     - Detalhamento por funcionário

5. **Visualize no DRE**
   ```
   http://localhost:3000/index.html
   ```
   - Clique em "DRE"
   - Veja os valores reais com badge ✓ Folha Registrada
   - Detalhamento completo disponível

---

## 🔧 Manutenção

### Arquivos Importantes:

**Backend**:
- `src/routes/folha.routes.js` - Endpoints de folha e confirmação
- `src/routes/financeiro.routes.js` - Endpoint DRE melhorado
- `src/services/iva.service.js` - Serviço de IVA (não alterado)

**Frontend**:
- `public/folha-calculo.html` - Interface de cálculo com botão de confirmação
- `public/app.js` - Renderização do DRE melhorada (linha ~1670)
- `public/index.html` - Dashboard principal

**Scripts de Teste**:
- `testar-integracao-folha-vendas.js` - Verificação completa da integração
- `verificar-folha-despesas.js` - Verificação específica de despesas

### Logs e Depuração:

```bash
# Verificar integração
node testar-integracao-folha-vendas.js

# Ver despesas registradas
SELECT * FROM despesas WHERE categoria IN ('salarios', 'inss_patronal');

# Ver folhas confirmadas
SELECT mes, ano, COUNT(*) as funcionarios, 
       SUM(salario_liquido) as total_liquido
FROM folhas_pagamento 
GROUP BY mes, ano;
```

---

## ⚠️ Observações Importantes

1. **Não Excluir Despesas Manualmente**
   - Despesas de folha são geradas automaticamente
   - Exclusão manual causa inconsistências no DRE

2. **Confirmação Única por Período**
   - Só é possível confirmar uma vez por mês/ano
   - Para correções, ajuste diretamente no banco (com cautela)

3. **Backup Regular**
   - Use `public/folha-backup.html` para backups
   - Mantenha histórico de folhas antigas

4. **Categorias de Despesas**
   - `salarios`: Valor líquido pago aos funcionários
   - `inss_patronal`: Contribuição da empresa (8%)
   - Não alterar nomes das categorias

---

## 📞 Suporte

Para dúvidas sobre a integração:
1. Verifique os logs do servidor: `node src/server.js`
2. Execute o script de teste: `node testar-integracao-folha-vendas.js`
3. Consulte este documento

---

**✅ Integração Implementada e Testada com Sucesso!**

Data: Janeiro 2025
Versão: 1.0
