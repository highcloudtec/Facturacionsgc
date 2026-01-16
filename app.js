let rawData = [];
let filteredData = [];
let charts = {};

// Inicializar cuando todo esté cargado
window.addEventListener('load', () => {
    // Cargar logos
    document.getElementById('logoHct').src = LOGOS.hct;
    document.getElementById('logoCoris').src = LOGOS.coris;
    
    // Cargar datos
    rawData = DASHBOARD_DATA.data;
    filteredData = rawData;
    
    // Ocultar loading, mostrar dashboard
    document.querySelector('.loading').style.display = 'none';
    document.getElementById('dashboardContainer').classList.add('loaded');
    
    initializeFilters();
    updateDashboard();
});

function initializeFilters() {
    const paises = [...new Set(rawData.map(d => d.paisSiniestro).filter(p => p && p !== 'nan' && p !== 'None'))].sort();
    const clientes = [...new Set(rawData.map(d => d.cliente).filter(c => c && c !== 'nan' && c !== 'None'))].sort();
    const productos = [...new Set(rawData.map(d => d.producto).filter(p => p && p !== 'nan' && p !== 'None'))].sort();
    const estados = [...new Set(rawData.map(d => d.facturaEstado).filter(e => e && e !== 'nan' && e !== 'None'))].sort();
    const servicios = [...new Set(rawData.map(d => d.servicio).filter(s => s && s !== 'nan' && s !== 'None'))].sort();

    populateSelect('filterPais', paises);
    populateSelect('filterCliente', clientes);
    populateSelect('filterProducto', productos);
    populateSelect('filterEstado', estados);
    populateSelect('filterServicio', servicios);
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
}

function applyFilters() {
    const filterYear = document.getElementById('filterYear').value;
    const filterPais = document.getElementById('filterPais').value;
    const filterCliente = document.getElementById('filterCliente').value;
    const filterProducto = document.getElementById('filterProducto').value;
    const filterEstado = document.getElementById('filterEstado').value;
    const filterServicio = document.getElementById('filterServicio').value;

    filteredData = rawData.filter(row => {
        if (filterYear && row.year.toString() !== filterYear) return false;
        if (filterPais && row.paisSiniestro !== filterPais) return false;
        if (filterCliente && row.cliente !== filterCliente) return false;
        if (filterProducto && row.producto !== filterProducto) return false;
        if (filterEstado && row.facturaEstado !== filterEstado) return false;
        if (filterServicio && row.servicio !== filterServicio) return false;
        return true;
    });

    updateDashboard();
}

function resetFilters() {
    document.querySelectorAll('select').forEach(select => select.value = '');
    filteredData = rawData;
    updateDashboard();
}

function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateTable();
}

function updateKPIs() {
    const totalFacturado = filteredData.reduce((sum, row) => sum + (row.importeUSD || 0), 0);
    const casosUnicos = new Set(filteredData.map(d => d.casoNumero)).size;
    const facturasPagadas = filteredData.filter(d => d.facturaEstado === 'Pagada').length;
    const ticketPromedio = filteredData.length > 0 ? totalFacturado / filteredData.length : 0;
    const paisesUnicos = new Set(filteredData.map(d => d.paisSiniestro).filter(p => p && p !== 'nan' && p !== 'None')).size;

    const years = [...new Set(filteredData.map(d => d.year))].sort();
    let crecimiento = 0;
    if (years.length >= 2) {
        const lastYear = Math.max(...years);
        const prevYear = lastYear - 1;
        const lastYearTotal = filteredData.filter(d => d.year === lastYear).reduce((s, r) => s + (r.importeUSD || 0), 0);
        const prevYearTotal = filteredData.filter(d => d.year === prevYear).reduce((s, r) => s + (r.importeUSD || 0), 0);
        if (prevYearTotal > 0) {
            crecimiento = ((lastYearTotal - prevYearTotal) / prevYearTotal * 100);
        }
    }

    document.getElementById('kpiTotal').textContent = '$' + Math.round(totalFacturado).toLocaleString('es-ES');
    document.getElementById('kpiCasos').textContent = casosUnicos.toLocaleString('es-ES');
    document.getElementById('kpiPagadas').textContent = facturasPagadas.toLocaleString('es-ES');
    document.getElementById('kpiPromedio').textContent = '$' + Math.round(ticketPromedio).toLocaleString('es-ES');
    document.getElementById('kpiPaises').textContent = paisesUnicos.toLocaleString('es-ES');
    document.getElementById('kpiCrecimiento').textContent = (crecimiento >= 0 ? '+' : '') + crecimiento.toFixed(1) + '%';
}

