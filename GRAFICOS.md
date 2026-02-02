# 📊 Dashboard com Gráficos - SGVA

## ✅ Gráficos Implementados

### 1. 📈 Receita vs Despesas
**Tipo:** Gráfico de Barras
- Compara receita total, despesas e lucro
- Cores diferenciadas para cada categoria
- Atualização em tempo real

### 2. 🍩 Despesas por Categoria
**Tipo:** Gráfico de Rosca (Doughnut)
- Visualiza distribuição de despesas
- Agrupado por categoria
- Legenda lateral com valores

### 3. 📉 Evolução Mensal
**Tipo:** Gráfico de Linha
- Mostra evolução das vendas
- Últimos 6 meses
- Área preenchida

### 4. 📊 Produtos Mais Vendidos
**Tipo:** Gráfico de Barras Horizontal
- Top 5 produtos mais vendidos
- Ordenado por quantidade
- Fácil visualização

## 🎨 Tecnologia

- **Biblioteca:** Chart.js 4.4.0
- **CDN:** Carregado via jsdelivr
- **Responsivo:** Adapta-se a diferentes tamanhos de tela
- **Animações:** Transições suaves

## 🚀 Como Funciona

### Carregamento Automático
Os gráficos são carregados automaticamente quando você:
1. Faz login no sistema
2. Acessa a página do Dashboard
3. Os dados são buscados via API
4. Gráficos são renderizados

### Atualização
- **Manual:** Navegue entre páginas e volte ao Dashboard
- **Automática:** Ao fazer login
- **Recarga:** Pressione F5 no navegador

## 📝 Scripts Úteis

### Popular Dados de Exemplo
```bash
node popular-dados.js
```

Este script adiciona:
- 8 despesas variadas
- 5 produtos de exemplo
- 5 vendas de exemplo

### Limpar Dados
Para limpar o banco e começar do zero:
```bash
# Fazer backup primeiro!
cp database/sgva.db database/sgva_backup.db

# Depois pode deletar e recriar (implemente conforme necessário)
```

## 🎯 Recursos

### Interatividade
- **Hover:** Passe o mouse sobre os gráficos para ver detalhes
- **Responsivo:** Funciona em mobile, tablet e desktop
- **Animações:** Transições suaves ao carregar

### Personalização
Os gráficos podem ser facilmente personalizados editando:
- `public/app.js` - Funções `create*Chart()`
- Cores, tipos de gráfico, dados exibidos

## 🎨 Cores Utilizadas

### Receita vs Despesas
- 🟢 Receita: Verde (`rgba(75, 192, 192)`)
- 🔴 Despesas: Vermelho (`rgba(255, 99, 132)`)
- 🔵 Lucro: Azul (`rgba(54, 162, 235)`)

### Despesas por Categoria
- Paleta de 10 cores variadas
- Distribuição automática

## 📱 Responsividade

### Desktop (> 1024px)
- 2 gráficos por linha
- Layout em grid

### Tablet (768px - 1024px)
- 1 gráfico por linha
- Melhor visualização

### Mobile (< 768px)
- 1 gráfico por linha
- Tamanho otimizado

## 🔧 Manutenção

### Adicionar Novo Gráfico

1. **HTML** (`index.html`):
```html
<div class="chart-box">
    <h3>Meu Novo Gráfico</h3>
    <canvas id="chart-meu-grafico"></canvas>
</div>
```

2. **JavaScript** (`app.js`):
```javascript
function createMeuGraficoChart(data) {
    const ctx = document.getElementById('chart-meu-grafico');
    if (!ctx) return;
    
    if (chartInstances['meu-grafico']) {
        chartInstances['meu-grafico'].destroy();
    }
    
    chartInstances['meu-grafico'] = new Chart(ctx, {
        type: 'bar', // ou 'line', 'pie', 'doughnut', etc.
        data: {
            labels: ['Label 1', 'Label 2'],
            datasets: [{
                label: 'Meus Dados',
                data: [10, 20]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}
```

3. **Chamar no Dashboard**:
```javascript
async function loadDashboardCharts() {
    // ... outros gráficos
    createMeuGraficoChart(data);
}
```

## 📊 Tipos de Gráficos Disponíveis

Chart.js suporta:
- `bar` - Barras verticais
- `line` - Linhas
- `pie` - Pizza
- `doughnut` - Rosca
- `radar` - Radar
- `polarArea` - Área polar
- `bubble` - Bolhas
- `scatter` - Dispersão

## 🐛 Solução de Problemas

### Gráficos não aparecem
1. Verifique o console do navegador (F12)
2. Confirme que Chart.js está carregado
3. Verifique se há dados disponíveis

### Gráficos desatualizados
1. Limpe o cache do navegador (Ctrl+F5)
2. Faça logout e login novamente
3. Verifique se a API está retornando dados

### Erro de renderização
1. Verifique se o canvas existe no DOM
2. Confirme que o ID está correto
3. Verifique se não há duplicação de IDs

## 📚 Documentação Chart.js

- **Site Oficial:** https://www.chartjs.org/
- **Documentação:** https://www.chartjs.org/docs/latest/
- **Exemplos:** https://www.chartjs.org/docs/latest/samples/

---

**Última atualização:** Novembro 2025
**Versão:** 1.1.0
