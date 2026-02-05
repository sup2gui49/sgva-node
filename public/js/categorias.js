// ===== GESTÃO DE CATEGORIAS =====
class CategoriasManager {
    constructor() {
        this.categoriasProdutos = [];
        this.categoriasDespesas = [];
        this.init();
    }

    async init() {
        await this.carregarCategorias();
        this.setupEventListeners();
    }

    async carregarCategorias() {
        console.log('🔄 Carregando categorias...');
        
        try {
            // Carregar categorias de produtos
            console.log('📡 Fazendo request para /api/categorias-produtos');
            const resProdutos = await fetch('/api/categorias-produtos');
            
            console.log('📊 Status resposta produtos:', resProdutos.status);
            
            if (resProdutos.ok) {
                const data = await resProdutos.json();
                console.log('📝 Dados produtos recebidos:', data);
                this.categoriasProdutos = data.data || [];
                console.log('✅ Categorias produtos carregadas:', this.categoriasProdutos.length);
            } else {
                console.error('❌ Erro na resposta produtos:', await resProdutos.text());
            }

            // Carregar categorias de despesas
            console.log('📡 Fazendo request para /api/categorias-despesas');
            const resDespesas = await fetch('/api/categorias-despesas');
            
            console.log('📊 Status resposta despesas:', resDespesas.status);
            
            if (resDespesas.ok) {
                const data = await resDespesas.json();
                console.log('📝 Dados despesas recebidos:', data);
                this.categoriasDespesas = data.data || [];
                console.log('✅ Categorias despesas carregadas:', this.categoriasDespesas.length);
            } else {
                console.error('❌ Erro na resposta despesas:', await resDespesas.text());
            }

            console.log('🔄 Atualizando interface...');
            this.atualizarInterfaceCategorias();
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            showNotification('Erro ao carregar categorias', 'error');
        }
    }

    atualizarInterfaceCategorias() {
        // Atualizar selectores de categoria em produtos
        const selectCategoriaProduto = document.getElementById('produto-categoria');
        if (selectCategoriaProduto) {
            selectCategoriaProduto.innerHTML = '<option value="">Selecione uma categoria</option>';
            this.categoriasProdutos.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                const ivaText = cat.sujeito_iva ? `${cat.taxa_iva_padrao}% IVA` : 'Isento';
                option.textContent = `${cat.nome} (${cat.tipo} - ${ivaText})`;
                option.dataset.taxaIva = cat.taxa_iva_padrao;
                option.dataset.sujeitoIva = cat.sujeito_iva;
                option.dataset.tipo = cat.tipo;
                selectCategoriaProduto.appendChild(option);
            });
            