function updateCharts() {
    createYearsChart();
    createPaisesChart();
    createProductosChart();
    createServiciosChart();
    createClientesChart();
    createMensualChart();
    createEstadosChart();
}

function createYearsChart() {
    const yearsData = {};
    filteredData.forEach(row => yearsData[row.year] = (yearsData[row.year] || 0) + (row.importeUSD || 0));
    const sorted = Object.entries(yearsData).sort((a, b) => a[0] - b[0]);

    destroyChart('chartYears');
    const ctx = document.getElementById('chartYears').getContext('2d');
    
    const colors = ['#667eea', '#764ba2', '#48bb78', '#f56565', '#ed8936', '#4299e1', '#9f7aea', '#ec4899'];
    
    charts.years = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Facturación USD',
                data: sorted.map(s => s[1]),
                backgroundColor: sorted.map((_, i) => colors[i % colors.length]),
                borderWidth: 0,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => 'USD $' + Math.round(ctx.parsed.y).toLocaleString('es-ES')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        callback: val => '$' + (val / 1000000).toFixed(1) + 'M',
                        font: { size: 11 }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12, weight: 'bold' } }
                }
            }
        }
    });
}

function createPaisesChart() {
    const data = {};
    filteredData.forEach(row => {
        if (row.paisSiniestro && row.paisSiniestro !== 'nan' && row.paisSiniestro !== 'None')
            data[row.paisSiniestro] = (data[row.paisSiniestro] || 0) + (row.importeUSD || 0);
    });
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);

    destroyChart('chartPaises');
    const ctx = document.getElementById('chartPaises').getContext('2d');
    charts.paises = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: 'rgba(118, 75, 162, 0.85)',
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => 'USD $' + Math.round(ctx.parsed.x).toLocaleString('es-ES')
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: val => '$' + (val / 1000000).toFixed(1) + 'M' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

function createProductosChart() {
    const data = {};
    filteredData.forEach(row => {
        if (row.producto && row.producto !== 'nan' && row.producto !== 'None')
            data[row.producto] = (data[row.producto] || 0) + (row.importeUSD || 0);
    });
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const colors = ['#667eea', '#764ba2', '#48bb78', '#f56565', '#ed8936', '#4299e1', '#9f7aea', '#ec4899'];

    destroyChart('chartProductos');
    const ctx = document.getElementById('chartProductos').getContext('2d');
    charts.productos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: colors,
                borderWidth: 4,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return ctx.label + ': $' + (ctx.parsed / 1000000).toFixed(1) + 'M (' + pct + '%)';
                        }
                    }
                }
            }
        }
    });
}

function createServiciosChart() {
    const data = {};
    filteredData.forEach(row => {
        if (row.servicio && row.servicio !== 'nan' && row.servicio !== 'None')
            data[row.servicio] = (data[row.servicio] || 0) + (row.importeUSD || 0);
    });
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);

    destroyChart('chartServicios');
    const ctx = document.getElementById('chartServicios').getContext('2d');
    charts.servicios = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: 'rgba(72, 187, 120, 0.85)',
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => 'USD $' + Math.round(ctx.parsed.y).toLocaleString('es-ES')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: val => '$' + (val / 1000).toFixed(0) + 'K' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { maxRotation: 45, minRotation: 45 },
                    grid: { display: false }
                }
            }
        }
    });
}

