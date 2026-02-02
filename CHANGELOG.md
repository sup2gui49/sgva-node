# SGVA - Changelog de Melhorias

## ✅ Implementações Concluídas (22/11/2025)

### 1. **Dashboard de Vendas resiliente ao modo offline**
- ✅ Cartões principais reutilizam o último snapshot válido quando a API não responde
- ✅ Aviso visual informa quando os números vêm do cache e exibe o horário da captura
- ✅ Banner some assim que os dados em tempo real carregam novamente

**Arquivos modificados:**
- `public/index-old.html` — Adicionado banner `#dashboard-offline-banner` e ajustes de marcação
- `public/style.css` — Novas classes `.offline-banner` para destacar o alerta
- `public/app.js` — Criado `SALES_DASHBOARD_CACHE_KEY`, funções de cache (`saveSalesDashboardCache`, `getSalesDashboardCache`) e controle do banner

```javascript
function setDashboardOfflineBanner(message) {
   const banner = document.getElementById('dashboard-offline-banner');
   if (!banner) return;
   if (message) {
      banner.style.display = 'block';
      banner.textContent = message;
   } else {
      banner.style.display = 'none';
      banner.textContent = '';
   }
}
```

### 2. **Dashboard da Folha remodelado e com gráficos offline**
- ✅ Layout principal virou grade com coluna lateral redimensionável e cards arrastáveis
- ✅ Gráficos de categorias e subsídios salvam dados no `localStorage` e caem para barras HTML quando o Chart.js falha
- ✅ Nota “Dados offline” indica o horário do snapshot reutilizado

**Arquivos modificados:**
- `public/folha-dashboard.html` — Reestruturação visual, handles de resize e helpers `renderGrafico*`, `aplicarCacheGrafico`, `mostrarAvisoGraficoEspecifico`
- `public/js/offline-charts.js` — Biblioteca leve para renderizar barras/tabelas sem dependências externas

```javascript
function renderOfflineGraficoCategorias(dados, meta = {}) {
   const fallback = obterOuCriarFallback('chartCategorias');
   if (!fallback) return;
   OfflineCharts.renderBars(
      fallback.container,
      dados.map(item => ({
         label: item.categoria || 'Categoria',
         value: Number(item.custo_total_empresa) || 0,
         display: `${formatMoney(Number(item.custo_total_empresa) || 0)} KZ`
      })),
      { compact: true }
   );
   anexarNotaOffline(fallback.wrapper, meta.timestamp || Date.now());
}
```

---

## ✅ Implementações Concluídas (09/11/2025)

### 1. **Sistema de Filtros de Produtos**
- ✅ Campo de busca por nome (em tempo real)
- ✅ Dropdown de categoria (padaria, bebidas, lanche, outros)
- ✅ Filtragem instantânea sem recarregar página
- ✅ Botão "Atualizar" para recarregar lista completa

**Arquivos modificados:**
- `public/index.html` - Adicionados inputs de filtro
- `public/app.js` - Função `filterProducts()` implementada

---

### 2. **Prevenção de Produtos Duplicados**
- ✅ Verificação case-insensitive antes de criar produto
- ✅ Retorna erro HTTP 409 (Conflict) se produto já existir
- ✅ Mensagem clara: "Já existe um produto com este nome"

**Arquivos modificados:**
- `src/routes/produtos.routes.js` - Adicionada validação no POST

**Código:**
```javascript
const duplicate = db.prepare(`SELECT id FROM produtos WHERE LOWER(nome) = LOWER(?)`).get(nome);
if (duplicate) {
  return res.status(409).json({
    success: false,
    message: 'Já existe um produto com este nome'
  });
}
```

---

### 3. **Restauração Automática de Estoque via Despesas**
- ✅ Quando despesa tem categoria "compras" ou "compra_produtos"
- ✅ Extrai nome do produto e quantidade da descrição
- ✅ Aumenta estoque automaticamente no banco
- ✅ Log no console confirmando atualização

