console.log('🚀 app.js carregado!');

// ==================== GLOBAL ERROR HANDLER (PREVENT WHITE SCREEN) ====================
window.addEventListener('error', function(event) {
    console.error('❌ Erro Global Capturado:', event.error);
    const appContainer = document.getElementById('app') || document.body;
    
    // Tentar não substituir tela inteira se for erro menor, mas se for fatal...
    // Se a tela estiver branca (sem filhos no .main-content), mostrar erro
    const mainContent = document.querySelector('.main-content');
    if (mainContent && mainContent.innerHTML.trim() === '') {
         mainContent.innerHTML = `
            <div style="padding: 50px; text-align: center; color: #721c24;">
                <h2>⚠️ Ocorreu um problema</h2>
                <p>O sistema encontrou um erro inesperado e não conseguiu exibir esta tela.</p>
                <div style="background: #f8d7da; padding: 15px; margin: 20px auto; max-width: 600px; border-radius: 5px; text-align: left;">
                    <strong>Detalhes do erro:</strong> <br>
                    <code style="display: block; margin-top: 10px;">${event.error?.message || 'Erro desconhecido'}</code>
                </div>
                <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer; background: #0d6efd; color: white; border: none; border-radius: 5px;">
                    🔄 Recarregar Página
                </button>
            </div>
         `;
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promessa Rejeitada não tratada:', event.reason);
    // Lógica similar pode ser aplicada aqui se necessário
});
// ===================================================================================

const API_URL = '/api';
let token = null;
let currentUser = null;
let saleItems = [];
const SALES_DASHBOARD_CACHE_KEY = 'sgva_sales_dashboard_cache_v1';

console.log('📡 API_URL:', API_URL);
console.log('🔑 Token carregado inicialmente:', token ? 'Sim' : 'Não');

function saveSalesDashboardCache(dados) {
    try {
        localStorage.setItem(SALES_DASHBOARD_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            dados
        }));
    } catch (error) {
        console.warn('⚠️ Não foi possível salvar cache do dashboard de vendas:', error);
    }
}

function getSalesDashboardCache() {
    try {
        const raw = localStorage.getItem(SALES_DASHBOARD_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.dados) return null;
        return parsed;
    } catch (error) {
        console.warn('⚠️ Não foi possível ler cache do dashboard de vendas:', error);
        return null;
    }
}

function formatCacheDate(timestamp) {
    if (!timestamp) return '';
    try {
        return new Intl.DateTimeFormat('pt-AO', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(timestamp);
    } catch (error) {
        return '';
    }
}

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

const bootstrapSalesApp = () => {
    if (!window.auth) {
        console.warn('Auth helper indisponível; não foi possível validar a sessão.');
        return;
    }

    if (!auth.requireAuth()) {
        return;
    }

    const session = auth.getSession();
    token = session?.token || null;
    currentUser = session?.user || null;
    console.log('🔑 Token carregado via auth helper:', token ? 'Sim' : 'Não');
    showDashboard();
};

document.addEventListener('DOMContentLoaded', bootstrapSalesApp);

// ==================== AUTH ====================
function logout() {
    console.log('🚪 Fazendo logout...');
    if (window.auth) {
        auth.logout({ redirectTo: 'login.html' });
        return;
    }
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ==================== CONTROLE DE PERMISSÕES ====================
function aplicarPermissoesUI() {
    if (!currentUser) return;
    const userRole = currentUser.role || currentUser.funcao || 'funcionario';
    console.log('🔒 Aplicando permissões para role:', userRole);
    
    // Se for funcionário, ocultar seções restritas
    if (userRole === 'funcionario') {
        // Ocultar aba de Produtos
        const produtosLink = document.querySelector('[onclick="showPage(\'produtos\')"]');
        if (produtosLink) produtosLink.style.display = 'none';
        
        // Ocultar aba de Financeiro (DRE e Despesas)
        const financeiroLink = document.querySelector('[onclick="showPage(\'financeiro\')"]');
        if (financeiroLink) financeiroLink.style.display = 'none';
        
        // Ocultar aba de Folha
        const folhaLink = document.querySelector('[onclick="showPage(\'folha\')"]');
        if (folhaLink) folhaLink.style.display = 'none';
        
        // Ocultar botões de relatórios
        document.querySelectorAll('[onclick^="gerarRelatorioPDF"]').forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Ocultar cards do dashboard que mostram valores financeiros
        setTimeout(() => {
            const cards = document.querySelectorAll('.stat-card');
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes('lucro') || text.includes('receita') || text.includes('despesa')) {
                    card.style.display = 'none';
                }
            });
        }, 500);
    }
    
    // Se for gerente, pode ver mas não editar despesas e folha
    if (userRole === 'gerente') {
        // Ocultar botões de criar/editar/deletar despesas
        const addDespesaBtn = document.querySelector('[onclick="showAddDespesa()"]');
        if (addDespesaBtn) addDespesaBtn.style.display = 'none';
        
        // Ocultar botões de adicionar funcionário
        const addFuncBtn = document.querySelector('[onclick="showAddEmployee()"]');
        if (addFuncBtn) addFuncBtn.style.display = 'none';
    }
    
    // Adicionar indicador de role no header
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        const roleLabel = {
            'admin': '👑 Admin',
            'gerente': '📊 Gerente',
            'funcionario': '👤 Funcionário'
        };
        userNameElement.textContent = `${currentUser.nome} (${roleLabel[userRole] || userRole})`;
    }
}

function verificarPermissao(requiredRole) {
    const userRole = currentUser.role || currentUser.funcao || 'funcionario';
    const hierarchy = {
        'admin': 3,
        'gerente': 2,
        'funcionario': 1
    };
    return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
}


function showMessage(message, type) {
    const msgDiv = document.getElementById('auth-message');
    if (!msgDiv) {
        const logger = type === 'error' ? console.error : console.log;
        logger.call(console, message);
        return;
    }
    msgDiv.textContent = message;
    msgDiv.className = type;
}

function showDashboard() {
    console.log('🎯 Mostrando dashboard...');
    
    const authSection = document.getElementById('auth-section');
    const dashSection = document.getElementById('dashboard-section');
    
    console.log('Auth section:', authSection);
    console.log('Dashboard section:', dashSection);
    
    if (!dashSection) {
        console.error('❌ Dashboard não disponível na página atual');
        return;
    }

    if (authSection) {
        authSection.classList.remove('active');
    }
    dashSection.classList.add('active');
    
    const userName = document.getElementById('user-name');
    if (userName && currentUser) {
        userName.textContent = currentUser.nome;
    }
    
    console.log('✅ Dashboard exibido!');
    aplicarPermissoesUI(); // Aplicar permissões de UI
    loadDashboardData();
}

// ==================== NAVIGATION ====================
function showPage(page) {
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Salvar página atual
    localStorage.setItem('currentPage', page);
    
    // Marcar botão ativo (precisa encontrar o botão correto)
    document.querySelectorAll('.menu-btn').forEach(btn => {
        if (btn.textContent.includes(pageNames[page])) {
            btn.classList.add('active');
        }
    });
    
    document.getElementById(`page-${page}`).classList.add('active');
    
    if (page === 'dashboard') loadDashboardData();
    if (page === 'produtos') loadProducts();
    if (page === 'categorias') loadCategorias();
    if (page === 'vendas') loadSales();
    if (page === 'financeiro') loadFinanceiro();
    if (page === 'folha') loadEmployees();
}

// Mapeamento de nomes de página
const pageNames = {
    'dashboard': 'Dashboard',
    'produtos': 'Produtos',
    'categorias': 'Categorias',
    'vendas': 'Vendas',
    'clientes': 'Clientes',
    'financeiro': 'Financeiro',
    'folha': 'Folha',
    'relatorios': 'Relatórios'
};

// Restaurar página ao carregar
window.addEventListener('load', () => {
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage && savedPage !== 'dashboard') {
        showPage(savedPage);
    }
});

