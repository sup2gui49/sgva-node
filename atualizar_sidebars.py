#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para atualizar todas as sidebars das páginas de folha profissional
Adiciona CSS fixo e move botão "Voltar ao Painel" para o final
"""

import os
import re

# Páginas a atualizar (já atualizamos dashboard, funcionarios e subsidios)
PAGINAS = [
    'folha-categorias.html',
    'folha-calculo.html',
    'folha-irt.html',
    'folha-historico.html',
    'folha-excel.html',
    'folha-notificacoes.html',
    'folha-backup.html',
    'folha-funcionarios.html'  # Adicionar CSS fixo
]

BASE_PATH = r'c:\xampp\htdocs\sgva-node\public'

# CSS para sidebar fixa
CSS_SIDEBAR_FIXO = '''    <style>
        .sidebar {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
        }'''

CSS_SIDEBAR_ANTIGO = '''    <style>
        .sidebar {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }'''

def atualizar_css_sidebar(content):
    """Atualiza o CSS para tornar sidebar fixa"""
    return content.replace(CSS_SIDEBAR_ANTIGO, CSS_SIDEBAR_FIXO)

def mover_botao_voltar(content):
    """Move o botão 'Voltar ao Painel' para o final do menu"""
    
    # Padrão para encontrar o botão no início (antes do <ul>)
    pattern_botao_inicio = r'(</div>\s*)\n\s*<!-- Botão Voltar ao Painel -->\s*\n\s*<div class="mb-3">\s*\n\s*<a href="index\.html" class="btn btn-light btn-sm w-100">\s*\n\s*<i class="bi bi-arrow-left"></i> Voltar ao Painel\s*\n\s*</a>\s*\n\s*</div>\s*\n(\s*<ul class="nav flex-column">)'
    
    # Remove o botão do início
    content = re.sub(pattern_botao_inicio, r'\1\n\2', content, flags=re.MULTILINE)
    
    # Padrão para encontrar o final do </ul> e adicionar o botão
    pattern_fim_ul = r'(</li>\s*\n\s*</ul>)\s*\n(\s*</nav>)'
    
    botao_fim = '''</li>
                </ul>
                
                <!-- Botão Voltar ao Painel -->
                <div class="mt-4 pt-3 border-top border-light">
                    <a href="index.html" class="btn btn-outline-light btn-sm w-100">
                        <i class="bi bi-arrow-left"></i> Voltar ao Painel
                    </a>
                </div>
            </nav>'''
    
    content = re.sub(pattern_fim_ul, botao_fim, content, flags=re.MULTILINE)
    
    return content

def processar_pagina(filepath):
    """Processa uma página HTML"""
    print(f'Processando: {filepath}')
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Atualizar CSS
        content = atualizar_css_sidebar(content)
        
        # Mover botão (se ainda não foi movido)
        if 'mb-3' in content and 'Voltar ao Painel' in content:
            content = mover_botao_voltar(content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'  ✓ Atualizado com sucesso')
        return True
    
    except Exception as e:
        print(f'  ✗ Erro: {e}')
        return False

def main():
    print('=' * 60)
    print('Atualizando Sidebars - Folha Profissional')
    print('=' * 60)
    
    sucessos = 0
    falhas = 0
    
    for pagina in PAGINAS:
        filepath = os.path.join(BASE_PATH, pagina)
        if os.path.exists(filepath):
            if processar_pagina(filepath):
                sucessos += 1
            else:
                falhas += 1
        else:
            print(f'Arquivo não encontrado: {filepath}')
            falhas += 1
    
    print('=' * 60)
    print(f'Concluído: {sucessos} sucessos, {falhas} falhas')
    print('=' * 60)

if __name__ == '__main__':
    main()
