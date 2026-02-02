(function (global) {
    const COLORS = [
        '#667eea', '#764ba2', '#4facfe', '#43e97b', '#f093fb',
        '#ff6f91', '#ff9671', '#ffc75f', '#f9f871', '#00c9a7'
    ];

    function resolveContainer(target) {
        if (!target) {
            return null;
        }
        if (typeof target === 'string') {
            return document.getElementById(target);
        }
        return target;
    }

    function renderBars(target, items = [], options = {}) {
        const container = resolveContainer(target);
        if (!container) {
            return;
        }

        const maxValue = Math.max(...items.map(i => i.value || 0), 1);
        const classes = ['offline-chart'];
        if (options.compact) {
            classes.push('offline-chart--compact');
        }

        container.innerHTML = `
            <div class="${classes.join(' ')}">
                ${items.map((item, index) => {
                    const percentage = Math.max(5, Math.min(100, (item.value || 0) / maxValue * 100));
                    const color = item.color || COLORS[index % COLORS.length];
                    return `
                        <div class="offline-chart__row">
                            <span class="offline-chart__label">${item.label || '---'}</span>
                            <div class="offline-chart__bar">
                                <span class="offline-chart__bar-fill" style="width:${percentage}%; background:${color};"></span>
                            </div>
                            <span class="offline-chart__value">${item.display || formatNumber(item.value)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderTable(target, headers = [], rows = []) {
        const container = resolveContainer(target);
        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="offline-table-wrap">
                <table class="offline-table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${row.map(col => `<td>${col}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function formatNumber(value) {
        const number = Number(value) || 0;
        return new Intl.NumberFormat('pt-AO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    global.OfflineCharts = {
        renderBars,
        renderTable,
        COLORS
    };
})(window);