function createClientesChart() {
    const data = {};
    filteredData.forEach(row => {
        if (row.cliente && row.cliente !== 'nan' && row.cliente !== 'None')
            data[row.cliente] = (data[row.cliente] || 0) + (row.importeUSD || 0);
    });
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);

    destroyChart('chartClientes');
    const ctx = document.getElementById('chartClientes').getContext('2d');
    charts.clientes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: 'rgba(237, 137, 54, 0.85)',
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => 'USD $' + Math.round(ctx.parsed.x).toLocaleString('es-ES')
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: val => '$' + (val / 1000000).toFixed(1) + 'M' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

function createMensualChart() {
    const years = [...new Set(filteredData.map(d => d.year))];
    const currentYear = Math.max(...years);
    const yearData = filteredData.filter(d => d.year === currentYear);
    
    const mesesData = Array(12).fill(0);
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    yearData.forEach(row => {
        if (row.fechaSiniestro && row.fechaSiniestro !== 'nan' && row.fechaSiniestro !== 'None') {
            try {
                const mes = new Date(row.fechaSiniestro).getMonth();
                if (mes >= 0 && mes < 12) mesesData[mes] += row.importeUSD || 0;
            } catch (e) {}
        }
    });

    destroyChart('chartMensual');
    const ctx = document.getElementById('chartMensual').getContext('2d');
    charts.mensual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Facturación ' + currentYear,
                data: mesesData,
                borderColor: '#4299e1',
                backgroundColor: 'rgba(66, 153, 225, 0.12)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 8,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: ctx => 'USD $' + Math.round(ctx.parsed.y).toLocaleString('es-ES')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: val => '$' + (val / 1000000).toFixed(1) + 'M' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function createEstadosChart() {
    const data = {};
    filteredData.forEach(row => {
        if (row.facturaEstado && row.facturaEstado !== 'nan' && row.facturaEstado !== 'None')
            data[row.facturaEstado] = (data[row.facturaEstado] || 0) + 1;
    });

    destroyChart('chartEstados');
    const ctx = document.getElementById('chartEstados').getContext('2d');
    charts.estados = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#48bb78', '#f56565', '#ed8936', '#4299e1', '#9f7aea', '#ec4899'],
                borderWidth: 4,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return ctx.label + ': ' + ctx.parsed.toLocaleString('es-ES') + ' (' + pct + '%)';
                        }
                    }
                }
            }
        }
    });
}

function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const casosAgrupados = {};
    filteredData.forEach(row => {
        if (row.casoNumero) {
            const key = row.year + '-' + row.casoNumero;
            if (!casosAgrupados[key]) {
                casosAgrupados[key] = { ...row, totalImporte: 0 };
            }
            casosAgrupados[key].totalImporte += row.importeUSD || 0;
        }
    });

    const topCasos = Object.values(casosAgrupados).sort((a, b) => b.totalImporte - a.totalImporte).slice(0, 30);

    topCasos.forEach(caso => {
        const statusClass = caso.facturaEstado === 'Pagada' ? 'status-pagada' : 'status-other';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${caso.year}</strong></td>
            <td><strong>${caso.casoNumero}</strong></td>
            <td>${caso.beneficiario || '-'}</td>
            <td>${caso.paisSiniestro || '-'}</td>
            <td>${caso.producto || '-'}</td>
            <td>${caso.cliente || '-'}</td>
            <td><strong>$${Math.round(caso.totalImporte).toLocaleString('es-ES')}</strong></td>
            <td><span class="status-badge ${statusClass}">${caso.facturaEstado || '-'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function destroyChart(chartId) {
    const chartName = chartId.replace('chart', '').toLowerCase();
    if (charts[chartName]) charts[chartName].destroy();
}
