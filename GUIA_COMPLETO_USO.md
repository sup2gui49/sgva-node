# 🎯 GUIA RÁPIDO: SISTEMA DE FOLHA PROFISSIONAL

## ✅ PROBLEMA RESOLVIDO: Duplicados Removidos

### O que aconteceu?
- **DENISIO** estava duplicado (IDs 12 e 13)
- **João Silva Teste** estava em 5 cópias (IDs 7, 8, 9, 10, 11)

### O que foi feito?
✅ **Limpeza automática com backup**:
- Backup criado antes da limpeza
- DENISIO ID 13 removido (mantido ID 12)
- João Silva Teste IDs 8, 9, 10, 11 removidos (mantido ID 7)
- Dados preservados (subsídios e folhas movidos para IDs mantidos)

---

## 📋 COMO O SISTEMA FUNCIONA

### **1. BANCO DE DADOS ÚNICO**
O sistema usa **UM ÚNICO banco de dados**:
```
c:\xampp\htdocs\sgva-node\database\sgva.db
```

**Não há sistemas paralelos!** Tudo está centralizado neste arquivo SQLite.

---

### **2. ESTRUTURA DO SISTEMA**

#### **Backend (Servidor Node.js)**
```
Porta: 3000
URL: http://localhost:3000
```

**Rotas da API:**
- `/api/subsidios` - Gestão de subsídios
- `/api/folha-profissional` - Cálculo de folha
- `/api/folha-relatorios` - Relatórios Excel
- `/api/backup` - Backup/Restore

#### **Frontend (Páginas HTML)**
Todas acessíveis via navegador em `http://localhost:3000/`:

| Página | Função |
|--------|--------|
| `folha-dashboard.html` | **Início** - Estatísticas e gráficos |
| `folha-subsidios.html` | Criar/Editar subsídios |
| `folha-categorias.html` | Gestão de categorias |
| `folha-calculo.html` | **Calcular folha mensal** |
| `folha-excel.html` | Exportar relatórios Excel |
| `folha-notificacoes.html` | Alertas do sistema |
| `folha-backup.html` | Backup & Restore |

---

### **3. FLUXO DE TRABALHO RECOMENDADO**

#### **📌 PASSO 1: Configuração Inicial (Uma vez)**
1. **Criar Subsídios** (`folha-subsidios.html`)
   - Ex: Alimentação (20.000 KZ fixo)
   - Ex: Transporte (15.000 KZ fixo)
   - Ex: 13º Salário (50% percentual)

2. **Criar Categorias** (`folha-categorias.html`)
   - Ex: Direção, Administrativo, Comercial, etc.

3. **Atribuir Funcionários às Categorias**
   - Na página de categorias, clicar em cada categoria
   - Selecionar funcionários

4. **Atribuir Subsídios**
   - **Individual**: `folha-subsidios.html` → botão "Atribuir"
   - **Em massa**: Selecionar categoria inteira

---

#### **📌 PASSO 2: Processamento Mensal**

**A cada mês, fazer:**

1. **Acessar `folha-calculo.html`**

2. **Para cada funcionário:**
   - Selecionar o funcionário no dropdown
   - Escolher mês (ex: Novembro)
   - Escolher ano (ex: 2025)
   - Clicar **"Calcular Folha"**

3. **Sistema calcula automaticamente:**
   ```
   Salário Base: 150.000 KZ
   + Subsídios: 35.000 KZ
   ─────────────────────────
   = Salário Bruto: 185.000 KZ
   
   Descontos:
   - INSS (3%): -5.550 KZ
   - IRT (escalão): -15.000 KZ
   ─────────────────────────
   = Salário Líquido: 164.450 KZ
   ```

4. **Exportar PDF**
   - Botão "Baixar PDF"
   - Recibo profissional gerado

5. **Repetir para todos os funcionários**

---

#### **📌 PASSO 3: Relatórios Mensais**

**Após processar todas as folhas:**

1. **Dashboard** (`folha-dashboard.html`)
   - Ver gráficos de custos por categoria
   - Ver top 5 subsídios mais usados
   - Estatísticas gerais

2. **Exportar Excel** (`folha-excel.html`)
   - **Folha Completa**: Todos os detalhes
   - **Subsídios por Funcionário**: Quem recebe o quê
   - **Custos por Categoria**: Gastos por departamento
   - **Dashboard Consolidado**: Resumo executivo

3. **Verificar Notificações** (`folha-notificacoes.html`)
   - Funcionários sem folha
   - Anomalias (IRT muito alto)
   - Alertas importantes

4. **Criar Backup** (`folha-backup.html`)
   - Backup manual do mês processado
   - Download para segurança externa

---

### **4. FUNCIONÁRIOS ATUAIS NO SISTEMA**

Após limpeza, você tem **8 funcionários únicos**:

| ID | Nome | Salário Base | Categoria |
|----|------|--------------|-----------|
| 1 | GUILHERME MONTEIRO | 90.000 KZ | N/A |
| 2 | João Silva | 50.000 KZ | N/A |
| 3 | Maria Santos | 45.000 KZ | N/A |
| 4 | Pedro Costa | 42.000 KZ | N/A |
| 5 | Ana Paula | 50.000 KZ | N/A |
| 6 | Carlos Mendes | 65.000 KZ | N/A |
| 7 | João Silva Teste | 150.000 KZ | Financeiro |
| 12 | DENISIO | 60.000 KZ | N/A |

**Próximo passo:** Atribuir categorias aos funcionários sem categoria (N/A).

---

### **5. SUBSÍDIOS CONFIGURADOS**

