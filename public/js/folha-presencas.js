// Path relativo para production/dev
const API_URL = '/api';

async function fetchAuth(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...options.headers
        }
    };
    return fetch(url, { ...options, ...defaultOptions });
}

// Função para obter iniciais do nome
function getInitials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Função para gerar cor baseada no nome
function getColorForName(nome) {
    const colors = [
        '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
        '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
        '#f39c12', '#d35400', '#c0392b', '#e74c3c', '#e67e22'
    ];
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
        hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Função para criar avatar com iniciais
function createAvatarUrl(nome, foto) {
    if (foto && foto.trim() !== '') {
        return foto;
    }
    // Gerar avatar SVG com iniciais
    const initials = getInitials(nome);
    const color = getColorForName(nome);
    const svg = `
        <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="80" fill="${color}"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                  font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">
                ${initials}
            </text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

document.addEventListener('DOMContentLoaded', init);

let currentTurnoId = null;
let currentDate = new Date().toISOString().split('T')[0];
let turnoCheckInterval = null;
let ultimoMonitorData = [];

async function init() {
    // 1. Clock
    if(document.getElementById('relogio-tempo-real')) {
        setInterval(updateClock, 1000);
        updateClock();
    }

    // 2. Load Selects
    if(document.getElementById('data-hoje')) {
        document.getElementById('data-hoje').textContent = new Date().toLocaleDateString('pt-AO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const dateInput = document.getElementById('filtro-data');
    if (dateInput) dateInput.value = currentDate;
    
    if(document.getElementById('filtro-turno')) {
        await carregarTurnos();
    }
}

function updateClock() {
    const el = document.getElementById('relogio-tempo-real');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-AO');
}

async function carregarTurnos() {
    try {
        const response = await fetchAuth(`${API_URL}/turnos`);
        const data = await response.json();

        const select = document.getElementById('filtro-turno');
        if (!select) return;
        
        select.innerHTML = '';
        
        if (data.success && data.data && data.data.length > 0) {
            let activeShift = null;
            const now = new Date();
            const nowTime = now.toLocaleTimeString('pt-AO', {hour12: false}).substring(0,5); // HH:MM

            data.data.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.nome} (${t.entrada} - ${t.saida})`;
                select.appendChild(opt);

                if (isTimeBetween(nowTime, t.entrada, t.saida)) {
                    activeShift = t.id;
                }
            });

            if (activeShift) select.value = activeShift;
            else select.value = data.data[0].id; // Default to first

            currentTurnoId = select.value;
            carregarMonitor();
        } else {
            select.innerHTML = '<option value="">Sem turnos definidos</option>';
            document.getElementById('grid-funcionarios').innerHTML = '<div class="col-12 text-center py-5">Não há turnos configurados. Configure em Configurações > Gestão de Turnos.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar turnos:', error);
        // Fallback for demo if API fails
        const select = document.getElementById('filtro-turno');
        if(select) select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

function isTimeBetween(time, start, end) {
    // Handle nulls
    if (!start || !end) return false;
    if (start <= end) {
        return time >= start && time <= end;
    } else {
        // Cross midnight
        return time >= start || time <= end;
    }
}

async function carregarMonitor() {
    const turnoId = document.getElementById('filtro-turno').value;
    const data = document.getElementById('filtro-data').value;
    const grid = document.getElementById('grid-funcionarios');

    if (!turnoId || !data) return;

    // Show loading
    grid.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p>Carregando presenças...</p>
        </div>
    `;

    try {
        const response = await fetchAuth(`${API_URL}/presencas/monitor?data=${data}&turno_id=${turnoId}`);
        const result = await response.json();

        if (result.success) {
            ultimoMonitorData = Array.isArray(result.data) ? result.data : [];
            renderizarMonitor(result.data);
            atualizarStats(result.data);
        } else {
            ultimoMonitorData = [];
            showError(result.message);
        }
    } catch (error) {
        console.error(error);
        ultimoMonitorData = [];
        if (error.message && error.message.includes("404")) {
             grid.innerHTML = `
                <div class="col-12 text-center py-5 text-warning">
                    <i class="bi bi-cone-striped display-4"></i>
                    <h4 class="mt-3">Reinicialização Necessária</h4>
                    <p>O servidor foi atualizado para suportar o novo sistema de presenças.</p>
                    <p class="fw-bold">Por favor, reinicie o servidor Node.js (npm start) no terminal.</p>
                </div>
            `;
        } else {
             showError("Erro de conexão com o servidor.");
        }
    }
}

function atualizarMonitor() {
    carregarMonitor();
}

function showError(msg) {
    const grid = document.getElementById('grid-funcionarios');
    if (grid) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <i class="bi bi-exclamation-triangle display-4"></i>
                <p class="mt-3 font-weight-bold">${msg}</p>
            </div>
        `;
    }
}

