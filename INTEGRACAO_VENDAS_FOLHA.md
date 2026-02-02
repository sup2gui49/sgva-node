# 🔗 INTEGRAÇÃO: VENDAS ↔️ FOLHA DE PAGAMENTO

## ✅ RESPOSTA DIRETA

**SIM! Os funcionários cadastrados em Vendas aparecem AUTOMATICAMENTE na Folha de Pagamento!**

---

## 🎯 COMO FUNCIONA

### **Banco de Dados Único**
```
c:\xampp\htdocs\sgva-node\database\sgva.db
```

Ambos os sistemas (Vendas e Folha) usam o **MESMO arquivo de banco de dados**.

### **Tabela Compartilhada: `funcionarios`**

```
┌─────────────────────────────────────────────┐
│         TABELA: funcionarios                │
│  (Única e compartilhada por ambos sistemas) │
└─────────────────────────────────────────────┘
           ↓                    ↓
   ┌──────────────┐      ┌──────────────┐
   │   SISTEMA    │      │   SISTEMA    │
   │   DE VENDAS  │      │   DE FOLHA   │
   └──────────────┘      └──────────────┘
```

---

## 📊 ESTRUTURA DA TABELA `funcionarios`

| Campo | Tipo | Usado em Vendas? | Usado em Folha? | Obrigatório |
|-------|------|------------------|-----------------|-------------|
| `id` | INTEGER | ✅ | ✅ | ✅ SIM |
| `nome` | TEXT | ✅ | ✅ | ✅ SIM |
| `categoria` | TEXT | ✅ | ⚠️ (legado) | ❌ NÃO |
| `salario_base` | REAL | ❌ | ✅ | ✅ SIM (para Folha) |
| `ativo` | INTEGER | ✅ | ✅ | ✅ SIM |
| `data_admissao` | TEXT | ✅ | ✅ | ❌ NÃO |
| `subsidio_manual` | REAL | ❌ | ✅ | ❌ NÃO |
| `categoria_id` | INTEGER | ❌ | ✅ | ❌ NÃO |

---

## 🔄 SINCRONIZAÇÃO AUTOMÁTICA

### **Cenário 1: Cadastro em Vendas**
```
1. Usuário cadastra "Maria Silva" no Sistema de Vendas
   ↓
2. Registro criado na tabela funcionarios
   ↓
3. Maria Silva aparece IMEDIATAMENTE em:
   - ✅ Sistema de Vendas
   - ✅ Folha de Pagamento (folha-funcionarios.html)
   - ✅ Dropdown de cálculo de folha
```

### **Cenário 2: Cadastro na Folha**
```
1. Usuário cadastra "João Costa" na Folha de Pagamento
   ↓
2. Registro criado na tabela funcionarios
   ↓
3. João Costa aparece IMEDIATAMENTE em:
   - ✅ Folha de Pagamento
   - ✅ Sistema de Vendas
   - ✅ Relatórios de ambos os sistemas
```

### **Cenário 3: Atualização**
```
1. Usuário atualiza salário de "Ana Paula" na Folha
   ↓
2. Campo salario_base atualizado na tabela funcionarios
   ↓
3. Mudança refletida INSTANTANEAMENTE em todos os lugares
```

### **Cenário 4: Desativação**
```
1. Usuário desativa "Pedro Costa" em qualquer sistema
   ↓
2. Campo ativo = 0 na tabela funcionarios
   ↓
3. Pedro Costa fica inativo em:
   - ✅ Sistema de Vendas
   - ✅ Folha de Pagamento
   - ⚠️ NÃO aparece em novos cálculos de folha
```

---

## ⚠️ IMPORTANTE: CAMPOS OBRIGATÓRIOS

### **Para usar no Sistema de Vendas:**
- ✅ `nome` - Nome do funcionário
- ✅ `ativo` - Status (1 = ativo, 0 = inativo)

### **Para calcular Folha de Pagamento:**
- ✅ `nome` - Nome do funcionário
- ✅ `salario_base` - Salário base em KZ (OBRIGATÓRIO!)
- ✅ `ativo` - Deve estar ativo (1)
- ⚠️ `categoria_id` - Opcional, mas recomendado

---

## 🚨 PROBLEMA COMUM E SOLUÇÃO

### ❌ **Problema:**
```
Funcionário cadastrado em Vendas sem salário_base
↓
Aparece na Folha mas NÃO pode calcular folha
↓
ERRO: "Salário base não definido"
```

