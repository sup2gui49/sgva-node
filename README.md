# SGVA - Sistema de Gestão de Vendas Adaptável

Sistema moderno e completo de gestão empresarial desenvolvido em Node.js + Express + SQLite

## 🎯 Funcionalidades Implementadas

### ✅ Módulos Principais

- ✅ **Autenticação JWT** - Login seguro com tokens
- ✅ **Gestão de Produtos e Estoque** - CRUD completo de produtos
- ✅ **Receitas e Custos** - Controle para padarias/restaurantes
- ✅ **Vendas e PDV** - Registro de vendas com múltiplos itens
- ✅ **Gestão Financeira Completa** - DRE, Capital de Giro, Análises
- ✅ **Módulo de Despesas** - Controle total de despesas operacionais
- ✅ **Precificação Inteligente** - Cálculo de preços com margem
- ✅ **Folha de Salários** - Gestão de funcionários e folha de pagamento
- ✅ **Dashboard Interativo** - Visualização de dados em tempo real
- ✅ **Relatórios Financeiros** - DRE, Resumos, Estatísticas

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# IMPORTANTE: Edite o arquivo .env e configure o JWT_SECRET
# Gere uma chave segura com:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Criar banco de dados (já criado)
# O banco já está configurado em database/sgva.db

# Iniciar servidor (desenvolvimento)
npm run dev

# Iniciar servidor (produção)
npm start
```

### 🖥️ Atalho/Launcher para Windows

Para abrir o SGVA como se fosse um aplicativo (inicia o servidor e abre o navegador automaticamente), foi adicionado o script `scripts/iniciar-sgva.ps1`.

1. **Permitir execução de scripts (uma única vez):**
	```powershell
	Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
	```
2. **Criar um atalho no Desktop:**
	- Clique com o botão direito em `scripts/iniciar-sgva.ps1` → *Enviar para* → *Área de Trabalho (criar atalho)*; ou copie o arquivo para a área de trabalho.
3. **Executar o atalho:**
	- O script verifica se o servidor já está rodando, inicia `npm start` em uma nova janela do PowerShell e abre o endereço `http://localhost:3000/folha-dashboard.html` no Edge (modo app) ou no navegador padrão.

> Dica: mantenha a janela do PowerShell aberta para que o servidor continue ativo. Fechar essa janela encerra o backend.

## 🔐 Acesso ao Sistema

**Credenciais padrão:**
- Email: `admin@sgva.com`
- Senha: `123456`

## 📁 Estrutura do Projeto

```
sgva-node/
├── src/
│   ├── config/
│   │   └── database.js          # Configuração SQLite
│   ├── controllers/
│   │   ├── despesas.controller.js
│   │   └── ...                  # Outros controllers
│   ├── models/
│   │   ├── despesa.model.js
│   │   └── ...                  # Outros models
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── despesas.routes.js
│   │   └── ...                  # Outras rotas
│   ├── middlewares/
│   │   └── auth.middleware.js   # JWT authentication
│   └── server.js                # Servidor principal
├── database/
│   └── sgva.db                  # Banco de dados SQLite
├── public/
│   ├── index.html               # Interface do usuário
│   ├── app.js                   # Lógica frontend
│   └── style.css                # Estilos
└── package.json
```

## 🔧 Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** SQLite (better-sqlite3)
- **Autenticação:** JWT (jsonwebtoken)
- **Segurança:** bcryptjs, cors
- **Desenvolvimento:** nodemon
- **Frontend:** Vanilla JavaScript (SPA)

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login e obtenção de token

### Produtos
- `GET /api/produtos` - Listar produtos
- `POST /api/produtos` - Criar produto
- `GET /api/produtos/:id` - Buscar produto
- `PUT /api/produtos/:id` - Atualizar produto
- `DELETE /api/produtos/:id` - Deletar produto

### Vendas
- `POST /api/vendas` - Registrar venda
- `GET /api/vendas` - Listar vendas
- `GET /api/vendas/:id` - Detalhes da venda

### Despesas ⭐ NOVO
- `GET /api/despesas` - Listar despesas (com filtros)
- `POST /api/despesas` - Criar despesa
- `GET /api/despesas/:id` - Buscar despesa por ID
- `PUT /api/despesas/:id` - Atualizar despesa
- `DELETE /api/despesas/:id` - Deletar despesa
- `PATCH /api/despesas/:id/pagar` - Toggle status pago/pendente
- `GET /api/despesas/resumo` - Estatísticas e resumo
- `GET /api/despesas/categorias` - Listar categorias disponíveis

### Financeiro
- `GET /api/financeiro/dashboard` - Dashboard financeiro
- `GET /api/financeiro/dre` - Demonstrativo de Resultados
- `GET /api/financeiro/capital-giro` - Análise de capital de giro
- `POST /api/financeiro/precificacao` - Calcular preço de produto

### Folha de Salários
- `GET /api/folha/funcionarios` - Listar funcionários
- `POST /api/folha/funcionarios` - Adicionar funcionário
- `POST /api/folha/calcular` - Calcular folha de pagamento

## 💡 Funcionalidades do Módulo de Despesas

### Tipos de Despesas
- **Fixa** - Despesas fixas mensais
- **Variável** - Despesas que variam mensalmente
- **Operacional** - Despesas operacionais do negócio
- **Financeira** - Juros, taxas bancárias, etc.
- **Extraordinária** - Despesas não recorrentes

### Categorias Disponíveis
- Aluguel
- Água
- Luz/Energia
- Internet
- Telefone
- Salários
- Impostos
- Fornecedores
- Marketing
- Manutenção
- Equipamentos
- Transporte
- Outras

### Recursos
- ✅ CRUD completo de despesas
- ✅ Marcar como paga/pendente
- ✅ Despesas recorrentes
- ✅ Filtros por tipo, categoria, período
- ✅ Resumo com estatísticas
- ✅ Agrupamento por categoria
- ✅ Interface intuitiva e responsiva

## 🧪 Testes

### Testar API de Despesas
```bash
node test-despesas.js
```

### Resetar Senha do Admin
```bash
node reset-password.js
```

## 📊 Dashboard

O dashboard oferece:
- Resumo financeiro geral
- Gestão de produtos e estoque
- Registro de vendas
- **Controle completo de despesas** ⭐
- DRE e análise financeira
- Gestão de capital de giro
- Precificação inteligente
- Folha de pagamento

## 🔜 Próximos Passos

- [ ] Adicionar gráficos com Chart.js
- [ ] Gerar relatórios em PDF
- [ ] Sistema de permissões (roles)
- [ ] Backup automático
- [ ] Exportação para Excel
- [ ] Notificações de despesas vencidas
- [ ] Dashboard mobile responsivo

## 📄 Licença

MIT

## 👨‍💻 Desenvolvido por

**Eng. Guilherme** - Sistema de Gestão de Vendas Adaptável

---

### 🎉 Status do Projeto

**Versão:** 1.0.0  
**Status:** ✅ Funcional e Operacional  
**Última Atualização:** Novembro 2025

### ✅ Módulos Completos
- [x] Autenticação
- [x] Produtos
- [x] Vendas
- [x] Financeiro
- [x] Despesas
- [x] Folha de Pagamento
- [x] Dashboard
