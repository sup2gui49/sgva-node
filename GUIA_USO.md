# 📖 Guia Rápido - SGVA

## 🚀 Como Usar o Sistema

### 1. Iniciar o Servidor

```bash
cd c:\xampp\htdocs\sgva-node
node src/server.js
```

Ou abrir em uma nova janela minimizada:
```bash
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node src/server.js" -WindowStyle Minimized
```

### 2. Acessar o Sistema

Abra o navegador em: **http://localhost:3000**

### 3. Fazer Login

**Credenciais padrão:**
- Email: `admin@sgva.com`
- Senha: `123456`

---

## 💰 Módulo de Despesas - Guia Completo

### Acessar o Módulo

1. Faça login no sistema
2. Clique em **"💵 Financeiro"** no menu
3. Clique na aba **"Despesas"**

### Adicionar Nova Despesa

1. Clique em **"➕ Nova Despesa"**
2. Preencha os campos:
   - **Tipo:** Fixa, Variável, Operacional, Financeira ou Extraordinária
   - **Categoria:** Escolha da lista (Aluguel, Água, Luz, etc.)
   - **Descrição:** Detalhes da despesa
   - **Valor:** Valor em Kwanzas
   - **Data:** Data da despesa
   - **Recorrente:** Marque se é uma despesa mensal
   - **Já foi paga:** Marque se já está paga
   - **Observações:** Informações adicionais (opcional)
3. Clique em **"Salvar"**

### Visualizar Despesas

O sistema mostra:
- **Resumo no topo:**
  - Total de despesas
  - Despesas pagas
  - Despesas pendentes
  - Despesas recorrentes

- **Tabela de despesas:**
  - Data, Tipo, Categoria
  - Descrição (🔄 indica recorrente)
  - Valor
  - Status (✅ Paga / ❌ Pendente)
  - Ações

- **Despesas por Categoria:**
  - Resumo agrupado
  - Quantidade e total por categoria

### Gerenciar Despesas

**Marcar como Paga/Pendente:**
- Clique no botão correspondente na coluna "Ações"

**Deletar Despesa:**
- Clique no botão 🗑️
- Confirme a exclusão

**Atualizar Lista:**
- Clique em "🔄 Atualizar"

---

## 📊 Outros Módulos

### Dashboard
- Visualize receitas, despesas e lucros
- Cards com informações resumidas

### Produtos
- Adicione produtos ao estoque
- Controle preços e custos
- Gerencie categorias

### Vendas
- Registre vendas com múltiplos itens
- Escolha método de pagamento
- Aplique descontos

### DRE (Demonstrativo de Resultados)
- Receita bruta e líquida
- CMV e lucro bruto
- Despesas operacionais
- Lucro líquido

### Capital de Giro
- Distribuição do lucro
- Fundo de reserva
- Recomendações financeiras

### Folha de Pagamento
- Adicione funcionários
- Calcule salários
- INSS e descontos

---

## 🔧 Comandos Úteis

### Resetar Senha do Admin
```bash
node reset-password.js
```

### Testar API de Despesas
```bash
node test-despesas.js
```

### Ver Estrutura do Banco
```bash
node src/config/check-despesas.js
```

---

## 💡 Dicas

1. **Despesas Recorrentes:** Marque despesas mensais (aluguel, internet) como recorrentes
2. **Categorias:** Use as categorias para melhor organização e relatórios
3. **Observações:** Adicione detalhes importantes (nº de fatura, fornecedor, etc.)
4. **Backup:** Faça backup regular de `database/sgva.db`
5. **Relatórios:** Use os filtros para ver despesas de períodos específicos

---

## 🐛 Solução de Problemas

### Servidor não inicia
```bash
# Parar processos Node
taskkill /F /IM node.exe

# Iniciar novamente
node src/server.js
```

### Erro de autenticação
```bash
# Resetar senha
node reset-password.js
```

### Banco de dados corrompido
- Faça backup de `database/sgva.db`
- Restaure de um backup anterior

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte o README.md
3. Revise a documentação da API

---

**Última atualização:** Novembro 2025