**Arquivos modificados:**
- `src/models/despesa.model.js` - Lógica adicionada em `create()`

**Formato esperado da descrição:**
```
Compra: Nome do Produto - 100 un
```

**Exemplo de uso:**
```javascript
// Criar despesa de compra
{
  tipo: 'operacional',
  categoria: 'compras',
  descricao: 'Compra: Pão Francês - 50 un',
  valor: 2500,
  pago: true
}
// → Estoque de "Pão Francês" aumenta em 50 unidades
```

---

### 4. **Persistência de Navegação**
- ✅ Salva página atual no localStorage
- ✅ Restaura página ao recarregar navegador
- ✅ Evita voltar sempre para dashboard após refresh

**Arquivos modificados:**
- `public/app.js` - Implementado `localStorage.setItem('currentPage')` e `window.addEventListener('load')`

**Como funciona:**
1. Ao navegar para página, salva em `localStorage.currentPage`
2. Ao carregar app, verifica `localStorage.currentPage`
3. Se existir, restaura a página salva
4. Se não existir, mostra dashboard

---

### 5. **Botões de Edição/Exclusão de Produtos**
- ✅ Botão "Editar" visível para admin e gerente
- ✅ Botão "Deletar" visível apenas para admin
- ✅ Funcionários não veem os botões
- ✅ Validação de permissões no backend

**Arquivos modificados:**
- `public/app.js` - Adicionados botões com verificação de role
- `src/routes/produtos.routes.js` - Rotas protegidas com `authorize()`

---

### 6. **Alertas de Estoque Baixo**
- ✅ Emoji ⚠️ aparece quando `estoque <= estoque_minimo`
- ✅ Linha da tabela fica com fundo vermelho claro
- ✅ Alerta visual imediato

**Arquivos modificados:**
- `public/app.js` - Lógica de renderização em `filterProducts()`

**Código:**
```javascript
const estoqueClass = produto.estoque <= (produto.estoque_minimo || 10) 
  ? 'style="background-color: #ffebee;"' 
  : '';

html += `${produto.estoque} ${produto.estoque <= (produto.estoque_minimo || 10) ? '⚠️' : ''}`;
```

---

### 7. **Sistema de Permissões Completo**
- ✅ Middleware `authorize()` protegendo rotas sensíveis
- ✅ Auth middleware inclui `role` em `req.user`
- ✅ Frontend esconde elementos baseado em role
- ✅ Backend valida permissões em todas as rotas

**Hierarquia de roles:**
- **admin**: Acesso total (criar, editar, deletar, ver tudo)
- **gerente**: Acesso quase total (criar, editar produtos/vendas, ver relatórios)
- **funcionario**: Apenas vendas do próprio usuário

**Rotas protegidas:**
- `/api/produtos` POST/PUT: admin, gerente
- `/api/produtos` DELETE: apenas admin
- `/api/despesas`: apenas admin
- `/api/folha`: admin, gerente
- `/api/relatorios`: admin, gerente

---

### 8. **Geração de PDFs Corrigida**
- ✅ Admin pode gerar todos os PDFs
- ✅ Gerente pode gerar todos os PDFs
- ✅ Funcionário não tem acesso
- ✅ PDFs abrem inline no navegador (não fazem download)

**Tipos de PDF disponíveis:**
1. **Vendas** - `/api/relatorios/vendas?mes=1&ano=2025`
2. **DRE** - `/api/relatorios/dre?mes=1&ano=2025`
3. **Despesas** - `/api/relatorios/despesas?mes=1&ano=2025`
4. **Folha de Salários** - `/api/relatorios/folha?mes=1&ano=2025`

---

## 🧪 Testes Automatizados

### Script: `scripts/test-full-system.js`

