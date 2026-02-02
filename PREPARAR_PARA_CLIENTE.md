# 📦 Preparando SGVA para Venda/Instalação em Clientes

## 🎯 Resumo Rápido

Quando for instalar o sistema em um cliente:

1. ✅ **IDs são RESETADOS** - Todos começam do 1
2. ✅ **Dados de teste são REMOVIDOS** - Banco limpo
3. ✅ **Configurações essenciais são MANTIDAS** - IRT, subsídios, etc.

---

## 🚀 Scripts Disponíveis

### 1. `criar-banco-producao.js` (RECOMENDADO)
**Cria um banco de dados completamente novo e limpo para produção.**

```bash
node criar-banco-producao.js
```

**O que faz:**
- ✅ Cria estrutura completa do banco
- ✅ Insere escalões IRT 2025
- ✅ Insere subsídios padrão
- ✅ Insere categorias de funcionários
- ✅ Cria usuário admin (admin@sistema.ao / admin123)
- ✅ IDs começam do 1

**Resultado:** `database/sgva_producao.db`

---

### 2. `limpar-para-producao.js`
**Limpa o banco atual mantendo estrutura e configurações.**

```bash
node limpar-para-producao.js
```

**O que faz:**
- ✅ Faz backup do banco atual
- ✅ Remove funcionários, vendas, folhas
- ✅ Reseta IDs para começar do 1
- ✅ Mantém escalões IRT e subsídios
- ✅ Cria usuário admin limpo

---

## 📋 Checklist para Vender o Sistema

### Antes de Entregar ao Cliente:

- [ ] Execute `criar-banco-producao.js`
- [ ] Verifique que o banco está limpo
- [ ] Atualize o `.env` com configurações padrão
- [ ] Remova senhas e tokens sensíveis do .env
- [ ] Inclua o arquivo `INSTALACAO_CLIENTE.md`
- [ ] Prepare pacote ZIP com:
  - [ ] Pasta `src/`
  - [ ] Pasta `public/`
  - [ ] Pasta `database/` (com sgva_producao.db)
  - [ ] `package.json`
  - [ ] `.env.example` (sem dados sensíveis)
  - [ ] `INSTALACAO_CLIENTE.md`
  - [ ] `criar-banco-producao.js`
  - [ ] Scripts úteis (reset-password, backup, etc.)

---

## 📦 Estrutura de Entrega

```
sgva-node/
├── src/                          # Código-fonte
├── public/                       # Interface web
├── database/
│   ├── sgva_producao.db         # Banco limpo (vazio)
│   └── migrations/              # Scripts SQL
├── package.json
├── .env.example                 # Modelo de configuração
├── criar-banco-producao.js      # Script de setup
├── reset-admin-password.js      # Recuperação de senha
├── INSTALACAO_CLIENTE.md        # Guia do cliente
└── README.md                    # Documentação
```

---

## 🔒 Segurança

### O que REMOVER antes de entregar:

1. **Dados de Teste:**
   - Funcionários fictícios
   - Vendas de teste
   - Usuários de desenvolvimento

2. **Credenciais:**
   - Tokens JWT de desenvolvimento
   - Senhas hardcoded
   - Backups com dados reais

3. **Logs e Cache:**
   - Arquivos de log antigos
   - Sessões antigas

### O que INCLUIR:

1. **Configurações Padrão:**
   - Escalões IRT atualizados
   - Subsídios legais de Angola
   - Categorias profissionais comuns

2. **Documentação:**
   - Guia de instalação
   - Manual de uso básico
   - FAQ de problemas comuns

---

## 💰 Licenciamento e Vendas

### Modelo de Licenciamento Sugerido:

1. **Licença Única:**
   - Uma instalação por empresa
   - Atualizações por 1 ano incluídas

2. **Suporte Técnico:**
   - Incluso nos primeiros 30 dias
   - Pacotes mensais depois

3. **Customizações:**
   - Cobrar separadamente
   - Hora técnica

### O que Garantir ao Cliente:

- ✅ Banco de dados limpo (IDs começam do 1)
- ✅ Sistema configurado e funcional
- ✅ Treinamento básico incluído
- ✅ Documentação completa
- ✅ Atualizações de segurança

---

## 🎓 Treinamento do Cliente

### Tópicos Essenciais:

1. **Primeiro Acesso:**
   - Login e alteração de senha
   - Configuração da empresa

2. **Cadastros Básicos:**
   - Funcionários
   - Categorias e salários
   - Subsídios

3. **Operações Mensais:**
   - Calcular folha
   - Confirmar pagamento
   - Gerar recibos

4. **Relatórios:**
   - DRE
   - Folha de pagamento
   - Exportação Excel

---

## 🔧 Suporte Pós-Venda

### Estrutura Sugerida:

1. **Nível 1 - Cliente resolve:**
   - Reset de senha
   - Backup manual
   - Cadastros básicos

2. **Nível 2 - Suporte remoto:**
   - Problemas de configuração
   - Erros de cálculo
   - Dúvidas de uso

3. **Nível 3 - Intervenção técnica:**
   - Bugs do sistema
   - Atualizações
   - Customizações

### Scripts de Manutenção:

```bash
# Reset senha admin
node reset-admin-password.js

# Verificar integridade
node verificar-sistema.js

# Backup manual
node backup-manual.js
```

---

## 📊 Garantias de Qualidade

Ao entregar o sistema:

- ✅ Banco de dados testado e funcional
- ✅ Todos os IDs começam do 1
- ✅ Cálculos de IRT verificados
- ✅ Subsídios configurados corretamente
- ✅ Interface testada em múltiplos browsers
- ✅ Backup automático funcionando
- ✅ Relatórios gerando corretamente

---

## 📞 Processo de Instalação no Cliente

### Dia 1 - Instalação:
1. Preparar ambiente (Node.js)
2. Extrair sistema
3. Executar `criar-banco-producao.js`
4. Configurar .env
5. Iniciar servidor
6. Primeiro login

### Dia 2 - Configuração:
1. Dados da empresa
2. Cadastro de funcionários
3. Ajuste de subsídios
4. Teste de cálculo

### Dia 3 - Treinamento:
1. Operações diárias
2. Relatórios
3. Backup
4. Dúvidas

---

## ✅ Validação Final

Antes de considerar instalação completa:

- [ ] Cliente consegue fazer login
- [ ] Dados da empresa cadastrados
- [ ] Pelo menos 3 funcionários cadastrados
- [ ] Folha teste calculada com sucesso
- [ ] Recibo gerado e impresso
- [ ] DRE visualizado
- [ ] Backup testado
- [ ] Cliente sabe resetar senha
- [ ] Contato de suporte fornecido

---

## 🎯 Resumo Final

**Para cada nova empresa cliente:**

1. Execute: `node criar-banco-producao.js`
2. Banco novo com IDs começando do 1 ✅
3. Apenas configurações essenciais mantidas ✅
4. Cliente começa do zero, sem dados alheios ✅

**Nunca entregue:**
- ❌ Banco com dados de outros clientes
- ❌ Senhas de produção no código
- ❌ Logs ou dados sensíveis

**Sempre inclua:**
- ✅ INSTALACAO_CLIENTE.md
- ✅ Script criar-banco-producao.js
- ✅ Escalões IRT atualizados
- ✅ Subsídios padrão de Angola