function renderizarMonitor(funcionarios) {
    const grid = document.getElementById('grid-funcionarios');
    grid.innerHTML = '';
    
    if (!funcionarios || funcionarios.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nenhum funcionário escalado para este turno.</div>';
        atualizarStats([]);
        renderizarRelatorio([]);
        return;
    }

    funcionarios.forEach(f => {
        const hasPresenca = !!f.presenca;
        const p = f.presenca || {};
        
        let statusClass = 'secondary'; // Default gray
        let statusText = 'Aguardando';
        let borderColor = 'border-light';

        if (hasPresenca) {
            statusText = p.status ? p.status.toUpperCase() : 'PRESENTE';
            if (p.status === 'presente') {
                statusClass = 'success';
                borderColor = 'border-success';
            } else if (p.status === 'atrasado') {
                statusClass = 'warning';
                borderColor = 'border-warning';
            } else {
                statusClass = 'danger';
                borderColor = 'border-danger';
            }
        }
        
        const avatarUrl = createAvatarUrl(f.nome, f.foto);
        
        const card = document.createElement('div');
        card.className = 'col-md-4 col-lg-3';
        card.innerHTML = `
            <div class="card h-100 shadow-sm ${borderColor} border-2">
                <div class="card-body text-center">
                    <div class="mb-3 position-relative d-inline-block">
                        <img src="${avatarUrl}" 
                             class="rounded-circle border border-3 border-${statusClass}" 
                             width="80" height="80" alt="${f.nome}"
                             style="object-fit: cover;">
                        <span class="position-absolute bottom-0 end-0 p-2 bg-${statusClass} border border-light rounded-circle" title="${statusText}"></span>
                    </div>
                    <h5 class="card-title text-truncate fw-bold" title="${f.nome}">${f.nome}</h5>
                    <p class="card-text small text-muted mb-2 text-uppercase">ID: ${f.id}</p>
                    
                    <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-light rounded py-2 shadow-sm border">
                        <div class="text-start">
                             <small class="d-block text-muted" style="font-size:10px">ENTRADA</small>
                             <strong class="text-${p.entrada_registrada ? 'dark' : 'muted'}">${p.entrada_registrada ? p.entrada_registrada.substring(0,5) : '--:--'}</strong>
                        </div>
                        <div class="text-end">
                             <small class="d-block text-muted" style="font-size:10px">SAÍDA</small>
                             <strong class="text-${p.saida_registrada ? 'dark' : 'muted'}">${p.saida_registrada ? p.saida_registrada.substring(0,5) : '--:--'}</strong>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2">
                        ${!p.entrada_registrada 
                                ? `<button class="btn btn-primary btn-sm fw-bold" onclick="abrirRegistro(${f.id}, 'entrada')"><i class="bi bi-box-arrow-in-right"></i> REGISTRAR ENTRADA</button>` 
                                : ''}
                        ${p.entrada_registrada && !p.saida_registrada
                                ? `<button class="btn btn-danger btn-sm fw-bold" onclick="abrirRegistro(${f.id}, 'saida')"><i class="bi bi-box-arrow-left"></i> REGISTRAR SAÍDA</button>` 
                                : ''}
                        ${p.saida_registrada 
                                ? '<button class="btn btn-outline-success btn-sm fw-bold" disabled><i class="bi bi-check-all"></i> CONCLUÍDO</button>' : ''}
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    renderizarRelatorio(funcionarios);
}

function renderizarRelatorio(funcionarios) {
    const tbody = document.getElementById('relatorio-presencas');
    const subtitulo = document.getElementById('relatorio-subtitulo');
    const turnoInfo = document.getElementById('relatorio-turno');
    const turnoSelect = document.getElementById('filtro-turno');
    const dataInput = document.getElementById('filtro-data');

    if (!tbody) return;

    const dataTexto = dataInput?.value
        ? new Date(dataInput.value).toLocaleDateString('pt-AO')
        : '--/--/----';
    const turnoTexto = turnoSelect?.selectedOptions?.[0]?.textContent || 'Turno nao definido';

    if (subtitulo) subtitulo.textContent = `Data: ${dataTexto}`;
    if (turnoInfo) turnoInfo.textContent = turnoTexto;

    if (!funcionarios || funcionarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sem registros para o periodo.</td></tr>';
        return;
    }

    const rows = funcionarios.map(f => {
        const p = f.presenca || {};
        let statusLabel = 'Aguardando';
        let statusClass = 'secondary';

        if (f.presenca) {
            if (p.status === 'presente') {
                statusLabel = 'Presente';
                statusClass = 'success';
            } else if (p.status === 'atrasado') {
                statusLabel = 'Atrasado';
                statusClass = 'warning';
            } else if (p.status === 'ausente') {
                statusLabel = 'Ausente';
                statusClass = 'danger';
            } else {
                statusLabel = p.status ? String(p.status) : 'Presente';
                statusClass = 'info';
            }
        } else {
            statusLabel = 'Ausente';
            statusClass = 'danger';
        }

        const entrada = p.entrada_registrada ? p.entrada_registrada.substring(0, 5) : '--:--';
        const saida = p.saida_registrada ? p.saida_registrada.substring(0, 5) : '--:--';
        const obs = p.observacao || '-';

        return `
            <tr>
                <td>${f.nome}</td>
                <td><span class="badge bg-${statusClass}">${statusLabel}</span></td>
                <td>${entrada}</td>
                <td>${saida}</td>
                <td>${obs}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

function atualizarStats(funcionarios) {
    if (!funcionarios) return;
    const total = funcionarios.length;
    let presentes = 0;
    let atrasados = 0;

    funcionarios.forEach(f => {
        if (f.presenca) {
            // Conta como presente se tiver status presente ou ja tiver saido
            if (f.presenca.status === 'presente' || f.presenca.saida_registrada) presentes++;
            if (f.presenca.status === 'atrasado') atrasados++;
        }
    });

    const elEscalados = document.getElementById('stat-escalados');
    if(elEscalados) elEscalados.textContent = total;
    
    const elPresentes = document.getElementById('stat-presentes');
    if(elPresentes) elPresentes.textContent = presentes;
    
    const elAtrasados = document.getElementById('stat-atrasados');
    if(elAtrasados) elAtrasados.textContent = atrasados;
    
    const elAusentes = document.getElementById('stat-ausentes');
    if(elAusentes) elAusentes.textContent = Math.max(0, total - (presentes + atrasados));
}

// Registro
function abrirRegistro(id, tipo) {
    const form = document.getElementById('formRegistro');
    if (!form) return;
    form.reset();
    document.getElementById('regFuncionarioId').value = id;
    document.getElementById('regTipo').value = tipo;
    
    // Auto fill time
    const now = new Date();
    document.getElementById('regHora').value = now.toLocaleTimeString('pt-AO', {hour12: false}).substring(0,5);
    
    const modal = new bootstrap.Modal(document.getElementById('modalRegistro'));
    modal.show();
}

async function confirmarRegistro() {
    const id = document.getElementById('regFuncionarioId').value;
    const tipo = document.getElementById('regTipo').value;
    const hora = document.getElementById('regHora').value;
    const obs = document.getElementById('regObs').value;
    const data = document.getElementById('filtro-data').value;
    const turnoId = document.getElementById('filtro-turno').value;

    try {
        const response = await fetchAuth(`${API_URL}/presencas/registrar`, {
            method: 'POST',
            body: JSON.stringify({
                funcionario_id: id,
                data,
                turno_id: turnoId,
                horario: hora,
                tipo,
                observacao: obs
            })
        });
        
        const res = await response.json();
        
        if (res.success || response.ok) {
            const modalEl = document.getElementById('modalRegistro');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            carregarMonitor(); // Reload
        } else {
            alert('Erro: ' + res.message);
        }
    } catch (e) {
        alert('Erro ao registrar ponto: ' + e.message);
    }
}

function exportarRelatorio() {
    const turnoSelect = document.getElementById('filtro-turno');
    const dataInput = document.getElementById('filtro-data');
    const dataTexto = dataInput?.value || '';
    const turnoTexto = turnoSelect?.selectedOptions?.[0]?.textContent || '';

    if (!ultimoMonitorData || ultimoMonitorData.length === 0) {
        alert('Sem dados para exportar.');
        return;
    }

    const rows = ultimoMonitorData.map(f => {
        const p = f.presenca || {};
        const status = p.status || (f.presenca ? 'presente' : 'ausente');
        const entrada = p.entrada_registrada ? p.entrada_registrada.substring(0, 5) : '';
        const saida = p.saida_registrada ? p.saida_registrada.substring(0, 5) : '';
        const obs = p.observacao || '';
        return {
            nome: f.nome,
            status,
            entrada,
            saida,
            obs
        };
    });

    const dataFormatada = dataTexto
        ? new Date(dataTexto).toLocaleDateString('pt-AO')
        : new Date().toLocaleDateString('pt-AO');

    const total = rows.length;
    let presentes = 0;
    let atrasados = 0;
    let ausentes = 0;

    rows.forEach(row => {
        if (row.status === 'presente') {
            presentes += 1;
        } else if (row.status === 'atrasado') {
            atrasados += 1;
        } else {
            ausentes += 1;
        }
    });

    const geradoEm = new Date().toLocaleString('pt-AO');

    const html = `
        <!DOCTYPE html>
        <html lang="pt-AO">
        <head>
            <meta charset="UTF-8">
            <title>Relatorio de Presencas</title>
            <style>
                @page { margin: 20mm; }
                * { box-sizing: border-box; }
                body {
                    font-family: "Segoe UI", Arial, sans-serif;
                    color: #1f2937;
                    margin: 0;
                }
                .report {
                    padding: 24px;
                }
                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 16px;
                    margin-bottom: 20px;
                }
                .brand {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                .logo {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    letter-spacing: 1px;
                }
                .brand-title {
                    font-size: 16px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .brand-sub {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 2px;
                }
                .meta-box {
                    text-align: right;
                    font-size: 12px;
                    color: #374151;
                    line-height: 1.6;
                }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                    margin-bottom: 18px;
                }
                .summary-card {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 12px;
                }
                .summary-card h4 {
                    margin: 0;
                    font-size: 11px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }
                .summary-card p {
                    margin: 6px 0 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #111827;
                }
                .summary-card.presente p { color: #15803d; }
                .summary-card.atrasado p { color: #b45309; }
                .summary-card.ausente p { color: #b91c1c; }
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .report-table th,
                .report-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #e5e7eb;
                    text-align: left;
                    vertical-align: top;
                }
                .report-table thead th {
                    background: #f3f4f6;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.7px;
                    color: #374151;
                }
                .report-table tbody tr:nth-child(even) {
                    background: #fafafa;
                }
                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-weight: 600;
                    font-size: 11px;
                }
                .status-presente {
                    background: #dcfce7;
                    color: #15803d;
                }
                .status-atrasado {
                    background: #fef3c7;
                    color: #b45309;
                }
                .status-ausente {
                    background: #fee2e2;
                    color: #b91c1c;
                }
                .footer {
                    margin-top: 24px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    color: #6b7280;
                }
                .assinatura {
                    margin-top: 18px;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 8px;
                    width: 220px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="report">
                <div class="report-header">
                    <div class="brand">
                        <div class="logo">SG</div>
                        <div>
                            <div class="brand-title">SGVA Folha</div>
                            <div class="brand-sub">Relatorio de Presencas</div>
                        </div>
                    </div>
                    <div class="meta-box">
                        <div><strong>Data:</strong> ${dataFormatada}</div>
                        <div><strong>Turno:</strong> ${turnoTexto || 'Nao definido'}</div>
                        <div><strong>Gerado em:</strong> ${geradoEm}</div>
                    </div>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <h4>Escalados</h4>
                        <p>${total}</p>
                    </div>
                    <div class="summary-card presente">
                        <h4>Presentes</h4>
                        <p>${presentes}</p>
                    </div>
                    <div class="summary-card atrasado">
                        <h4>Atrasados</h4>
                        <p>${atrasados}</p>
                    </div>
                    <div class="summary-card ausente">
                        <h4>Ausentes</h4>
                        <p>${ausentes}</p>
                    </div>
                </div>

                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Funcionario</th>
                            <th>Status</th>
                            <th>Entrada</th>
                            <th>Saida</th>
                            <th>Observacao</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => {
                            const statusClass = row.status === 'presente'
                                ? 'status-presente'
                                : (row.status === 'atrasado' ? 'status-atrasado' : 'status-ausente');
                            const statusLabel = row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Ausente';
                            return `
                                <tr>
                                    <td>${row.nome || ''}</td>
                                    <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                                    <td>${row.entrada || '--:--'}</td>
                                    <td>${row.saida || '--:--'}</td>
                                    <td>${row.obs || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <div>Documento interno - uso restrito</div>
                    <div class="assinatura">Assinatura Responsavel</div>
                </div>
            </div>
        </body>
        </html>
    `;

    const popup = window.open('', '_blank');
    if (!popup) {
        alert('Por favor, permita pop-ups para gerar o PDF.');
        return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    popup.onload = () => {
        popup.focus();
    };
}