// ==================== DASHBOARD ====================
async function loadDashboardData() {
    const cache = getSalesDashboardCache();
    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();
    let dados = null;
    let usandoCache = false;

    try {
        const response = await fetch(`${API_URL}/financeiro/dashboard?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Não foi possível carregar o dashboard');
        }

        dados = data.dados;
        saveSalesDashboardCache(dados);
        setDashboardOfflineBanner('');
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        if (cache) {
            dados = cache.dados;
            usandoCache = true;
            const stamp = formatCacheDate(cache.timestamp);
            setDashboardOfflineBanner(`⚠️ Sem ligação à API. Mostrando dados gravados em ${stamp || 'data desconhecida'}.`);
        } else {
            setDashboardOfflineBanner('');
            showMessage('Não foi possível carregar o dashboard. Verifique a conexão.', 'error');
            return;
        }
    }

    renderDashboardCards(dados);

    if (navigator.onLine) {
        await loadDashboardCharts();
    } else {
        console.info('📴 Offline - mantendo gráficos anteriores.');
    }
}

function renderDashboardCards(d) {
    const container = document.getElementById('dashboard-cards');
    if (!container) return;
    if (!d) {
        container.innerHTML = '<div class="stat-card"><h3>Dados indisponíveis</h3><div class="value">--</div><small>Conecte-se para atualizar.</small></div>';
        return;
    }

    const crescimento = parseFloat(d.crescimento_receita) || 0;
    const crescimentoIcon = crescimento >= 0 ? '📈' : '📉';
    const crescimentoColor = crescimento >= 0 ? '#27ae60' : '#e74c3c';
    const lucroCor = parseFloat(d.lucro_liquido) >= 0 ? '#27ae60' : '#e74c3c';

    container.innerHTML = `
        <div class="stat-card">
            <h3>💰 Receita Total</h3>
            <div class="value">${d.receita_total} KZ</div>
            <small style="color: ${crescimentoColor};">${crescimentoIcon} ${d.crescimento_receita} vs mês anterior</small>
        </div>
        <div class="stat-card">
            <h3>📊 Lucro Líquido</h3>
            <div class="value" style="color: ${lucroCor};">${d.lucro_liquido} KZ</div>
            <small>Margem: ${d.margem_lucro}</small>
        </div>
        <div class="stat-card">
            <h3>📈 ROI</h3>
            <div class="value">${d.roi}</div>
            <small>Retorno sobre investimento</small>
        </div>
        <div class="stat-card">
            <h3>🎫 Ticket Médio</h3>
            <div class="value">${d.ticket_medio} KZ</div>
            <small>${d.total_vendas} vendas no mês</small>
        </div>
        <div class="stat-card">
            <h3>📦 Custos (CMV)</h3>
            <div class="value">${d.custos_vendas} KZ</div>
            <small>Margem bruta: ${d.margem_bruta}</small>
        </div>
        <div class="stat-card">
            <h3>💸 Despesas</h3>
            <div class="value">${d.despesas_totais} KZ</div>
            <small>Operacionais do mês</small>
        </div>
        <div class="stat-card">
            <h3>🏛️ IVA a Recolher</h3>
            <div class="value">${d.iva_recolher} KZ</div>
            <small>Imposto sobre vendas</small>
        </div>
        <div class="stat-card">
            <h3>🎁 Descontos</h3>
            <div class="value">${d.descontos_concedidos} KZ</div>
            <small>Concedidos no mês</small>
        </div>
    `;
}

// Carregar gráficos do dashboard
let chartInstances = {};

let chartLoadAttempts = 0;
const MAX_CHART_ATTEMPTS = 10;

async function loadDashboardCharts() {
    try {
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            chartLoadAttempts++;
            if (chartLoadAttempts < MAX_CHART_ATTEMPTS) {
                console.warn(`⚠️ Chart.js não carregado ainda. Tentativa ${chartLoadAttempts}/${MAX_CHART_ATTEMPTS}. Tentando novamente em 500ms...`);
                setTimeout(loadDashboardCharts, 500);
            } else {
                console.error('❌ Chart.js não pôde ser carregado após múltiplas tentativas');
                // Mostrar mensagem ao usuário
                const chartsContainer = document.getElementById('dashboard-charts');
                if (chartsContainer) {
                    chartsContainer.innerHTML = '<div style="text-align:center;padding:40px;background:white;border-radius:10px;margin-top:20px;"><p style="color:#e74c3c;font-size:16px;"><i class="bi bi-exclamation-triangle"></i> Erro ao carregar biblioteca de gráficos. Por favor, recarregue a página.</p></div>';
                }
            }
            return;
        }
        
        chartLoadAttempts = 0; // Reset contador
        const mes = new Date().getMonth() + 1;
        const ano = new Date().getFullYear();
        
        console.log('📊 Carregando gráficos do dashboard...');
        
        // Obter dados
        const [dashData, despesasData, vendasData, produtosData] = await Promise.all([
            fetch(`${API_URL}/financeiro/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API_URL}/despesas/resumo?mes=${mes}&ano=${ano}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API_URL}/vendas`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API_URL}/produtos`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]);
        
        console.log('✅ Dados carregados:', { dashData, despesasData, vendasData, produtosData });
        
        // 1. Gráfico Receita vs Despesas
        createReceitaDespesaChart(dashData, despesasData);
        
        // 2. Gráfico Despesas por Categoria
        createDespesasCategoriaChart(despesasData);
        
        // 3. Gráfico de Evolução Mensal
        createEvolucaoChart(vendasData);
        
        // 4. Gráfico Produtos Mais Vendidos
        createProdutosChart(vendasData);
        
        console.log('✅ Gráficos criados com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar gráficos:', error);
        const chartsContainer = document.getElementById('dashboard-charts');
        if (chartsContainer) {
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'text-align:center;padding:20px;background:#fff3cd;border-radius:10px;margin-top:20px;';
            errorMsg.innerHTML = `<p style="color:#856404;"><i class="bi bi-exclamation-triangle"></i> Erro ao carregar gráficos: ${error.message}</p>`;
            chartsContainer.appendChild(errorMsg);
        }
    }
}

