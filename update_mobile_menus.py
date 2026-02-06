import os
import re

BASE_DIR = r'c:\xampp\htdocs\sgva-node\public'

# Template for the corrected mobile menu
# Note: Using {dashboard_cls}, {funcionarios_cls}, etc. for dynamic active class injection
MOBILE_MENU_TEMPLATE = """        <div class="mobile-topnav__menu">
            <a href="folha-dashboard.html"{dashboard_cls}>Dashboard</a>
            <a href="folha-funcionarios.html"{funcionarios_cls}>Funcionários</a>
            <a href="folha-subsidios.html"{subsidios_cls}>Subsídios</a>
            <a href="folha-categorias.html"{categorias_cls}>Categorias</a>
            <a href="folha-calculo.html"{calculo_cls}>Calcular</a>
            <a href="folha-salarios.html"{salarios_cls}>Salários</a>
            <a href="folha-irt.html"{irt_cls}>IRT</a>
            <a href="folha-historico.html"{historico_cls}>Histórico</a>
            <a href="folha-excel.html"{excel_cls}>Excel</a>
            <a href="folha-notificacoes.html"{notificacoes_cls}>Notificações</a>
            <a href="folha-backup.html"{backup_cls}>Backup</a>
            <a href="folha-presencas.html"{presencas_cls}>Presenças</a>
            <a href="folha-configuracoes.html"{configuracoes_cls}>Config</a>
        </div>"""

# Mapping filename to the key used in template for active class
FILE_KEY_MAP = {
    'folha-dashboard.html': 'dashboard_cls',
    'folha-funcionarios.html': 'funcionarios_cls',
    'folha-subsidios.html': 'subsidios_cls',
    'folha-categorias.html': 'categorias_cls',
    'folha-calculo.html': 'calculo_cls',
    'folha-salarios.html': 'salarios_cls',
    'folha-irt.html': 'irt_cls',
    'folha-historico.html': 'historico_cls',
    'folha-excel.html': 'excel_cls',
    'folha-notificacoes.html': 'notificacoes_cls',
    'folha-backup.html': 'backup_cls',
    'folha-presencas.html': 'presencas_cls',
    'folha-configuracoes.html': 'configuracoes_cls',
}

def update_file(filename):
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} (not found)")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Determine which link should be active
    active_key = FILE_KEY_MAP.get(filename)
    
    # Prepare the formatting dict
    format_args = {key: '' for key in FILE_KEY_MAP.values()}
    if active_key:
        format_args[active_key] = ' class="active"'
    
    # Generate the new menu HTML for this specific file
    new_menu = MOBILE_MENU_TEMPLATE.format(**format_args)

    # Regex to find the existing mobile menu div
    # Matches <div class="mobile-topnav__menu"> ... </div>
    # Using dotall to match across lines
    pattern = re.compile(r'<div class="mobile-topnav__menu">.*?</div>', re.DOTALL)
    
    if pattern.search(content):
        new_content = pattern.sub(new_menu, content)
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filename}")
        else:
            print(f"No changes needed for {filename}")
    else:
        print(f"Warning: mobile-topnav__menu not found in {filename}")

if __name__ == '__main__':
    # Get all folha-*.html files from the directory
    files = [f for f in os.listdir(BASE_DIR) if f.startswith('folha-') and f.endswith('.html')]
    
    # Also include files that might not start with folha- but are part of the module if needed
    # (Based on file list, they all seem to start with folha-)
    
    for fname in files:
        # Check if it's in our map (ignore files like folha-shared.css obviously, filtering by .html done above)
        # Even if not in map (e.g. folha-historico-atribuicoes.html), we might want to update it but with no active link?
        # Let's use the closest key or no active key.
        if fname not in FILE_KEY_MAP:
             # Try to guess or just default to no active
             print(f"Processing unmapped file: {fname}")
             
        update_file(fname)