| ID | Nome | Tipo | Cálculo | Valor | Atribuições |
|----|------|------|---------|-------|-------------|
| 1 | Subsídio de Alimentação | regular | fixo | 20.000 KZ | 2 func. |
| 2 | Subsídio de Transporte | regular | fixo | 15.000 KZ | 2 func. |
| 3 | Abono de Família | regular | percentual | % salário | 2 func. |
| 4 | 13º Salário (1ª Parcela) | anual | percentual | % salário | 2 func. |
| 5 | 13º Salário (2ª Parcela) | anual | percentual | % salário | 2 func. |
| 6 | Subsídio de Função | especial | fixo | 50.000 KZ | 0 func. |

**Nota:** Os subsídios 4 e 5 (13º Salário) devem ser usados apenas nos meses específicos (Junho e Novembro).

---

### **6. CÁLCULOS FISCAIS (ANGOLA)**

#### **IRT - 13 Escalões**
```
Rendimento Colectável = Salário Bruto - INSS - 70.000 KZ (dedução fixa)

Escalão 1:  0 - 70.000 → 0%
Escalão 2:  70.001 - 100.000 → 13%
Escalão 3:  100.001 - 150.000 → 16%
...
Escalão 12: 10M+ → 25%
```

#### **INSS**
- **Empregado**: 3% do salário bruto
- **Patronal (Empresa)**: 8% do salário bruto

#### **Subsídios Isentos**
- **Alimentação**: até 30.000 KZ isento (excedente tributado)
- **Transporte**: até 20.000 KZ isento (excedente tributado)
- **Outros**: tributados integralmente

---

### **7. EXEMPLO PRÁTICO**

**Funcionário:** João Silva Teste  
**Salário Base:** 150.000 KZ  
**Mês:** Novembro 2025

**Subsídios atribuídos:**
- Alimentação: 20.000 KZ (fixo)
- Transporte: 15.000 KZ (fixo)

**Cálculo:**
```
1. Salário Base:           150.000 KZ
2. Subsídios:               35.000 KZ
   ─────────────────────────────────
3. Salário Bruto:          185.000 KZ

4. INSS (3%):               -5.550 KZ
5. Dedução Fixa:           -70.000 KZ
   ─────────────────────────────────
6. Rendimento Colectável:  109.450 KZ

7. IRT (Escalão 3 - 16%):  -17.512 KZ
   ─────────────────────────────────
8. Salário Líquido:        161.938 KZ

Custo Total Empresa:
   Bruto + INSS Patronal (8%)
   185.000 + 14.800 = 199.800 KZ
```

---

### **8. PERGUNTAS FREQUENTES**

**Q: Como adicionar novos funcionários?**
A: Atualmente não há interface para isso. Use o script SQL:
```sql
INSERT INTO funcionarios (nome, salario_base, ativo) 
VALUES ('Nome Completo', 100000, 1);
```

**Q: Como editar salário de funcionário?**
A: Mesma situação, usar SQL:
```sql
UPDATE funcionarios SET salario_base = 120000 WHERE id = 7;
```

**Q: Posso deletar subsídios com atribuições?**
A: Não. O sistema bloqueia. Primeiro remova todas as atribuições.

**Q: Como restaurar um backup?**
A: Use a interface `folha-backup.html` → botão "Restaurar" no backup desejado.

**Q: O que acontece se eu deletar um funcionário com folhas processadas?**
A: O sistema tem foreign keys. Folhas antigas ficarão órfãs. **Melhor desativar** (ativo = 0) em vez de deletar.

---

### **9. SEGURANÇA & MANUTENÇÃO**

#### **Backups Recomendados:**
- **Diário**: Antes de processar folhas
- **Mensal**: Após fechar o mês
- **Download externo**: Mensalmente para pen drive/nuvem

#### **Backups Criados:**
```
c:\xampp\htdocs\sgva-node\backups\
├── backup-pre-cleanup-2025-11-11T07-27-58-308Z.db
└── (outros backups automáticos)
```

#### **Restaurar Backup Manualmente:**
```bash
# Via interface web (recomendado)
http://localhost:3000/folha-backup.html

# Via linha de comando (avançado)
cp backups/backup-XXXX.db database/sgva.db
```

---

### **10. INICIAR O SISTEMA**

**Método 1: Task do VS Code**
- `Ctrl+Shift+P` → "Tasks: Run Task"
- Selecionar: "Run SGVA Node.js Server"

**Método 2: Terminal**
```bash
cd c:\xampp\htdocs\sgva-node
node src/server.js
```

**Método 3: Automático (PM2)**
```bash
npm install -g pm2
pm2 start src/server.js --name sgva-folha
pm2 save
```

---

### **11. ACESSAR O SISTEMA**

**Servidor iniciado?** ✅ (veja mensagem: "Servidor rodando na porta 3000")

**Abra o navegador:**
```
http://localhost:3000/folha-dashboard.html
```

**Navegação:**
- Sidebar esquerda: Menu principal
- Cards de ações rápidas: Atalhos

---

## 🎯 RESUMO: O QUE FAZER AGORA?

1. ✅ **Duplicados foram removidos** (DENISIO e João Silva Teste)
2. ✅ **Backup criado automaticamente**
3. ✅ **Sistema está funcional**

**Próximos passos recomendados:**

1. **Atribuir categorias** aos 6 funcionários sem categoria
2. **Verificar/Atualizar subsídios** se necessário
3. **Processar folha de Novembro 2025** para todos
4. **Exportar relatórios** em Excel
5. **Criar backup** após processamento

---

## 📞 SUPORTE

**Scripts de diagnóstico criados:**
- `analisar-banco.js` - Análise completa do banco
- `limpar-duplicados.js` - Limpeza de duplicados (já executado)

**Execute sempre que precisar:**
```bash
node analisar-banco.js
```

---

**Sistema 100% funcional!** 🚀  
**Data:** 11 de Novembro de 2025