function createReceitaDespesaChart(dashData, despesasData) {
    const ctx = document.getElementById('chart-receita-despesa');
    if (!ctx) {
        console.warn('⚠️ Canvas chart-receita-despesa não encontrado');
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (chartInstances['receita-despesa']) {
        chartInstances['receita-despesa'].destroy();
    }
    
    const receita = dashData.dados?.receita_total || 0;
    const despesas = despesasData.resumo?.valor_total || 0;
    const lucro = receita - despesas;
    
    console.log('📊 Criando gráfico Receita vs Despesas:', { receita, despesas, lucro });
    
    chartInstances['receita-despesa'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Receita', 'Despesas', 'Lucro'],
            datasets: [{
                label: 'Valores (KZ)',
                data: [receita, despesas, lucro],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createDespesasCategoriaChart(despesasData) {
    const ctx = document.getElementById('chart-despesas-categoria');
    if (!ctx) return;
    
    if (chartInstances['despesas-categoria']) {
        chartInstances['despesas-categoria'].destroy();
    }
    
    const categorias = despesasData.por_categoria || [];
    
    if (categorias.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; padding:50px;">Nenhuma despesa registrada</p>';
        return;
    }
    
    const labels = categorias.map(c => c.categoria || 'Sem categoria');
    const valores = categorias.map(c => c.total);
    
    chartInstances['despesas-categoria'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(199, 199, 199, 0.8)',
                    'rgba(83, 102, 255, 0.8)',
                    'rgba(255, 99, 255, 0.8)',
                    'rgba(99, 255, 132, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createEvolucaoChart(vendasData) {
    const ctx = document.getElementById('chart-evolucao');
    if (!ctx) return;
    
    if (chartInstances['evolucao']) {
        chartInstances['evolucao'].destroy();
    }
    
    // Agrupar vendas por mês
    const vendas = vendasData.data || [];
    const dadosPorMes = {};
    
    vendas.forEach(venda => {
        const data = new Date(venda.data_venda);
        const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
        
        if (!dadosPorMes[mesAno]) {
            dadosPorMes[mesAno] = {
                vendas: 0,
                quantidade: 0,
                ticket: 0
            };
        }
        dadosPorMes[mesAno].vendas += parseFloat(venda.total || 0);
        dadosPorMes[mesAno].quantidade += 1;
    });
    
    // Últimos 6 meses
    const meses = Object.keys(dadosPorMes).slice(-6);
    const valores = meses.map(m => dadosPorMes[m].vendas);
    const quantidades = meses.map(m => dadosPorMes[m].quantidade);
    
    // Formatar labels melhor
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const labelsFormatados = meses.map(m => {
        const [mes, ano] = m.split('/');
        return `${mesesNomes[parseInt(mes) - 1]}/${ano}`;
    });
    
    chartInstances['evolucao'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsFormatados,
            datasets: [
                {
                    label: 'Receita (KZ)',
                    data: valores,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Nº de Vendas',
                    data: quantidades,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.4,
                    fill: false,
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                if (context.datasetIndex === 0) {
                                    label += new Intl.NumberFormat('pt-AO', {
                                        style: 'currency',
                                        currency: 'AOA'
                                    }).format(context.parsed.y);
                                } else {
                                    label += context.parsed.y + ' vendas';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Receita (KZ)'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Quantidade de Vendas'
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

async function createProdutosChart(vendasData) {
    const canvas = document.getElementById('chart-produtos');
    if (!canvas) return;

    // Tentar destruir qualquer gráfico Chart.js associado a este canvas (por elemento ou por id)
    try {
        const canvasId = canvas.id || 'chart-produtos';
        const existingChart = Chart.getChart(canvas) || Chart.getChart(canvasId);
        if (existingChart) {
            try { existingChart.destroy(); } catch (e) { /* ignorar */ }
        }
    } catch (e) {
        // Se Chart.getChart não existir ou falhar, continuar
    }

    // Destruir também qualquer instância salva em chartInstances
    if (chartInstances['produtos']) {
        try { chartInstances['produtos'].destroy(); } catch (e) { /* ignorar */ }
        delete chartInstances['produtos'];
    }

    // Usar contexto 2D se disponível
    const ctx = (canvas.getContext) ? canvas.getContext('2d') : canvas;

    try {
        // Buscar produtos para ter os nomes
        const produtosResponse = await fetch(`${API_URL}/produtos`);
        const produtosData = await produtosResponse.json();
        const produtos = produtosData.data || [];
        
        // Criar mapa de produtos
        const produtosMap = {};
        produtos.forEach(p => {
            produtosMap[p.id] = p.nome;
        });
        
        // Simular dados de produtos vendidos (idealmente viria da API)
        const vendas = vendasData.data || [];
        const produtosVendidos = {};
        
        // Como não temos itens de venda, vamos simular baseado nos produtos existentes
        // Pegar top 5 produtos aleatórios para demo
        const produtosDemo = produtos.slice(0, 5);
        produtosDemo.forEach((p, i) => {
            produtosVendidos[p.nome] = Math.floor(Math.random() * 50) + 10;
        });
        
        const labels = Object.keys(produtosVendidos);
        const quantidades = Object.values(produtosVendidos);
        
        // Cores diferentes para cada barra
        const cores = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
        ];
        
        chartInstances['produtos'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: quantidades,
                    backgroundColor: cores,
                    borderColor: cores.map(c => c.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y', // Horizontal
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Vendidos: ${context.parsed.x} unidades`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade Vendida'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao criar gráfico de produtos:', error);
    }
}

// Helper function to ensure categories are loaded
async function ensureCategoriesLoaded() {
    if (window.categoriasManager) {
        try {
            await window.categoriasManager.carregarCategorias();
            return true;
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            return false;
        }
    } else {
        console.warn('⚠️ CategoriasManager não disponível. O dropdown de categorias pode estar vazio.');
        return false;
    }
}

// ==================== PRODUTOS ====================
async function loadProducts() {
    try {
        // Load categories when products page loads
        await ensureCategoriesLoaded();
        
        const response = await fetch(`${API_URL}/produtos`);
        
        const data = await response.json();
        
        if (data.success) {
            window.allProducts = data.data; // Guardar todos os produtos
            filterProducts(); // Aplicar filtros
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        const listDiv = document.getElementById('produtos-list');
        if (listDiv) {
            listDiv.innerHTML = `<div class="error" style="padding: 20px; text-align: center;">Erro ao carregar produtos. Verifique sua conexão.</div>`;
        }
    }
}

function filterProducts() {
    const searchTerm = document.getElementById('filter-produto')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-categoria')?.value || '';
    const categoriasProdutos = window.categoriasProdutos || [];
    const categoriaSelecionada = categoriasProdutos.find(cat => String(cat.id) === String(categoryFilter));
    
    let filteredProducts = window.allProducts || [];
    
    // Filtrar por nome
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            p.nome.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtrar por categoria
    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(p => 
            String(p.categoria_id || '') === String(categoryFilter) ||
            (categoriaSelecionada && p.categoria && p.categoria.toLowerCase().trim() === categoriaSelecionada.nome.toLowerCase().trim())
        );
    }
    
    // Renderizar tabela
    const userRole = currentUser.role || currentUser.funcao || 'funcionario';
    const canEdit = userRole === 'admin' || userRole === 'gerente';
    
    let html = '<table><thead><tr><th>Nome</th><th>Categoria</th><th>Custo</th><th>Preço</th><th>Estoque</th>';
    if (canEdit) html += '<th>Ações</th>';
    html += '</tr></thead><tbody>';
    
    filteredProducts.forEach(produto => {
        const categoriaInfo = categoriasProdutos.find(cat => String(cat.id) === String(produto.categoria_id));
        const categoriaLabel = categoriaInfo?.nome || produto.categoria || 'Sem categoria';
        const estoqueAtual = Number(produto.estoque) || 0;
        const estoqueMinimoRaw = (produto.estoque_minimo === null || produto.estoque_minimo === undefined || produto.estoque_minimo === '')
            ? 10
            : Number(produto.estoque_minimo);
        const estoqueMinimo = Number.isFinite(estoqueMinimoRaw) ? estoqueMinimoRaw : 10;
        const estoqueBaixo = estoqueAtual <= estoqueMinimo;
        const estoqueClass = estoqueBaixo ? 'style="background-color: #ffebee;"' : '';
        
        html += `
            <tr ${estoqueClass}>
                <td>${produto.nome}</td>
                <td>${categoriaLabel}</td>
                <td>${parseFloat(produto.custo_unitario || 0).toFixed(2)} KZ</td>
                <td>${parseFloat(produto.preco_venda || 0).toFixed(2)} KZ</td>
                <td>${estoqueAtual} ${estoqueBaixo ? '⚠️' : ''}</td>
        `;
        
        if (canEdit) {
            html += `
                <td>
                    <button onclick="editProduct(${produto.id})" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">✏️</button>
                    ${userRole === 'admin' ? `<button onclick="deleteProduct(${produto.id}, '${produto.nome}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>` : ''}
                </td>
            `;
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    document.getElementById('produtos-list').innerHTML = html;
}

async function editProduct(id) {
    const produto = await fetch(`${API_URL}/produtos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    
    if (produto.success) {
        const p = produto.data;
        const nome = prompt('Nome:', p.nome);
        const categoria = prompt('Categoria:', p.categoria);
        const custo = prompt('Custo Unitário:', p.custo_unitario);
        const preco = prompt('Preço Venda:', p.preco_venda);
        const estoque = prompt('Estoque:', p.estoque);
        
        if (nome) {
            const response = await fetch(`${API_URL}/produtos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome: nome || p.nome,
                    categoria: categoria || p.categoria,
                    custo_unitario: parseFloat(custo) || p.custo_unitario,
                    preco_venda: parseFloat(preco) || p.preco_venda,
                    estoque: parseFloat(estoque) || p.estoque
                })
            });
            
            const data = await response.json();
            if (data.success) {
                alert('Produto atualizado!');
                loadProducts();
            } else {
                alert('Erro: ' + data.message);
            }
        }
    }
}

async function deleteProduct(id, nome) {
    if (confirm(`Tem certeza que deseja deletar o produto "${nome}"?`)) {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Produto deletado!');
            loadProducts();
        } else {
            alert('Erro: ' + data.message);
        }
    }
}

async function showAddProduct() {
    // Ensure categories are loaded before showing the form
    const categoriesLoaded = await ensureCategoriesLoaded();
    if (!categoriesLoaded) {
        console.warn('⚠️ Categorias não puderam ser carregadas. O formulário será exibido, mas o dropdown pode estar vazio.');
    }
    document.getElementById('add-product-form').style.display = 'block';
}

function hideAddProduct() {
    document.getElementById('add-product-form').style.display = 'none';
}

async function addProduct() {
    console.log('🆕 Iniciando adição de produto...');
    
    const nome = document.getElementById('prod-nome').value;
    const categoriaSelect = document.getElementById('produto-categoria');
    const categoria_id = categoriaSelect.value;
    const categoria = categoriaSelect.options[categoriaSelect.selectedIndex]?.text || '';
    const custo_unitario = parseFloat(document.getElementById('prod-custo').value) || 0;
    const preco_venda = parseFloat(document.getElementById('prod-preco').value) || 0;
    const estoque = parseInt(document.getElementById('prod-estoque').value) || 0;
    const estoque_minimo = parseInt(document.getElementById('prod-estoque-minimo').value) || 10;
    
    console.log('📝 Dados coletados:', {
        nome, categoria, categoria_id, custo_unitario, preco_venda, estoque, estoque_minimo
    });
    
    // Validações
    if (!nome.trim()) {
        alert('Nome do produto é obrigatório!');
        return;
    }
    
    if (!categoria_id) {
        alert('Selecione uma categoria!');
        return;
    }
    
    if (!preco_venda || preco_venda <= 0) {
        alert('Preço de venda deve ser maior que zero!');
        return;
    }
    
    try {
        const dadosEnvio = {
            nome: nome.trim(),
            categoria,
            categoria_id: parseInt(categoria_id),
            tipo: 'produto',
            unidade_medida: 'unidade',
            custo_unitario,
            preco_venda,
            estoque,
            estoque_minimo,
            ativo: 1
        };
        
        console.log('📤 Enviando dados:', dadosEnvio);
        
        const response = await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosEnvio)
        });
        
        const data = await response.json();
        console.log('📨 Resposta do servidor:', data);
        
        if (data.success) {
            alert('Produto adicionado com sucesso!');
            hideAddProduct();
            loadProducts();
        } else {
            alert('Erro ao adicionar produto: ' + (data.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        alert('Erro ao adicionar produto: ' + error.message);
    }
}

// ==================== VENDAS ====================
async function loadSales() {
    try {
        const response = await fetch(`${API_URL}/vendas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = `
                <div style="margin-bottom: 15px;">
                    <button onclick="gerarRelatorioPDF('vendas')" style="background: #3498db; color: white;">📄 Relatório de Vendas (PDF)</button>
                </div>
                <table><thead><tr><th>Data</th><th>Cliente</th><th>Produtos</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
            
            data.data.forEach(venda => {
                // Buscar itens da venda
                const produtos = venda.itens ? venda.itens.map(i => `${i.descricao} (${i.quantidade})`).join(', ') : 'N/A';
                
                html += `
                    <tr>
                        <td>${new Date(venda.data_venda).toLocaleString('pt-AO')}</td>
                        <td>${venda.cliente_nome || 'Sem cadastro'}</td>
                        <td>${produtos}</td>
                        <td>${venda.total} KZ</td>
                        <td>${venda.tipo_pagamento}</td>
                        <td>${venda.status}</td>
                        <td>
                            <button onclick="gerarRecibo(${venda.id})" style="background: #27ae60; color: white; padding: 5px 10px;">🧾 Recibo</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            document.getElementById('vendas-list').innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
    }
}

async function showNewSale() {
    try {
        // Carregar produtos no select
        const response = await fetch(`${API_URL}/produtos?ativo=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            let options = '<option value="">Selecione um produto</option>';
            data.data.forEach(p => {
                options += `<option value="${p.id}">${p.nome} - ${p.preco_venda} KZ</option>`;
            });
            document.getElementById('sale-produto').innerHTML = options;
        } else {
            console.error('Erro ao carregar produtos:', data.message);
            alert('Não foi possível carregar a lista de produtos. Verifique se há produtos cadastrados.');
        }

        saleItems = [];
        document.getElementById('sale-items').innerHTML = '';
        document.getElementById('new-sale-form').style.display = 'block';
        
        // Scroll para o formulário para garantir visibilidade em mobile
        document.getElementById('new-sale-form').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Erro ao abrir nova venda:', error);
        alert('Ocorreu um erro ao tentar abrir a tela de vendas: ' + error.message);
    }

function hideNewSale() {
    document.getElementById('new-sale-form').style.display = 'none';
}

async function addItemToSale() {
    const produtoId = document.getElementById('sale-produto').value;
    const quantidade = document.getElementById('sale-quantidade').value;
    
    if (!produtoId || !quantidade) {
        alert('Selecione um produto e quantidade');
        return;
    }
    
    const response = await fetch(`${API_URL}/produtos/${produtoId}`);
    
    const data = await response.json();
    
    if (data.success) {
        const produto = data.data;
        
        // Calcular IVA baseado na categoria do produto
        console.log('🔍 PRODUTO COMPLETO:', produto);
        console.log('🔍 sujeito_iva:', produto.sujeito_iva, typeof produto.sujeito_iva);
        console.log('🔍 taxa_iva_padrao:', produto.taxa_iva_padrao, typeof produto.taxa_iva_padrao);
        
        const subtotal = parseFloat(quantidade) * produto.preco_venda;
        const taxaIva = produto.sujeito_iva ? (produto.taxa_iva_padrao || 0) : 0;
        const valorIva = subtotal * (taxaIva / 100);
        const totalComIva = subtotal + valorIva;
        
        console.log(`📊 Produto: ${produto.nome}`);
        console.log(`📊 Categoria: ${produto.categoria_nome}`);
        console.log(`📊 Taxa IVA: ${taxaIva}%`);
        console.log(`📊 Subtotal: ${subtotal.toFixed(2)} KZ`);
        console.log(`📊 IVA: ${valorIva.toFixed(2)} KZ`);
        console.log(`📊 Total: ${totalComIva.toFixed(2)} KZ`);
        
        saleItems.push({
            produto_id: produto.id,
            descricao: produto.nome,
            quantidade: parseFloat(quantidade),
            preco_unitario: produto.preco_venda,
            categoria_id: produto.categoria_id,
            categoria_nome: produto.categoria_nome,
            taxa_iva: taxaIva,
            valor_iva: valorIva,
            subtotal: subtotal,
            total_com_iva: totalComIva
        });
        
        updateSaleItems();
    }
}

function updateSaleItems() {
    let html = '<h4>Itens da Venda:</h4>';
    let totalGeral = 0;
    let totalIva = 0;
    let totalSemIva = 0;
    
    saleItems.forEach((item, index) => {
        const subtotal = item.subtotal || (item.quantidade * item.preco_unitario);
        const valorIva = item.valor_iva || 0;
        const totalItem = item.total_com_iva || subtotal;
        
        totalSemIva += subtotal;
        totalIva += valorIva;
        totalGeral += totalItem;
        
        html += `
            <div class="sale-item" style="border: 1px solid #ddd; padding: 10px; margin: 5px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span><strong>${item.descricao}</strong> x ${item.quantidade}</span>
                    <button onclick="removeItemFromSale(${index})" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;">✕ Remover</button>
                </div>
                <div style="font-size: 12px; color: #666;">
                    ${item.categoria_nome || 'Categoria não definida'} - IVA: ${item.taxa_iva || 0}%
                </div>
                <div style="text-align: right;">
                    <div>Subtotal: ${subtotal.toFixed(2)} KZ</div>
                    ${valorIva > 0 ? `<div>IVA (${item.taxa_iva}%): ${valorIva.toFixed(2)} KZ</div>` : '<div>IVA: Isento</div>'}
                    <div><strong>Total: ${totalItem.toFixed(2)} KZ</strong></div>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="sale-total" style="border: 2px solid #27ae60; padding: 15px; margin: 10px 0; background: #f9f9f9;">
            <div>Subtotal (sem IVA): ${totalSemIva.toFixed(2)} KZ</div>
            <div>Total IVA: ${totalIva.toFixed(2)} KZ</div>
            <div style="font-size: 18px; font-weight: bold;">Total Geral: ${totalGeral.toFixed(2)} KZ</div>
        </div>
    `;
    
    document.getElementById('sale-items').innerHTML = html;
}

function removeItemFromSale(index) {
    saleItems.splice(index, 1);
    updateSaleItems();
}

async function finalizeSale() {
    if (saleItems.length === 0) {
        alert('Adicione pelo menos um item à venda');
        return;
    }
    
    const clienteNome = document.getElementById('sale-cliente-nome').value.trim();
    const desconto = document.getElementById('sale-desconto').value || 0;
    const tipo_pagamento = document.getElementById('sale-pagamento').value;
    
    // Primeiro, calcular IVA automático
    try {
        showLoadingNotification('Calculando IVA automático por categoria...');
        
        const calculoResponse = await fetch(`${API_URL}/vendas/calcular-iva`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itens: saleItems,
                desconto: parseFloat(desconto)
            })
        });
        
        const calculoData = await calculoResponse.json();
        
        if (!calculoData.success) {
            hideLoadingNotification();
            alert('Erro ao calcular IVA: ' + calculoData.message);
            return;
        }
        
        // Mostrar resumo do IVA calculado
        const resumoIva = calculoData.data.resumo_iva.map(r => 
            `${r.taxa_iva}%: ${r.valor_iva.toFixed(2)} KZ`
        ).join(', ');
        
        const confirmar = confirm(
            `IVA calculado automaticamente:\n` +
            `Subtotal: ${calculoData.data.subtotal.toFixed(2)} KZ\n` +
            `Desconto: ${calculoData.data.desconto_aplicado.toFixed(2)} KZ\n` +
            `IVA detalhado: ${resumoIva}\n` +
            `Total Final: ${calculoData.data.total_final.toFixed(2)} KZ\n\n` +
            `Confirmar venda?`
        );
        
        if (!confirmar) {
            hideLoadingNotification();
            return;
        }
        
    } catch (error) {
        hideLoadingNotification();
        alert('Erro ao calcular IVA: ' + error.message);
        return;
    }
    
    // Criar ou buscar cliente
    let cliente_id = null;
    if (clienteNome) {
        try {
            // Tentar criar o cliente
            const clienteResponse = await fetch(`${API_URL}/clientes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome: clienteNome,
                    telefone: '',
                    email: ''
                })
            });
            const clienteData = await clienteResponse.json();
            if (clienteData.success) {
                cliente_id = clienteData.data.id;
            }
        } catch (e) {
            console.log('Cliente já existe ou erro ao criar');
        }
    }
    
    // Registrar venda com IVA automático
    try {
        const response = await fetch(`${API_URL}/vendas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                usuario_id: currentUser.id,
                cliente_id: cliente_id,
                itens: saleItems,
                desconto: parseFloat(desconto),
                tipo_pagamento
                // Não enviar taxa_iva - será calculada automaticamente
            })
        });
        
        const data = await response.json();
        
        hideLoadingNotification();
        
        if (data.success) {
            const detalhesIva = data.data.detalhes_iva?.map(d => 
                `${d.taxa_iva}%: ${d.valor_iva?.toFixed(2) || 0} KZ`
            ).join(', ') || 'N/A';
            
            alert(
                `✅ Venda registrada com IVA automático!\n\n` +
                `📊 Resumo:\n` +
                `Subtotal: ${data.data.subtotal?.toFixed(2) || 0} KZ\n` +
                `Desconto: ${data.data.desconto?.toFixed(2) || 0} KZ\n` +
                `IVA: ${data.data.valor_iva?.toFixed(2) || 0} KZ\n` +
                `Total: ${data.data.total?.toFixed(2) || 0} KZ\n\n` +
                `🏷️ IVA por categoria: ${detalhesIva}`
            );
            
            hideNewSale();
            loadSales();
            // Limpar campo do cliente
            document.getElementById('sale-cliente-nome').value = '';
        } else {
            alert('Erro: ' + data.message);
        }
    } catch (error) {
        hideLoadingNotification();
        alert('Erro ao registrar venda: ' + error.message);
    }
}

// Função auxiliar para mostrar notificação de carregamento
function showLoadingNotification(message) {
    const existingLoading = document.getElementById('loading-notification');
    if (existingLoading) {
        existingLoading.remove();
    }
    
    const loading = document.createElement('div');
    loading.id = 'loading-notification';
    loading.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
    `;
    loading.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        ${message}
    `;
    
    document.body.appendChild(loading);
}

function hideLoadingNotification() {
    const loading = document.getElementById('loading-notification');
    if (loading) {
        loading.remove();
    }
}

// ==================== CATEGORIAS ====================

function loadCategorias() {
    console.log('📂 Carregando página de categorias...');
    
    // Carregar dados quando entrar na página
    if (window.categoriasManager) {
        categoriasManager.carregarCategorias();
    }
    
    // Mostrar aba produtos por padrão
    showCategoriasTab('produtos');
}

function showCategoriasTab(tab) {
    // Remover ativo de todas as abas e conteúdos
    document.querySelectorAll('#page-categorias .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-categorias .tab-content').forEach(c => c.classList.remove('active'));
    
    // Ativar aba clicada
    event.target.classList.add('active');
    document.getElementById(`categorias-${tab}`).classList.add('active');
    
    // Carregar dados específicos da aba
    if (tab === 'produtos' || tab === 'despesas') {
        if (window.categoriasManager) {
            categoriasManager.atualizarTabelaCategorias();
        }
    } else if (tab === 'estatisticas') {
        loadEstatisticasCategorias();
    }
}

async function loadEstatisticasCategorias() {
    try {
        // Carregar estatísticas de categorias de produtos
        const resProdutos = await fetch(`${API_URL}/categorias-produtos/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const resProdutsData = await resProdutos.json();
        
        // Carregar estatísticas de categorias de despesas  
        const resDespesas = await fetch(`${API_URL}/categorias-despesas/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const resDespesasData = await resDespesas.json();
        
        // Atualizar cards de estatísticas
        const statsContainer = document.getElementById('stats-cards');
        if (statsContainer && resProdutos.ok && resDespesas.ok) {
            statsContainer.innerHTML = `
                <div class="card">
                    <h3>📦 Categorias de Produtos</h3>
                    <p class="number">${resProdutsData.data.total}</p>
                    <small>Total de categorias</small>
                </div>
                
                <div class="card">
                    <h3>🏷️ Produtos</h3>
                    <p class="number">${resProdutsData.data.por_tipo.produto || 0}</p>
                    <small>Categorias de produtos físicos</small>
                </div>
                
                <div class="card">
                    <h3>⚙️ Serviços</h3>
                    <p class="number">${resProdutsData.data.por_tipo.servico || 0}</p>
                    <small>Categorias de serviços</small>
                </div>
                
                <div class="card">
                    <h3>💼 Categorias de Despesas</h3>
                    <p class="number">${resDespesasData.data.total}</p>
                    <small>Total de categorias</small>
                </div>
                
                <div class="card">
                    <h3>✅ Dedutíveis IRT</h3>
                    <p class="number">${resDespesasData.data.dedutiveis_irt}</p>
                    <small>Despesas dedutíveis</small>
                </div>
                
                <div class="card">
                    <h3>❌ Não Dedutíveis</h3>
                    <p class="number">${resDespesasData.data.nao_dedutiveis_irt}</p>
                    <small>Despesas não dedutíveis</small>
                </div>
            `;
        }
        
        // Criar gráfico de distribuição por IVA
        if (resProdutsData.data.por_iva) {
            criarGraficoIvaDistribuicao(resProdutsData.data.por_iva);
        }
        
        // Criar gráfico produtos vs serviços
        if (resProdutsData.data.por_tipo) {
            criarGraficoProdutosServicos(resProdutsData.data.por_tipo);
        }
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showNotification('Erro ao carregar estatísticas', 'error');
    }
}

function criarGraficoIvaDistribuicao(dadosIva) {
    const ctx = document.getElementById('chart-iva-distribuicao');
    if (!ctx) return;
    
    // Destruir gráfico anterior se existir
    if (window.chartIvaDistribuicao) {
        window.chartIvaDistribuicao.destroy();
    }
    
    const labels = Object.keys(dadosIva);
    const valores = Object.values(dadosIva);
    const cores = ['#4caf50', '#ff9800', '#f44336']; // Verde, laranja, vermelho
    
    window.chartIvaDistribuicao = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Categorias por Taxa de IVA'
                }
            }
        }
    });
}

function criarGraficoProdutosServicos(dadosTipo) {
    const ctx = document.getElementById('chart-produtos-servicos');
    if (!ctx) return;
    
    // Destruir gráfico anterior se existir
    if (window.chartProdutosServicos) {
        window.chartProdutosServicos.destroy();
    }
    
    const labels = Object.keys(dadosTipo).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const valores = Object.values(dadosTipo);
    
    window.chartProdutosServicos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade de Categorias',
                data: valores,
                backgroundColor: ['#2196f3', '#9c27b0'],
                borderWidth: 1,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ==================== FINANCEIRO ====================
function showFinanceiroTab(tab) {
    document.querySelectorAll('#page-financeiro .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-financeiro .tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`financeiro-${tab}`).classList.add('active');
    
    if (tab === 'dre') loadDRE();
    if (tab === 'capital') loadCapitalGiro();
    if (tab === 'precificacao') loadPrecificacao();
    if (tab === 'despesas') loadDespesas();
}

// ==================== CATEGORIAS ====================
async function loadCategorias() {
    console.log('📚 Carregando página de categorias...');
    
    // Aguardar um pouco para os elementos DOM carregarem
    setTimeout(() => {
        console.log('🔄 Re-inicializando eventos de categorias...');
        
        if (window.categoriasManager) {
            // Re-configurar todos os eventos
            categoriasManager.bindFormEvents();
            categoriasManager.setupButtonClickHandlers();
            
            // Recarregar dados
            categoriasManager.carregarCategorias();
            
            console.log('✅ Eventos de categorias re-configurados');
        } else {
            console.warn('⚠️ categoriasManager não encontrado');
        }
    }, 500);
}

async function loadFinanceiro() {
    loadDRE();
}

async function loadDRE() {
    try {
        const mes = new Date().getMonth() + 1;
        const ano = new Date().getFullYear();
        
        const response = await fetch(`${API_URL}/financeiro/dre?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const dre = data.dre;
            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>📊 DRE - Demonstrativo de Resultados (${data.periodo.mes}/${data.periodo.ano})</h3>
                    <button onclick="gerarRelatorioPDF('dre')" style="background: #e74c3c; color: white;">📄 Gerar PDF</button>
                </div>
                
                <div class="dre-table" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #34495e; color: white;">
                                <th style="text-align: left; padding: 12px;">Descrição</th>
                                <th style="text-align: right; padding: 12px;">Valor (KZ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- RECEITAS -->
                            <tr style="background: #ecf0f1;">
                                <td colspan="2" style="padding: 10px; font-weight: bold;">1. RECEITAS</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">Receita Bruta de Vendas (com IVA)</td>
                                <td style="padding: 8px; text-align: right;">${dre.receita_bruta_com_iva}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) IVA Recolhido (a repassar)</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.iva_recolhido})</td>
                            </tr>
                            <tr style="font-weight: bold; background: #f8f9fa;">
                                <td style="padding: 8px 20px;">= Receita Bruta (sem IVA)</td>
                                <td style="padding: 8px; text-align: right;">${dre.receita_bruta}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) Deduções/Descontos</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.deducoes})</td>
                            </tr>
                            <tr style="font-weight: bold; background: #d5e8d4;">
                                <td style="padding: 8px 20px;">= RECEITA LÍQUIDA</td>
                                <td style="padding: 8px; text-align: right;">${dre.receita_liquida}</td>
                            </tr>
                            
                            <!-- CUSTOS -->
                            <tr style="background: #ecf0f1;">
                                <td colspan="2" style="padding: 10px; font-weight: bold;">2. CUSTOS</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) CMV (Custo da Mercadoria Vendida)</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.cmv})</td>
                            </tr>
                            <tr style="font-weight: bold; background: #fff3cd;">
                                <td style="padding: 8px 20px;">= LUCRO BRUTO</td>
                                <td style="padding: 8px; text-align: right;">${dre.lucro_bruto}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 40px;"><small>Margem Bruta:</small></td>
                                <td style="padding: 8px; text-align: right;"><small>${dre.margem_bruta}</small></td>
                            </tr>
                            
                            <!-- DESPESAS OPERACIONAIS -->
                            <tr style="background: #ecf0f1;">
                                <td colspan="2" style="padding: 10px; font-weight: bold;">3. DESPESAS OPERACIONAIS</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) Despesas Administrativas</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.despesas_operacionais.administrativas})</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) Despesas Comerciais</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.despesas_operacionais.comerciais})</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) Outras Despesas Operacionais</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.despesas_operacionais.operacionais})</td>
                            </tr>
                            <tr style="font-weight: bold; background: #ffe6cc;">
                                <td style="padding: 8px 20px;">= LUCRO OPERACIONAL</td>
                                <td style="padding: 8px; text-align: right;">${dre.lucro_operacional}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 40px;"><small>Margem Operacional:</small></td>
                                <td style="padding: 8px; text-align: right;"><small>${dre.margem_operacional}</small></td>
                            </tr>
                            
                            <!-- DESPESAS COM PESSOAL -->
                            <tr style="background: #ecf0f1;">
                                <td colspan="2" style="padding: 10px; font-weight: bold;">
                                    4. DESPESAS COM PESSOAL
                                    ${dre.despesas_pessoal?.detalhamento?.folha_registrada 
                                        ? '<span style="color: #27ae60; font-size: 0.8em; margin-left: 10px;">✓ Folha Registrada</span>' 
                                        : '<span style="color: #e67e22; font-size: 0.8em; margin-left: 10px;">⚠ Estimativa</span>'}
                                </td>
                            </tr>
                            ${dre.despesas_pessoal?.detalhamento ? `
                            <tr>
                                <td style="padding: 8px 40px; font-size: 0.9em; color: #7f8c8d;">
                                    ${dre.despesas_pessoal.detalhamento.total_funcionarios} funcionário(s) • 
                                    Salário Base: ${dre.despesas_pessoal.detalhamento.salario_base_total} KZ • 
                                    INSS Empregado: ${dre.despesas_pessoal.detalhamento.inss_empregado} KZ • 
                                    IRT: ${dre.despesas_pessoal.detalhamento.irt_retido} KZ
                                </td>
                                <td></td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 8px 20px;">(-) Salários e Remunerações</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.despesas_pessoal?.salarios_liquidos || dre.folha_pagamento})</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 20px;">(-) INSS Patronal (8%)</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.despesas_pessoal?.inss_patronal || dre.inss_patronal})</td>
                            </tr>
                            ${dre.despesas_pessoal?.total_custo_pessoal ? `
                            <tr style="background: #fef5e7;">
                                <td style="padding: 8px 30px; font-weight: bold;">Custo Total com Pessoal</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; color: #e74c3c;">(${dre.despesas_pessoal.total_custo_pessoal})</td>
                            </tr>
                            ` : ''}
                            <tr style="font-weight: bold; background: #e1d5e7;">
                                <td style="padding: 8px 20px;">= LUCRO ANTES DOS IMPOSTOS</td>
                                <td style="padding: 8px; text-align: right;">${dre.lucro_antes_impostos}</td>
                            </tr>
                            
                            <!-- IMPOSTOS -->
                            <tr style="background: #ecf0f1;">
                                <td colspan="2" style="padding: 10px; font-weight: bold;">5. IMPOSTOS</td>
                            </tr>
                            ${parseFloat(dre.irt_estimado_percentual || 0) > 0 ? `
                            <tr>
                                <td style="padding: 8px 20px;">(-) Imposto Industrial ESTIMADO (${dre.irt_estimado_percentual}%)</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.irt_estimado})</td>
                            </tr>
                            ` : ''}
                            ${parseFloat(dre.imposto_selo || 0) > 0 ? `
                            <tr>
                                <td style="padding: 8px 20px;">(-) Imposto de Selo (${dre.imposto_selo_percentual}%)</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c;">(${dre.imposto_selo})</td>
                            </tr>
                            ` : ''}
                            ${parseFloat(dre.irt_estimado || 0) === 0 && parseFloat(dre.imposto_selo || 0) === 0 ? `
                            <tr>
                                <td style="padding: 8px 20px; color: #7f8c8d;" colspan="2">Sem impostos configurados para o período.</td>
                            </tr>
                            ` : ''}
                            
                            <!-- RESULTADO FINAL -->
                            <tr style="background: ${parseFloat(dre.lucro_liquido) >= 0 ? '#d4edda' : '#f8d7da'}; font-weight: bold; font-size: 1.1em;">
                                <td style="padding: 15px 20px;">= LUCRO LÍQUIDO DO PERÍODO</td>
                                <td style="padding: 15px; text-align: right; color: ${parseFloat(dre.lucro_liquido) >= 0 ? '#27ae60' : '#e74c3c'};">${dre.lucro_liquido}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 40px;"><small>Margem Líquida:</small></td>
                                <td style="padding: 8px; text-align: right;"><small><strong>${dre.margem_liquida}</strong></small></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #27ae60; border-radius: 4px;">
                    <h4 style="margin-top: 0;">ℹ️ Informações Importantes</h4>
                    <ul style="margin-bottom: 0;">
                        <li><strong>IVA:</strong> O valor recolhido deve ser repassado ao Estado</li>
                        <li><strong>CMV:</strong> Custo direto das mercadorias vendidas no período</li>
                        <li><strong>INSS Patronal:</strong> 8% sobre a folha de pagamento (Angola)</li>
                        <li><strong>Impostos:</strong> Imposto Industrial e Selo conforme configuração.</li>
                    </ul>
                </div>
            `;
            
            document.getElementById('financeiro-dre').innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar DRE:', error);
    }
}