            // Adicionar evento de mudança para mostrar preview do IVA
            selectCategoriaProduto.addEventListener('change', this.mostrarPreviewIva.bind(this));
        }

        // Atualizar selectores de categoria em despesas
        const selectCategoriaDespesa = document.getElementById('despesa-categoria');
        if (selectCategoriaDespesa) {
            selectCategoriaDespesa.innerHTML = '<option value="">Selecione uma categoria</option>';
            this.categoriasDespesas.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.nome} ${cat.dedutivel_irt ? '(Dedutível IRT)' : '(Não Dedutível)'}`;
                option.dataset.dedutivelIrt = cat.dedutivel_irt;
                selectCategoriaDespesa.appendChild(option);
            });
        }

        // Atualizar tabela de categorias se existir
        this.atualizarTabelaCategorias();
    }

    // Helper method to render a category row
    renderCategoriaProdutoRow(cat, qtdProdutos = null) {
        const tr = document.createElement('tr');
        const produtoDisplay = qtdProdutos !== null 
            ? `📦 ${qtdProdutos} ${qtdProdutos === 1 ? 'produto' : 'produtos'}`
            : '📦 N/A';
        const badgeClass = qtdProdutos !== null ? 'badge-info' : 'badge-secondary';
        
        tr.innerHTML = `
            <td>${cat.nome}</td>
            <td><span class="badge ${cat.tipo === 'produto' ? 'badge-primary' : 'badge-secondary'}">${cat.tipo}</span></td>
            <td class="text-center">
                <span class="badge ${cat.sujeito_iva ? 'badge-success' : 'badge-warning'}">
                    ${cat.sujeito_iva ? cat.taxa_iva_padrao + '%' : 'Isento'}
                </span>
            </td>
            <td class="text-center">
                <span class="badge ${badgeClass}" style="font-size: 14px;">
                    ${produtoDisplay}
                </span>
            </td>
            <td>${cat.descricao || '-'}</td>
            <td>
                <button onclick="categoriasManager.editarCategoriaProduto(${cat.id})" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">✏️</button>
                <button onclick="categoriasManager.excluirCategoriaProduto(${cat.id})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
            </td>
        `;
        return tr;
    }

    atualizarTabelaCategorias() {
        console.log('📋 Atualizando tabelas de categorias...');
        
        const tabelaProdutos = document.getElementById('tabela-categorias-produtos');
        console.log('🔍 Tabela produtos encontrada:', !!tabelaProdutos);
        console.log('📊 Categorias produtos para mostrar:', this.categoriasProdutos.length);
        
        if (tabelaProdutos) {
            const tbody = tabelaProdutos.querySelector('tbody');
            tbody.innerHTML = '';
            
            if (this.categoriasProdutos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma categoria encontrada</td></tr>';
            }
            
            // Buscar contagem de produtos por categoria
            fetch('/api/produtos')
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    const produtos = data.data || [];
                    const contagemPorCategoria = {};
                    
                    produtos.forEach(p => {
                        if (p.categoria_id) {
                            contagemPorCategoria[p.categoria_id] = (contagemPorCategoria[p.categoria_id] || 0) + 1;
                        }
                    });
                    
                    this.categoriasProdutos.forEach(cat => {
                        const qtdProdutos = contagemPorCategoria[cat.id] || 0;
                        tbody.appendChild(this.renderCategoriaProdutoRow(cat, qtdProdutos));
                    });
                })
                .catch(error => {
                    console.warn('⚠️ Não foi possível carregar contagem de produtos:', error.message);
                    // Continue mostrando as categorias mesmo sem a contagem de produtos
                    this.categoriasProdutos.forEach(cat => {
                        tbody.appendChild(this.renderCategoriaProdutoRow(cat, null));
                    });
                });
        }

        const tabelaDespesas = document.getElementById('tabela-categorias-despesas');
        if (tabelaDespesas) {
            const tbody = tabelaDespesas.querySelector('tbody');
            tbody.innerHTML = '';
            
            this.categoriasDespesas.forEach(cat => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cat.nome}</td>
                    <td>${cat.codigo_fiscal || '-'}</td>
                    <td class="text-center">
                        <span class="badge ${cat.dedutivel_irt ? 'badge-success' : 'badge-danger'}">
                            ${cat.dedutivel_irt ? 'Sim' : 'Não'}
                        </span>
                    </td>
                    <td>${cat.descricao || '-'}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="categoriasManager.editarCategoriaDespesa(${cat.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="categoriasManager.excluirCategoriaDespesa(${cat.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners para categorias...');
        
        // Aguardar DOM estar pronto
        document.addEventListener('DOMContentLoaded', () => {
            this.bindFormEvents();
        });
        
        // Se DOM já está pronto, executar imediatamente
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            this.bindFormEvents();
        }
    }

    bindFormEvents() {
        // Formulário de nova categoria de produto
        const formCategoriaProduto = document.getElementById('form-categoria-produto');
        if (formCategoriaProduto) {
            console.log('✅ Event listener adicionado ao form de categoria produto');
            
            // Remover listeners existentes
            formCategoriaProduto.removeEventListener('submit', this.handleSubmitProduto);
            
            // Adicionar novo listener
            this.handleSubmitProduto = async (e) => {
                e.preventDefault();
                console.log('📝 Formulário de categoria produto submetido');
                await this.salvarCategoriaProduto();
            };
            
            formCategoriaProduto.addEventListener('submit', this.handleSubmitProduto);
        } else {
            console.warn('⚠️ Formulário form-categoria-produto não encontrado');
        }

        // Formulário de nova categoria de despesa
        const formCategoriaDespesa = document.getElementById('form-categoria-despesa');
        if (formCategoriaDespesa) {
            console.log('✅ Event listener adicionado ao form de categoria despesa');
            
            // Remover listeners existentes
            formCategoriaDespesa.removeEventListener('submit', this.handleSubmitDespesa);
            
            // Adicionar novo listener
            this.handleSubmitDespesa = async (e) => {
                e.preventDefault();
                console.log('📝 Formulário de categoria despesa submetido');
                await this.salvarCategoriaDespesa();
            };
            
            formCategoriaDespesa.addEventListener('submit', this.handleSubmitDespesa);
        } else {
            console.warn('⚠️ Formulário form-categoria-despesa não encontrado');
        }

        // Atualizar taxa de IVA baseada no tipo
        const tipoCategoria = document.getElementById('categoria-tipo');
        const sujeitoIva = document.getElementById('categoria-sujeito-iva');
        const taxaIva = document.getElementById('categoria-taxa-iva');
        
        if (tipoCategoria && sujeitoIva && taxaIva) {
            sujeitoIva.addEventListener('change', (e) => {
                if (e.target.checked) {
                    taxaIva.disabled = false;
                    if (taxaIva.value === '0') taxaIva.value = '14';
                } else {
                    taxaIva.disabled = true;
                    taxaIva.value = '0';
                }
            });
        }
        
        // BACKUP: Event listeners diretos nos botões (caso o form não funcione)
        this.setupButtonClickHandlers();
    }

    setupButtonClickHandlers() {
        // Aguardar um pouco para os elementos aparecerem
        setTimeout(() => {
            // Botões de salvar categoria produto
            const btnSalvarProduto = document.querySelector('#form-categoria-produto button[type="submit"]');
            if (btnSalvarProduto) {
                console.log('🔘 Event listener direto no botão Salvar Produto');
                btnSalvarProduto.addEventListener('click', async (e) => {
                    e.preventDefault();
                    console.log('🖱️ Botão Salvar Produto clicado diretamente');
                    await this.salvarCategoriaProduto();
                });
            }

            // Botões de salvar categoria despesa
            const btnSalvarDespesa = document.querySelector('#form-categoria-despesa button[type="submit"]');
            if (btnSalvarDespesa) {
                console.log('🔘 Event listener direto no botão Salvar Despesa');
                btnSalvarDespesa.addEventListener('click', async (e) => {
                    e.preventDefault();
                    console.log('🖱️ Botão Salvar Despesa clicado diretamente');
                    await this.salvarCategoriaDespesa();
                });
            }
        }, 1000);
    }

    async salvarCategoriaProduto() {
        console.log('💾 Iniciando salvamento de categoria produto...');
        
        try {
            const form = document.getElementById('form-categoria-produto');
            if (!form) {
                console.error('❌ Formulário não encontrado!');
                showNotification('Erro: Formulário não encontrado', 'error');
                return;
            }
            
            console.log('📋 Formulário encontrado:', form);
            
            const formData = new FormData(form);
            console.log('📝 Dados do formulário capturados');
            
            // Log de todos os campos
            for (let [key, value] of formData.entries()) {
                console.log(`   ${key}: ${value}`);
            }
            
            const data = {
                nome: formData.get('nome'),
                descricao: formData.get('descricao'),
                tipo: formData.get('tipo'),
                sujeito_iva: formData.get('sujeito_iva') ? 1 : 0,
                taxa_iva_padrao: parseFloat(formData.get('taxa_iva_padrao')) || 0
            };
            
            console.log('📊 Dados processados:', data);

            const categoriaId = formData.get('categoria_id');
            const method = categoriaId ? 'PUT' : 'POST';
            const url = categoriaId ? `/api/categorias-produtos/${categoriaId}` : '/api/categorias-produtos';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(result.message, 'success');
                document.getElementById('form-categoria-produto').reset();
                document.getElementById('modal-categoria-produto').style.display = 'none';
                await this.carregarCategorias();
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            showNotification('Erro ao salvar categoria', 'error');
        }
    }

    async salvarCategoriaDespesa() {
        try {
            const formData = new FormData(document.getElementById('form-categoria-despesa'));
            const data = {
                nome: formData.get('nome'),
                descricao: formData.get('descricao'),
                codigo_fiscal: formData.get('codigo_fiscal'),
                dedutivel_irt: formData.get('dedutivel_irt') ? 1 : 0
            };

            const categoriaId = formData.get('categoria_id');
            const method = categoriaId ? 'PUT' : 'POST';
            const url = categoriaId ? `/api/categorias-despesas/${categoriaId}` : '/api/categorias-despesas';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(result.message, 'success');
                document.getElementById('form-categoria-despesa').reset();
                document.getElementById('modal-categoria-despesa').style.display = 'none';
                await this.carregarCategorias();
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            showNotification('Erro ao salvar categoria', 'error');
        }
    }

    async editarCategoriaProduto(id) {
        const categoria = this.categoriasProdutos.find(c => c.id === id);
        if (!categoria) return;

        // Preencher formulário
        const form = document.getElementById('form-categoria-produto');
        form.querySelector('[name="categoria_id"]').value = categoria.id;
        form.querySelector('[name="nome"]').value = categoria.nome;
        form.querySelector('[name="descricao"]').value = categoria.descricao || '';
        form.querySelector('[name="tipo"]').value = categoria.tipo;
        form.querySelector('[name="sujeito_iva"]').checked = categoria.sujeito_iva;
        form.querySelector('[name="taxa_iva_padrao"]').value = categoria.taxa_iva_padrao;
        form.querySelector('[name="taxa_iva_padrao"]').disabled = !categoria.sujeito_iva;

        // Mostrar modal
        document.getElementById('modal-categoria-produto').style.display = 'block';
        document.getElementById('modal-categoria-produto-title').textContent = 'Editar Categoria de Produto';
    }

    async editarCategoriaDespesa(id) {
        const categoria = this.categoriasDespesas.find(c => c.id === id);
        if (!categoria) return;

        // Preencher formulário
        const form = document.getElementById('form-categoria-despesa');
        form.querySelector('[name="categoria_id"]').value = categoria.id;
        form.querySelector('[name="nome"]').value = categoria.nome;
        form.querySelector('[name="descricao"]').value = categoria.descricao || '';
        form.querySelector('[name="codigo_fiscal"]').value = categoria.codigo_fiscal || '';
        form.querySelector('[name="dedutivel_irt"]').checked = categoria.dedutivel_irt;

        // Mostrar modal
        document.getElementById('modal-categoria-despesa').style.display = 'block';
        document.getElementById('modal-categoria-despesa-title').textContent = 'Editar Categoria de Despesa';
    }

    async excluirCategoriaProduto(id) {
        const categoria = this.categoriasProdutos.find(c => c.id === id);
        if (!categoria) {
            console.error('❌ Categoria não encontrada:', id);
            return;
        }

        console.log('🗑️ Tentando excluir categoria:', categoria.nome);

        if (confirm(`Tem certeza que deseja excluir a categoria "${categoria.nome}"?\n\nAtenção: Produtos vinculados podem ficar sem categoria!`)) {
            try {
                console.log('📡 DELETE /api/categorias-produtos/' + id);
                
                const response = await fetch(`/api/categorias-produtos/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                console.log('📥 Response status:', response.status);

                const result = await response.json();
                console.log('📦 Response data:', result);

                if (response.ok && result.success) {
                    console.log('✅ Categoria excluída com sucesso');
                    showNotification(result.message || 'Categoria excluída com sucesso!', 'success');
                    await this.carregarCategorias();
                } else {
                    console.error('❌ Falha ao excluir:', result.message);
                    showNotification(result.message || 'Erro ao excluir categoria', 'error');
                }
            } catch (error) {
                console.error('❌ Erro ao excluir categoria:', error);
                showNotification('Erro ao excluir categoria: ' + error.message, 'error');
            }
        }
    }

    async excluirCategoriaDespesa(id) {
        const categoria = this.categoriasDespesas.find(c => c.id === id);
        if (!categoria) return;

        if (confirm(`Tem certeza que deseja excluir a categoria "${categoria.nome}"?`)) {
            try {
                const response = await fetch(`/api/categorias-despesas/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification(result.message, 'success');
                    await this.carregarCategorias();
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir categoria:', error);
                showNotification('Erro ao excluir categoria', 'error');
            }
        }
    }

    mostrarModalCategoriaProduto() {
        console.log('🎯 Abrindo modal de categoria produto');
        
        // Limpar formulário
        const form = document.getElementById('form-categoria-produto');
        if (form) {
            form.reset();
            form.querySelector('[name="categoria_id"]').value = '';
            form.querySelector('[name="taxa_iva_padrao"]').disabled = false;
        }
        
        // Mostrar modal
        const modal = document.getElementById('modal-categoria-produto');
        modal.style.display = 'block';
        document.getElementById('modal-categoria-produto-title').textContent = 'Nova Categoria de Produto';
        
        // Re-configurar eventos após abrir modal
        setTimeout(() => {
            console.log('🔄 Re-configurando eventos do modal...');
            this.bindFormEvents();
            this.setupButtonClickHandlers();
        }, 100);
    }

    mostrarModalCategoriaDespesa() {
        console.log('🎯 Abrindo modal de categoria despesa');
        
        // Limpar formulário
        const form = document.getElementById('form-categoria-despesa');
        if (form) {
            form.reset();
            form.querySelector('[name="categoria_id"]').value = '';
        }
        
        // Mostrar modal
        const modal = document.getElementById('modal-categoria-despesa');
        modal.style.display = 'block';
        document.getElementById('modal-categoria-despesa-title').textContent = 'Nova Categoria de Despesa';
        
        // Re-configurar eventos após abrir modal
        setTimeout(() => {
            console.log('🔄 Re-configurando eventos do modal...');
            this.bindFormEvents();
            this.setupButtonClickHandlers();
        }, 100);
    }

    fecharModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Mostrar preview do IVA quando categoria é selecionada
    mostrarPreviewIva(event) {
        const select = event.target;
        const previewDiv = document.getElementById('iva-preview');
        const ivaTaxaSpan = document.getElementById('iva-taxa');
        const ivaTipoSpan = document.getElementById('iva-tipo');
        
        if (select.value && previewDiv && ivaTaxaSpan && ivaTipoSpan) {
            const selectedOption = select.options[select.selectedIndex];
            const taxaIva = selectedOption.dataset.taxaIva;
            const sujeitoIva = selectedOption.dataset.sujeitoIva === '1';
            const tipo = selectedOption.dataset.tipo;
            
            const ivaText = sujeitoIva ? `${taxaIva}%` : '0% (Isento)';
            ivaTaxaSpan.textContent = ivaText;
            ivaTipoSpan.textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1);
            
            previewDiv.style.display = 'block';
            
            // Adicionar cor baseada na taxa
            if (!sujeitoIva) {
                previewDiv.style.background = '#e8f5e8';
                previewDiv.style.borderLeft = '4px solid #4caf50';
            } else if (taxaIva == 7) {
                previewDiv.style.background = '#fff3cd';
                previewDiv.style.borderLeft = '4px solid #ff9800';
            } else {
                previewDiv.style.background = '#f8d7da';
                previewDiv.style.borderLeft = '4px solid #f44336';
            }
            
            previewDiv.style.padding = '10px';
            previewDiv.style.borderRadius = '5px';
            previewDiv.style.margin = '10px 0';
            
        } else if (previewDiv) {
            previewDiv.style.display = 'none';
        }
    }

    // Método para obter informações de IVA de um produto
    obterInfoIvaProduto(produtoId) {
        // Buscar produto para obter categoria
        const produto = produtos.find(p => p.id === produtoId);
        if (!produto || !produto.categoria_id) {
            return { taxa_iva: 14, valor_iva: 0, sujeito_iva: 1 }; // Padrão
        }

        const categoria = this.categoriasProdutos.find(c => c.id === produto.categoria_id);
        if (!categoria) {
            return { taxa_iva: 14, valor_iva: 0, sujeito_iva: 1 }; // Padrão
        }

        return {
            taxa_iva: categoria.taxa_iva_padrao,
            sujeito_iva: categoria.sujeito_iva,
            categoria_nome: categoria.nome,
            tipo_categoria: categoria.tipo
        };
    }
}

// Instanciar o gerenciador de categorias
const categoriasManager = new CategoriasManager();

// FUNÇÕES GLOBAIS PARA ONCLICK DIRETO (SOLUÇÃO DEFINITIVA)
window.salvarCategoriaProdutoDirecto = async function() {
    console.log('🚀 Salvamento direto de categoria produto iniciado');
    
    try {
        const form = document.getElementById('form-categoria-produto');
        if (!form) {
            alert('Formulário não encontrado!');
            return;
        }
        
        const formData = new FormData(form);
        
        // Validar campos obrigatórios
        const nome = formData.get('nome');
        if (!nome || nome.trim() === '') {
            alert('Por favor, preencha o nome da categoria');
            return;
        }
        
        const data = {
            nome: nome.trim(),
            descricao: formData.get('descricao') || '',
            tipo: formData.get('tipo') || 'produto',
            sujeito_iva: formData.get('sujeito_iva') ? 1 : 0,
            taxa_iva_padrao: parseFloat(formData.get('taxa_iva_padrao')) || 0
        };
        
        console.log('📊 Dados a enviar:', data);
        
        const categoriaId = formData.get('categoria_id');
        const method = categoriaId ? 'PUT' : 'POST';
        const url = categoriaId ? `/api/categorias-produtos/${categoriaId}` : '/api/categorias-produtos';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('📡 Resposta do servidor:', result);
        
        if (response.ok) {
            alert('Categoria salva com sucesso!');
            form.reset();
            document.getElementById('modal-categoria-produto').style.display = 'none';
            if (categoriasManager && categoriasManager.carregarCategorias) {
                await categoriasManager.carregarCategorias();
            }
        } else {
            alert('Erro ao salvar: ' + (result.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro ao salvar categoria: ' + error.message);
    }
};

window.salvarCategoriaDespesaDirecto = async function() {
    console.log('🚀 Salvamento direto de categoria despesa iniciado');
    
    try {
        const form = document.getElementById('form-categoria-despesa');
        if (!form) {
            alert('Formulário não encontrado!');
            return;
        }
        
        const formData = new FormData(form);
        
        // Validar campos obrigatórios
        const nome = formData.get('nome');
        if (!nome || nome.trim() === '') {
            alert('Por favor, preencha o nome da categoria');
            return;
        }
        
        const data = {
            nome: nome.trim(),
            descricao: formData.get('descricao') || '',
            codigo_fiscal: formData.get('codigo_fiscal') || '',
            dedutivel_irt: formData.get('dedutivel_irt') ? 1 : 0
        };
        
        console.log('📊 Dados a enviar:', data);
        
        const categoriaId = formData.get('categoria_id');
        const method = categoriaId ? 'PUT' : 'POST';
        const url = categoriaId ? `/api/categorias-despesas/${categoriaId}` : '/api/categorias-despesas';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('📡 Resposta do servidor:', result);
        
        if (response.ok) {
            alert('Categoria salva com sucesso!');
            form.reset();
            document.getElementById('modal-categoria-despesa').style.display = 'none';
            if (categoriasManager && categoriasManager.carregarCategorias) {
                await categoriasManager.carregarCategorias();
            }
        } else {
            alert('Erro ao salvar: ' + (result.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro ao salvar categoria: ' + error.message);
    }
};

// Função global para teste de salvamento
window.testarSalvarCategoria = function() {
    console.log('🧪 Teste manual de salvamento de categoria');
    
    // Verificar se modal está aberto
    const modal = document.getElementById('modal-categoria-produto');
    if (modal && modal.style.display === 'block') {
        console.log('✅ Modal está aberto, executando salvamento...');
        categoriasManager.salvarCategoriaProduto();
    } else {
        console.log('❌ Modal não está aberto. Abrindo modal primeiro...');
        categoriasManager.mostrarModalCategoriaProduto();
        setTimeout(() => {
            console.log('Modal aberto, preencha os campos e execute testarSalvarCategoria() novamente');
        }, 500);
    }
};

// Função global para debug
window.debugCategorias = function() {
    console.log('🔍 Debug do sistema de categorias:');
    console.log('   - categoriasManager:', categoriasManager);
    console.log('   - Form produto:', document.getElementById('form-categoria-produto'));
    console.log('   - Form despesa:', document.getElementById('form-categoria-despesa'));
    console.log('   - Modal produto:', document.getElementById('modal-categoria-produto'));
    console.log('   - Modal despesa:', document.getElementById('modal-categoria-despesa'));
};