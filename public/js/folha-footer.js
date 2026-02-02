// Script para adicionar rodapé dinâmico em todas as páginas de folha
(function() {
    'use strict';
    
    const API_URL = 'http://localhost:3000/api';
    
    // Criar e adicionar rodapé
    function criarRodapeDinamico() {
        // Verificar se já existe
        if (document.querySelector('.dynamic-footer')) return;
        
        const footer = document.createElement('div');
        footer.className = 'dynamic-footer';
        footer.innerHTML = `
            <div class="footer-section">
                <div class="footer-info">
                    <i class="bi bi-building"></i>
                    <span class="footer-company" id="footerEmpresa">Carregando...</span>
                </div>
                <div class="footer-info">
                    <i class="bi bi-person-circle"></i>
                    <span id="footerUsuario">Usuário</span>
                </div>
            </div>
            <div class="footer-section">
                <div class="footer-info">
                    <i class="bi bi-calendar3"></i>
                    <span id="footerData"></span>
                </div>
                <div class="footer-info">
                    <i class="bi bi-clock"></i>
                    <span id="footerHora"></span>
                </div>
                <div class="footer-badge" id="footerStatus">
                    <i class="bi bi-wifi"></i> Online
                </div>
            </div>
        `;
        
        document.body.appendChild(footer);
        
        // Inicializar dados
        atualizarDataHora();
        carregarDadosEmpresa();
        carregarUsuario();
        verificarConexao();
        
        // Atualizar hora a cada segundo
        setInterval(atualizarDataHora, 1000);
        
        // Verificar conexão a cada 30 segundos
        setInterval(verificarConexao, 30000);
    }
    
    // Atualizar data e hora
    function atualizarDataHora() {
        const agora = new Date();
        const data = agora.toLocaleDateString('pt-AO', { 
            weekday: 'short', 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        const hora = agora.toLocaleTimeString('pt-AO', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        const footerData = document.getElementById('footerData');
        const footerHora = document.getElementById('footerHora');
        
        if (footerData) footerData.textContent = data;
        if (footerHora) footerHora.textContent = hora;
    }
    
    // Carregar dados da empresa
    async function carregarDadosEmpresa() {
        try {
            const response = await fetch(`${API_URL}/empresa`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const footerEmpresa = document.getElementById('footerEmpresa');
                if (footerEmpresa) {
                    footerEmpresa.textContent = result.data.nome;
                    footerEmpresa.title = `${result.data.nome} - ${result.data.nif || 'Sem NIF'}`;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados da empresa:', error);
            const footerEmpresa = document.getElementById('footerEmpresa');
            if (footerEmpresa) {
                footerEmpresa.textContent = 'SGVA';
            }
        }
    }
    
    // Carregar dados do usuário
    function carregarUsuario() {
        const usuario = localStorage.getItem('usuario_nome') || 'Administrador';
        const footerUsuario = document.getElementById('footerUsuario');
        if (footerUsuario) {
            footerUsuario.textContent = usuario;
        }
    }
    
    // Verificar conexão
    async function verificarConexao() {
        const footerStatus = document.getElementById('footerStatus');
        if (!footerStatus) return;
        
        try {
            const response = await fetch(`${API_URL}/health`, { 
                method: 'GET',
                cache: 'no-cache',
                timeout: 5000 
            });
            
            if (response.ok) {
                footerStatus.innerHTML = '<i class="bi bi-wifi"></i> Online';
                footerStatus.style.background = 'rgba(40, 167, 69, 0.3)';
            } else {
                footerStatus.innerHTML = '<i class="bi bi-wifi-off"></i> Offline';
                footerStatus.style.background = 'rgba(220, 53, 69, 0.3)';
            }
        } catch (error) {
            footerStatus.innerHTML = '<i class="bi bi-wifi-off"></i> Offline';
            footerStatus.style.background = 'rgba(220, 53, 69, 0.3)';
        }
    }
    
    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
             criarRodapeDinamico();
             loadGemini();
        });
    } else {
        criarRodapeDinamico();
        loadGemini();
    }

    function loadGemini() {
        const script = document.createElement('script');
        script.src = 'js/gemini-chat.js';
        document.body.appendChild(script);
    }
})();