async function loadCapitalGiro() {
    try {
        const response = await fetch(`${API_URL}/financeiro/capital-giro`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = `
                <h3>Gestão de Capital de Giro</h3>
                <p>Lucro Líquido: <strong>${data.lucro_liquido} KZ</strong></p>
                <div class="cards">
                    <div class="stat-card">
                        <h3>${data.distribuicao.capital_giro.finalidade}</h3>
                        <div class="value">${data.distribuicao.capital_giro.valor} KZ</div>
                        <small>${data.distribuicao.capital_giro.percentual}</small>
                    </div>
                    <div class="stat-card">
                        <h3>${data.distribuicao.fundo_reserva.finalidade}</h3>
                        <div class="value">${data.distribuicao.fundo_reserva.valor} KZ</div>
                        <small>${data.distribuicao.fundo_reserva.percentual}</small>
                    </div>
                    <div class="stat-card">
                        <h3>${data.distribuicao.distribuicao_lucro.finalidade}</h3>
                        <div class="value">${data.distribuicao.distribuicao_lucro.valor} KZ</div>
                        <small>${data.distribuicao.distribuicao_lucro.percentual}</small>
                    </div>
                </div>
            `;
            
            document.getElementById('financeiro-capital').innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar capital de giro:', error);
    }
}

async function loadPrecificacao() {
    const html = `
        <h3>Precificação Inteligente</h3>
        <p>Calcule o preço ideal para seus produtos</p>
        <div class="form-card">
            <select id="prec-produto"></select>
            <input type="number" id="prec-margem" placeholder="Margem desejada (%)" />
            <button onclick="calcularPreco()">Calcular</button>
        </div>
        <div id="prec-result"></div>
    `;
    
    document.getElementById('financeiro-precificacao').innerHTML = html;
    
    // Carregar produtos
    const response = await fetch(`${API_URL}/produtos`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
        let options = '<option value="">Selecione um produto</option>';
        data.data.forEach(p => {
            options += `<option value="${p.id}">${p.nome}</option>`;
        });
        document.getElementById('prec-produto').innerHTML = options;
    }
}

async function calcularPreco() {
    const produto_id = document.getElementById('prec-produto').value;
    const margem_desejada = document.getElementById('prec-margem').value;
    
    if (!produto_id) {
        alert('Selecione um produto');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/financeiro/precificacao`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ produto_id, margem_desejada })
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = `
                <div class="stat-card">
                    <h3>${data.produto.nome}</h3>
                    <p>Custo: ${data.calculo.custo_total} KZ</p>
                    <p>Margem: ${data.calculo.margem_aplicada}</p>
                    <div class="value">${data.calculo.preco_sugerido} KZ</div>
                    <p><strong>${data.mercado.recomendacao}</strong></p>
                </div>
            `;
            
            document.getElementById('prec-result').innerHTML = html;
        }
    } catch (error) {
        alert('Erro ao calcular preço: ' + error.message);
    }
}

async function loadDespesas() {
    try {
        // Obter resumo
        const mes = new Date().getMonth() + 1;
        const ano = new Date().getFullYear();
        
        const resumoResponse = await fetch(`${API_URL}/despesas/resumo?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resumoData = await resumoResponse.json();
        
        // Obter despesas
        const despesasResponse = await fetch(`${API_URL}/despesas?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const despesasData = await despesasResponse.json();
        
        let html = `
            <h3>Gestão de Despesas - ${mes}/${ano}</h3>
            
            <!-- Resumo -->
            <div class="cards">
                <div class="stat-card">
                    <h3>Total de Despesas</h3>
                    <div class="value">${resumoData.resumo?.valor_total?.toLocaleString('pt-AO') || 0} KZ</div>
                    <small>${resumoData.resumo?.total_despesas || 0} despesas</small>
                </div>
                <div class="stat-card">
                    <h3>Despesas Pagas</h3>
                    <div class="value">${resumoData.resumo?.valor_pago?.toLocaleString('pt-AO') || 0} KZ</div>
                </div>
                <div class="stat-card">
                    <h3>Despesas Pendentes</h3>
                    <div class="value">${resumoData.resumo?.valor_pendente?.toLocaleString('pt-AO') || 0} KZ</div>
                </div>
                <div class="stat-card">
                    <h3>Despesas Recorrentes</h3>
                    <div class="value">${resumoData.resumo?.despesas_recorrentes || 0}</div>
                </div>
            </div>
            
            <!-- Botões de ação -->
            <div style="margin: 20px 0;">
                <button onclick="showAddDespesa()">➕ Nova Despesa</button>
                <button onclick="loadDespesas()">🔄 Atualizar</button>
                <button onclick="gerarRelatorioPDF('despesas')" style="background: #9b59b6; color: white;">📄 Gerar PDF</button>
            </div>
            
            <!-- Formulário de nova despesa -->
            <div id="add-despesa-form" class="form-card" style="display:none;">
                <h3>Adicionar Despesa</h3>
                <select id="desp-tipo">
                    <option value="">Selecione o tipo</option>
                    <option value="fixa">Fixa</option>
                    <option value="variavel">Variável</option>
                    <option value="operacional">Operacional</option>
                    <option value="financeira">Financeira</option>
                    <option value="extraordinaria">Extraordinária</option>
                </select>
                <select id="desp-categoria"></select>
                <input type="text" id="desp-descricao" placeholder="Descrição" />
                <input type="number" id="desp-valor" placeholder="Valor (KZ)" step="0.01" />
                <input type="date" id="desp-data" />
                <label><input type="checkbox" id="desp-recorrente" /> Despesa recorrente</label>
                <label><input type="checkbox" id="desp-pago" checked /> Já foi paga</label>
                <textarea id="desp-observacoes" placeholder="Observações (opcional)" rows="3"></textarea>
                <button onclick="addDespesa()">Salvar</button>
                <button onclick="hideAddDespesa()">Cancelar</button>
            </div>
            
            <!-- Lista de despesas -->
            <h3>Despesas do Período</h3>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (despesasData.data && despesasData.data.length > 0) {
            despesasData.data.forEach(desp => {
                const dataFormatada = new Date(desp.data).toLocaleDateString('pt-AO');
                const statusIcon = desp.pago ? '✅' : '❌';
                const statusText = desp.pago ? 'Paga' : 'Pendente';
                const recorrenteIcon = desp.recorrente ? '🔄' : '';
                
                html += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${desp.tipo}</td>
                        <td>${desp.categoria || '-'}</td>
                        <td>${desp.descricao} ${recorrenteIcon}</td>
                        <td>${desp.valor.toLocaleString('pt-AO')} KZ</td>
                        <td>${statusIcon} ${statusText}</td>
                        <td>
                            <button onclick="togglePagoDespesa(${desp.id})" style="padding:5px 10px;">
                                ${desp.pago ? 'Marcar Pendente' : 'Marcar Paga'}
                            </button>
                            <button onclick="deleteDespesa(${desp.id})" style="padding:5px 10px; background:#dc3545;">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += '<tr><td colspan="7" style="text-align:center;">Nenhuma despesa registrada neste período</td></tr>';
        }
        
        html += '</tbody></table>';
        
        // Por categoria
        if (resumoData.por_categoria && resumoData.por_categoria.length > 0) {
            html += '<h3 style="margin-top:30px;">Despesas por Categoria</h3><table><thead><tr><th>Categoria</th><th>Tipo</th><th>Quantidade</th><th>Total</th></tr></thead><tbody>';
            resumoData.por_categoria.forEach(cat => {
                html += `
                    <tr>
                        <td>${cat.categoria || 'Sem categoria'}</td>
                        <td>${cat.tipo}</td>
                        <td>${cat.quantidade}</td>
                        <td>${cat.total.toLocaleString('pt-AO')} KZ</td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
        }
        
        document.getElementById('financeiro-despesas').innerHTML = html;
        
        // Carregar categorias no select
        await loadCategoriasDespesas();
        
    } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        document.getElementById('financeiro-despesas').innerHTML = '<p>Erro ao carregar despesas</p>';
    }
}

async function loadCategoriasDespesas() {
    try {
        const response = await fetch(`${API_URL}/despesas/categorias`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.data) {
            const select = document.getElementById('desp-categoria');
            if (select) {
                let options = '<option value="">Selecione a categoria</option>';
                data.data.forEach(cat => {
                    options += `<option value="${cat.valor}">${cat.nome}</option>`;
                });
                select.innerHTML = options;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

function showAddDespesa() {
    document.getElementById('add-despesa-form').style.display = 'block';
    document.getElementById('desp-data').valueAsDate = new Date();
}

function hideAddDespesa() {
    document.getElementById('add-despesa-form').style.display = 'none';
    // Limpar campos
    document.getElementById('desp-tipo').value = '';
    document.getElementById('desp-categoria').value = '';
    document.getElementById('desp-descricao').value = '';
    document.getElementById('desp-valor').value = '';
    document.getElementById('desp-recorrente').checked = false;
    document.getElementById('desp-pago').checked = true;
    document.getElementById('desp-observacoes').value = '';
}

async function addDespesa() {
    const tipo = document.getElementById('desp-tipo').value;
    const categoria = document.getElementById('desp-categoria').value;
    const descricao = document.getElementById('desp-descricao').value;
    const valor = document.getElementById('desp-valor').value;
    const data = document.getElementById('desp-data').value;
    const recorrente = document.getElementById('desp-recorrente').checked;
    const pago = document.getElementById('desp-pago').checked;
    const observacoes = document.getElementById('desp-observacoes').value;
    
    if (!tipo || !descricao || !valor) {
        alert('Preencha os campos obrigatórios: Tipo, Descrição e Valor');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/despesas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                tipo,
                categoria,
                descricao,
                valor: parseFloat(valor),
                data,
                recorrente,
                pago,
                observacoes
            })
        });
        
        const data_resp = await response.json();
        
        if (data_resp.success) {
            alert('Despesa adicionada com sucesso!');
            hideAddDespesa();
            loadDespesas();
        } else {
            alert('Erro: ' + data_resp.message);
        }
    } catch (error) {
        alert('Erro ao adicionar despesa: ' + error.message);
    }
}

async function togglePagoDespesa(id) {
    try {
        const response = await fetch(`${API_URL}/despesas/${id}/pagar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadDespesas();
        } else {
            alert('Erro: ' + data.message);
        }
    } catch (error) {
        alert('Erro ao alterar status: ' + error.message);
    }
}

async function deleteDespesa(id) {
    if (!confirm('Tem certeza que deseja deletar esta despesa?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/despesas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Despesa deletada com sucesso!');
            loadDespesas();
        } else {
            alert('Erro: ' + data.message);
        }
    } catch (error) {
        alert('Erro ao deletar despesa: ' + error.message);
    }
}

// ==================== FOLHA ====================
async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/folha/funcionarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = '<table><thead><tr><th>Nome</th><th>Categoria</th><th>Salário Base</th><th>Status</th></tr></thead><tbody>';
            
            data.data.forEach(func => {
                html += `
                    <tr>
                        <td>${func.nome}</td>
                        <td>${func.categoria}</td>
                        <td>${func.salario_base} KZ</td>
                        <td>${func.ativo ? 'Ativo' : 'Inativo'}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            document.getElementById('employees-list').innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
    }
}

function showAddEmployee() {
    document.getElementById('add-employee-form').style.display = 'block';
}

function hideAddEmployee() {
    document.getElementById('add-employee-form').style.display = 'none';
}

async function addEmployee() {
    const nome = document.getElementById('func-nome').value;
    const categoria = document.getElementById('func-categoria').value;
    const salario_base = document.getElementById('func-salario').value;
    
    try {
        const response = await fetch(`${API_URL}/folha/funcionarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome, categoria, salario_base })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Funcionário adicionado com sucesso!');
            hideAddEmployee();
            loadEmployees();
        }
    } catch (error) {
        alert('Erro ao adicionar funcionário: ' + error.message);
    }
}

async function calculatePayroll() {
    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();
    
    try {
        const response = await fetch(`${API_URL}/folha/calcular`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mes, ano })
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = `
                <h3>Folha de Pagamento - ${data.periodo.mes}/${data.periodo.ano}</h3>
                <div class="stat-card">
                    <h3>Resumo</h3>
                    <p>Funcionários: ${data.resumo.total_funcionarios}</p>
                    <p>Salário Base Total: ${data.resumo.total_salario_base} KZ</p>
                    <p>Descontos: ${data.resumo.total_descontos} KZ</p>
                    <p>Salário Líquido: ${data.resumo.total_salario_liquido} KZ</p>
                    <p>INSS Patronal: ${data.resumo.total_inss_patronal} KZ</p>
                    <div class="value">${data.resumo.total_custo_empresa} KZ</div>
                    <small>Custo Total Empresa</small>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Funcionário</th>
                            <th>Salário Base</th>
                            <th>Descontos</th>
                            <th>Líquido</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.folha_pagamento.forEach(f => {
                html += `
                    <tr>
                        <td>${f.nome}</td>
                        <td>${f.salario_base} KZ</td>
                        <td>${f.descontos.total_descontos} KZ</td>
                        <td>${f.salario_liquido} KZ</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            
            document.getElementById('payroll-result').innerHTML = html;
        }
    } catch (error) {
        alert('Erro ao calcular folha: ' + error.message);
    }
}