**Testes implementados:**
1. ✅ Login como admin, gerente, funcionário
2. ✅ Prevenção de duplicados
3. ✅ Restauração de estoque via despesas
4. ✅ Geração de PDFs (4 tipos)
5. ✅ Gerente pode criar produtos
6. ✅ Funcionário não pode criar produtos (403)
7. ✅ Funcionário não pode acessar despesas (403)

**Como executar:**
```bash
cd c:\xampp\htdocs\sgva-node
node scripts/test-full-system.js
```

**Resultado esperado:**
```
✅ TODOS OS TESTES CONCLUÍDOS!
```

---

## 📊 Resumo de Arquivos Modificados

### Backend
- `src/middlewares/auth.middleware.js` - Adiciona role ao req.user
- `src/middlewares/authorize.middleware.js` - Middleware de autorização
- `src/routes/produtos.routes.js` - Duplicados + autorização
- `src/routes/despesas.routes.js` - Autorização admin
- `src/routes/vendas.routes.js` - Filtro por funcionário
- `src/routes/financeiro.routes.js` - Remove filtro pago=1
- `src/models/despesa.model.js` - Restauração de estoque
- `src/controllers/relatorios.controller.js` - PDFs sem filtro pago

### Frontend
- `public/index.html` - Filtros de produtos + estoque_minimo
- `public/app.js` - Filtros + edição/exclusão + alertas + navegação persistente
- `public/style.css` - Estilos (sem alterações necessárias)

### Scripts
- `scripts/test-full-system.js` - Teste completo do sistema
- `scripts/test-admin-pdf.js` - Teste específico de PDFs
- `scripts/add-funcionarios.js` - Popular tabela funcionarios
- `scripts/fix-database.js` - Verificação da estrutura

---

## 🎯 Estado Atual do Sistema

### ✅ Funcionalidades Operacionais
- [x] Autenticação JWT
- [x] Sistema de roles (admin, gerente, funcionario)
- [x] CRUD de produtos com validações
- [x] Prevenção de duplicados
- [x] Filtros de produtos (nome + categoria)
- [x] Alertas de estoque baixo
- [x] Gestão de vendas
- [x] Gestão de despesas
- [x] Restauração de estoque via compras
- [x] Dashboard com gráficos (Chart.js)
- [x] Geração de PDFs (4 tipos)
- [x] Folha de salários
- [x] Navegação persistente
- [x] Permissões por role

### 📈 Estatísticas do Banco
- Usuários: 3 (admin, gerente, funcionario)
- Funcionários: 6 (João, Maria, Pedro, Ana, Carlos)
- Produtos: 15+
- Despesas: 18+
- Vendas: 4+

---

## 🚀 Como Usar

### 1. Iniciar Servidor
```bash
cd c:\xampp\htdocs\sgva-node
node src/server.js
```

### 2. Acessar Frontend
```
http://localhost:3000
```

### 3. Credenciais de Teste
```
Admin:
- Email: admin@sgva.com
- Senha: 123456

Gerente:
- Email: gerente@sgva.com
- Senha: 123456

Funcionário:
- Email: funcionario@sgva.com
- Senha: 123456
```

---

## 📝 Próximas Melhorias (Sugestões)

1. **Campo produto_id e quantidade na tabela despesas**
   - Evitar parsing de string
   - Mais confiável e eficiente

2. **Histórico de alterações de estoque**
   - Tabela `estoque_historico`
   - Rastreabilidade completa

3. **Notificações de estoque baixo**
   - Email/push quando estoque < estoque_minimo
   - Dashboard com contador de alertas

4. **Backup automático do banco**
   - Script diário/semanal
   - Versionamento de backups

5. **API de relatórios customizados**
   - Filtros avançados
   - Exportação para Excel/CSV

6. **Modo escuro**
   - Toggle no frontend
   - Salvar preferência no localStorage

---

**Última atualização:** 09/11/2025  
**Desenvolvedor:** GitHub Copilot  
**Status:** ✅ Sistema em produção
