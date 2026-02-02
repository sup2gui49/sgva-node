// SGVA AI Chat Widget
(function() {
    // Configurações
    const API_CHAT = 'http://localhost:3000/api/ai/chat';
    
    // Injetar CSS
    const css = `
        #sgva-ai-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        #sgva-ai-launcher {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #4285f4, #8ab4f8);
            border-radius: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
            border: none;
        }

        #sgva-ai-launcher:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }

        #sgva-ai-launcher svg {
            width: 30px;
            height: 30px;
            fill: white;
        }

        #sgva-ai-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e1e4e8;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s, transform 0.3s;
        }

        #sgva-ai-window.visible {
            display: flex;
            opacity: 1;
            transform: translateY(0);
        }

        .ai-header {
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #e1e4e8;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .ai-title {
            font-weight: 600;
            color: #1a73e8;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ai-body {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            background: #fff;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ai-footer {
            padding: 12px;
            border-top: 1px solid #e1e4e8;
            background: #fff;
        }

        .ai-input-group {
            display: flex;
            gap: 8px;
        }

        .ai-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
        }

        .ai-input:focus {
            border-color: #4285f4;
        }

        .ai-send-btn {
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .ai-send-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .message {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.4;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
            background: #e8f0fe;
            color: #1967d2;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }

        .message.ai {
            background: #f1f3f4;
            color: #3c4043;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }

        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 8px 12px;
            background: #f1f3f4;
            border-radius: 12px;
            width: fit-content;
            margin-bottom: 8px;
        }

        .typing-dot {
            width: 6px;
            height: 6px;
            background: #9aa0a6;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);

    // Injetar HTML
    const widget = document.createElement('div');
    widget.id = 'sgva-ai-widget';
    widget.innerHTML = `
        <div id="sgva-ai-window">
            <div class="ai-header">
                <div class="ai-title">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#1a73e8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                    Assistente SGVA
                </div>
                <button type="button" class="btn-close" style="font-size: 10px;" id="ai-close-btn" aria-label="Close"></button>
            </div>
            <div class="ai-body" id="ai-messages">
                <div class="message ai">
                    Olá! Sou a IA do SGVA. Como posso ajudar você hoje com vendas, RH ou dúvidas do sistema?
                </div>
            </div>
            <div class="ai-footer">
                <form id="ai-form" class="ai-input-group">
                    <input type="text" class="ai-input" id="ai-input" placeholder="Digite sua dúvida..." autocomplete="off">
                    <button type="submit" class="ai-send-btn" id="ai-submit">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </form>
            </div>
        </div>
        <button id="sgva-ai-launcher" title="Abrir Chat IA">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        </button>
    `;
    document.body.appendChild(widget);

    // Lógica
    const launcher = document.getElementById('sgva-ai-launcher');
    const window = document.getElementById('sgva-ai-window');
    const closeBtn = document.getElementById('ai-close-btn');
    const form = document.getElementById('ai-form');
    const input = document.getElementById('ai-input');
    const messages = document.getElementById('ai-messages');

    function toggleChat() {
        if (window.classList.contains('visible')) {
            window.classList.remove('visible');
            setTimeout(() => window.style.display = 'none', 300);
        } else {
            window.style.display = 'flex';
            // Force reflow
            void window.offsetWidth;
            window.classList.add('visible');
            input.focus();
        }
    }

    launcher.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    function addMessage(text, isUser) {
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user' : 'ai'}`;
        
        // Converter markdown básico para HTML (simples)
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        div.innerHTML = html;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.id = 'ai-typing';
        div.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('ai-typing');
        if (el) el.remove();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        // Add User Message
        addMessage(text, true);
        input.value = '';
        input.disabled = true;
        
        showTyping();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_CHAT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mensagem: text })
            });

            const data = await response.json();
            removeTyping();

            if (data.success) {
                addMessage(data.resposta, false);
            } else {
                addMessage(`Erro: ${data.message}`, false);
            }

        } catch (error) {
            removeTyping();
            addMessage('Desculpe, não consegui conectar ao servidor.', false);
            console.error(error);
        } finally {
            input.disabled = false;
            input.focus();
        }
    });

})();