// ==================== RELATÓRIOS PDF ====================
async function gerarRelatorioPDF(tipo) {
    try {
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();
        
        console.log('🔍 Gerando PDF:', { tipo, mes, ano, userRole: currentUser?.role || currentUser?.funcao });
        console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
        
        // Gerar PDF e abrir em nova aba
        const response = await fetch(`${API_URL}/relatorios/${tipo}?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erro do servidor:', error);
            throw new Error(error.message || 'Erro ao gerar relatório');
        }
        
        // Converter resposta em blob
        const blob = await response.blob();
        console.log('📄 PDF blob gerado:', blob.size, 'bytes');
        
        // Criar URL temporária para o blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Abrir em nova aba
        const newWindow = window.open(blobUrl, '_blank');
        
        if (!newWindow) {
            alert('Por favor, permita pop-ups para visualizar o PDF');
        } else {
            console.log('✅ PDF aberto com sucesso');
        }
        
        // Limpar URL após 1 minuto
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
        alert('Erro ao gerar relatório: ' + error.message);
        console.error('❌ Erro detalhado:', error);
    }
}

// Gerar recibo de compra
async function gerarRecibo(vendaId) {
    try {
        const response = await fetch(`${API_URL}/vendas/${vendaId}/recibo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao gerar recibo');
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Abrir em nova aba
        const newWindow = window.open(blobUrl, '_blank');
        
        if (!newWindow) {
            alert('Por favor, permita pop-ups para visualizar o recibo');
        }
        
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
        console.error('Erro ao gerar recibo:', error);
        alert('Erro ao gerar recibo: ' + error.message);
    }
}

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', () => {
    // Limpar dados antigos do localStorage (pode remover após primeira execução)
    // localStorage.clear();
    
    // Verificar se já está logado
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
        token = storedToken;
        try {
            currentUser = JSON.parse(storedUser);
            // Verificar se tem os campos necessários
            if (currentUser && currentUser.nome) {
                showDashboard();
            } else {
                // Dados inválidos, limpar
                localStorage.clear();
            }
        } catch (e) {
            // Erro ao parsear, limpar
            localStorage.clear();
        }
    }
});
