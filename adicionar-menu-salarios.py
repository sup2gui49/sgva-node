import os
import re

# Diretório com os arquivos
diretorio = r'C:\xampp\htdocs\sgva-node\public'

# Arquivos a atualizar (exceto folha-salarios.html e folha-calculo.html que já foram atualizados)
arquivos = [
    'folha-dashboard.html',
    'folha-funcionarios.html',
    'folha-subsidios.html',
    'folha-categorias.html',
    'folha-irt.html',
    'folha-historico.html',
    'folha-excel.html',
    'folha-notificacoes.html',
    'folha-backup.html'
]

# Novo item do menu
novo_item = '''                    <li class="nav-item mb-2">
                        <a class="nav-link" href="folha-salarios.html">
                            <i class="bi bi-table"></i> Folha de Salários
                        </a>
                    </li>'''

# Padrão para encontrar onde inserir (após "Calcular Folha")
padrao = r'(</a>\s*</li>\s*<li class="nav-item mb-2">\s*<a class="nav-link[^"]*" href="folha-irt\.html">)'

contador = 0

for arquivo in arquivos:
    caminho = os.path.join(diretorio, arquivo)
    
    if not os.path.exists(caminho):
        print(f'⚠️  Arquivo não encontrado: {arquivo}')
        continue
    
    with open(caminho, 'r', encoding='utf-8') as f:
        conteudo = f.read()
    
    # Verificar se já tem o link
    if 'folha-salarios.html' in conteudo:
        print(f'✓ {arquivo} - já atualizado')
        continue
    
    # Encontrar a seção "Calcular Folha" e inserir após
    padrao_busca = r'(<li class="nav-item mb-2">\s*<a class="nav-link[^"]*" href="folha-calculo\.html">.*?</a>\s*</li>)'
    
    match = re.search(padrao_busca, conteudo, re.DOTALL)
    
    if match:
        # Inserir o novo item após o match
        pos = match.end()
        conteudo_novo = conteudo[:pos] + '\n' + novo_item + conteudo[pos:]
        
        with open(caminho, 'w', encoding='utf-8') as f:
            f.write(conteudo_novo)
        
        print(f'✓ {arquivo} - atualizado')
        contador += 1
    else:
        print(f'❌ {arquivo} - padrão não encontrado')

print(f'\n✅ {contador}/{len(arquivos)} arquivos atualizados com sucesso!')