### ✅ **Solução:**
```
1. Acesse: http://localhost:3000/folha-funcionarios.html
2. Localize o funcionário
3. Clique em "Editar"
4. Preencha o campo "Salário Base (KZ)"
5. Salvar
6. Agora pode calcular a folha!
```

---

## 📋 FUNCIONÁRIOS ATUAIS (11/11/2025)

| ID | Nome | Salário Base | Ativo | Pode calcular folha? |
|----|------|--------------|-------|----------------------|
| 1 | GUILHERME MONTEIRO | 90.000 KZ | ✅ | ✅ SIM |
| 2 | João Silva | 50.000 KZ | ✅ | ✅ SIM |
| 3 | Maria Santos | 45.000 KZ | ✅ | ✅ SIM |
| 4 | Pedro Costa | 42.000 KZ | ✅ | ✅ SIM |
| 5 | Ana Paula | 50.000 KZ | ✅ | ✅ SIM |
| 6 | Carlos Mendes | 65.000 KZ | ✅ | ✅ SIM |
| 7 | João Silva Teste | 150.000 KZ | ✅ | ✅ SIM |
| 12 | DENISIO | 60.000 KZ | ✅ | ✅ SIM |

**Total:** 8 funcionários ativos, **TODOS prontos para folha**! ✅

---

## 🎯 FLUXO RECOMENDADO

### **Para Novos Funcionários:**

**Opção 1: Cadastrar na Folha (RECOMENDADO)**
```
1. folha-funcionarios.html
2. Botão "Novo Funcionário"
3. Preencher TODOS os campos:
   - Nome ✅
   - Salário Base ✅
   - Categoria ✅
   - Status ✅
4. Salvar
5. ✅ Pronto para usar em Vendas E Folha!
```

**Opção 2: Cadastrar em Vendas (depois ajustar)**
```
1. Sistema de Vendas → Cadastrar funcionário
2. Preencher nome básico
3. ⚠️ Salvar (sem salário)
4. Ir para folha-funcionarios.html
5. Editar funcionário
6. Adicionar salário_base e categoria
7. ✅ Agora está completo!
```

---

## 🔍 COMO VERIFICAR A INTEGRAÇÃO

### **Teste Prático:**

1. **Cadastre um funcionário em Vendas:**
   - Nome: "Teste Integração"
   - Salve

2. **Vá para a Folha:**
   ```
   http://localhost:3000/folha-funcionarios.html
   ```

3. **Busque por "Teste Integração":**
   - ✅ Deve aparecer imediatamente!
   - ⚠️ Sem salário_base (aparecerá 0 KZ)

4. **Edite e adicione salário:**
   - Clique em "Editar"
   - Salário Base: 100.000 KZ
   - Categoria: Administrativo
   - Salvar

5. **Volte para Vendas:**
   - ✅ Funcionário ainda está lá
   - ✅ Dados sincronizados

---

## 📊 VANTAGENS DA INTEGRAÇÃO

| Vantagem | Descrição |
|----------|-----------|
| ✅ **Dados Únicos** | Sem duplicação, sem inconsistências |
| ✅ **Atualização Instantânea** | Mudança em um lugar = mudança em todos |
| ✅ **Simplicidade** | Um cadastro serve para tudo |
| ✅ **Relatórios Unificados** | Dados consistentes entre sistemas |
| ✅ **Manutenção Fácil** | Apenas um lugar para corrigir dados |

---

## 🚀 CONCLUSÃO

### ✅ **SIM, ESTÃO TOTALMENTE INTEGRADOS!**

- 🔗 **Mesma tabela:** `funcionarios`
- 🔗 **Mesmo banco:** `sgva.db`
- 🔗 **Sincronização:** Automática e instantânea
- 🔗 **Cadastro único:** Aparece em ambos os sistemas

### 💡 **Recomendação:**
Use **folha-funcionarios.html** para cadastros completos, pois permite definir:
- Nome ✅
- Salário base ✅
- Categoria profissional ✅
- Status ✅

Assim o funcionário estará 100% pronto para:
- Sistema de Vendas ✅
- Cálculo de Folha ✅
- Relatórios ✅
- Exportações ✅

---

**Data:** 11 de Novembro de 2025  
**Sistema:** SGVA - Integrado Vendas + Folha  
**Status:** ✅ FUNCIONANDO PERFEITAMENTE
