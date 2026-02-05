# 🚀 Guia de Instalação para Clientes - SGVA

## 📋 Pré-requisitos

- Node.js versão 18 ou superior
- 500 MB de espaço em disco
- Windows, Linux ou macOS

---

## 📦 Instalação

### 1. Extrair os arquivos
Extraia o pacote `sgva-node.zip` em uma pasta de sua escolha.

### 2. Instalar dependências
Abra o terminal/prompt na pasta do sistema e execute:
```bash
npm install
```

### 3. Criar banco de dados limpo
Execute o script de criação do banco de produção:
```bash
node criar-banco-producao.js
```

Este script irá:
- ✅ Criar todas as tabelas necessárias
- ✅ Configurar escalões de IRT 2025
- ✅ Inserir subsídios padrão (alimentação, transporte, 13º, etc.)
- ✅ Criar categorias de funcionários
- ✅ Criar usuário administrador inicial

### 4. Configurar arquivo .env
Copie o arquivo de exemplo e configure:
```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
# Porta do servidor
PORT=3000

# Banco de dados (use o banco de produção criado)
DB_PATH=./database/sgva_producao.db

# Segurança JWT (OBRIGATÓRIO - Gere uma chave segura!)
# Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=cole_aqui_a_chave_gerada_pelo_comando_acima
JWT_EXPIRES_IN=7d

# Configurações Financeiras (ajuste conforme necessário)
MARGEM_MINIMA_PADRAO=30
CAPITAL_GIRO_PERCENTUAL=40
FUNDO_RESERVA_PERCENTUAL=10
DISTRIBUICAO_LUCRO_PERCENTUAL=50
```

**⚠️ CRÍTICO:** 
- Gere uma chave JWT_SECRET segura usando o comando acima
- NUNCA use valores de exemplo ou chaves fracas
- O sistema não iniciará sem uma chave de pelo menos 32 caracteres

### 5. Iniciar o servidor
```bash
node src/server.js
```

Ou para manter rodando em background (Windows):
```bash
start /B node src/server.js
```

---

## 🔐 Primeiro Acesso

### Credenciais padrão:
- **Email:** `admin@sistema.ao`
- **Senha:** `admin123`

**⚠️ ALTERE A SENHA IMEDIATAMENTE APÓS O PRIMEIRO LOGIN!**

---

## 📝 Configuração Inicial

Após o primeiro login, configure:

### 1. Dados da Empresa
- Acesse: **Configurações** → **Empresa**
- Preencha:
  - Nome da empresa
  - NIF
  - Endereço
  - Telefone/Email
  - Regime de IVA

### 2. Cadastrar Funcionários
- Acesse: **Folha** → **Funcionários**
- Clique em **Novo Funcionário**
- Preencha os dados e salário base
- Selecione a categoria profissional

### 3. Configurar Subsídios (Opcional)
- Acesse: **Folha** → **Subsídios**
- Revise os subsídios padrão
- Ajuste valores conforme a política da empresa

### 4. Cadastrar Produtos (Se usar módulo de vendas)
- Acesse: **Produtos**
- Cadastre produtos/serviços
- Configure preços e IVA

---

## 💼 Uso Diário

### Calcular Folha de Pagamento
1. Acesse: **Folha** → **Calcular Folha**
2. Selecione mês e ano
3. Clique em **Calcular Todos**
4. Revise os valores
5. Clique em **Confirmar Pagamento**

### Gerar Relatórios
- **DRE:** Acesse via menu lateral
- **Folha de Pagamento:** Exportar para Excel
- **Recibos:** Imprimir individualmente

---

## 🔧 Manutenção

### Backup Automático
O sistema faz backup automático antes de operações críticas.
Backups ficam em: `backups/`

### Backup Manual
Execute:
```bash
copy database\sgva_producao.db backups\backup_manual_DATA.db
```

### Atualizar Sistema
Quando receber uma nova versão:
1. Faça backup do banco de dados
2. Substitua os arquivos do sistema
3. Execute: `npm install` (se houver novos pacotes)
4. Reinicie o servidor

---

## 🆘 Suporte

### Problemas Comuns

**Servidor não inicia:**
- Verifique se a porta 3000 está livre
- Confira se o Node.js está instalado: `node --version`

**Esqueci a senha do admin:**
- Execute o script de reset: `node reset-admin-password.js`

**Erro ao calcular folha:**
- Verifique se os funcionários têm salário base configurado
- Confira se a categoria do funcionário existe

### Contato
Para suporte técnico, entre em contato através de:
- Email: [seu-email@empresa.com]
- Telefone: [seu-telefone]
- WhatsApp: [seu-whatsapp]

---

## 📊 Módulos Disponíveis

### ✅ Folha de Pagamento
- Cálculo automático de IRT
- Cálculo de INSS (empregado e patronal)
- Subsídios customizáveis
- Recibos de pagamento
- Histórico completo

### ✅ Sistema Financeiro
- DRE (Demonstrativo de Resultados)
- Controle de despesas
- Integração folha→vendas

### ✅ Gestão de Vendas
- Cadastro de produtos
- Registro de vendas
- Controle de IVA
- Relatórios de vendas

---

## 📖 Conceitos Importantes

### IRT (Imposto sobre Rendimento do Trabalho)
- Calculado automaticamente por escalões
- Tabela 2025 já configurada
- Dedução fixa de 60.000 KZ aplicada

### INSS
- Empregado: 3%
- Patronal: 8%
- Configurável por categoria

### Subsídios Isentos
- Alimentação: até 15.000 KZ
- Transporte: até 10.000 KZ
- Valores acima são tributados

---

## ✅ Checklist de Implantação

- [ ] Node.js instalado
- [ ] Sistema extraído
- [ ] Dependências instaladas (`npm install`)
- [ ] Banco de produção criado
- [ ] JWT_SECRET alterado no .env
- [ ] Primeiro login realizado
- [ ] Senha do admin alterada
- [ ] Dados da empresa configurados
- [ ] Funcionários cadastrados
- [ ] Folha teste calculada
- [ ] Backup configurado

---

## 📄 Licença e Termos

Este sistema é licenciado para uso comercial.
Veja o arquivo LICENSE para mais detalhes.

**Desenvolvido por:** [Seu Nome/Empresa]
**Versão:** 1.0.0
**Data:** Novembro 2025
