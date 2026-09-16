/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: reportes.js
 * Descripción: Métricas analíticas avanzadas, renderizado de gráficos con Chart.js y exportación de reportes a CSV/PDF.
 */

let trendChart = null;
let zonesChart = null;
let statusChart = null;
let operatorsChart = null;
let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
  initReportes();
  initFilterHandlers();
  initExportHandlers();
  initTableSearch();
});

/**
 * Inicialización de la vista de reportes
 */
async function initReportes() {
  await loadReportData({ dias: 30, zona_id: 'todas' });
}

/**
 * Consulta la API para obtener el dataset analítico consolidado
 */
async function loadReportData(filters = {}) {
  try {
    let queryParams = [];
    if (filters.desde && filters.hasta) {
      queryParams.push(`desde=${encodeURIComponent(filters.desde)}`);
      queryParams.push(`hasta=${encodeURIComponent(filters.hasta)}`);
    } else if (filters.dias) {
      queryParams.push(`dias=${filters.dias}`);
    }

    if (filters.zona_id && filters.zona_id !== 'todas') {
      queryParams.push(`zona_id=${encodeURIComponent(filters.zona_id)}`);
    }

    const qs = queryParams.length ? `?${queryParams.join('&')}` : '';
    const data = await requestAPI(`/api/estadisticas/reportes${qs}`);
    currentReportData = data;

    renderKPIs(data.kpis);
    renderTrendChart(data.tendencia_diaria);
    renderZonesChart(data.distribucion_zonas);
    renderStatusChart(data.distribucion_estados);
    renderOperatorsChart(data.rendimiento_operadores);
    renderTableRecords(data.registros);

  } catch (err) {
    console.error('Error al cargar datos del reporte:', err);
    alert(`Error al generar reporte: ${err.message}`);
  }
}

/**
 * Renderiza los 4 KPIs ejecutivos
 */
function renderKPIs(kpis = {}) {
  const elTotal = document.getElementById('kpi-rep-total');
  const elEfect = document.getElementById('kpi-rep-efectividad');
  const elResSub = document.getElementById('kpi-rep-resueltas-sub');
  const elTiempo = document.getElementById('kpi-rep-tiempo');
  const elPend = document.getElementById('kpi-rep-pendientes');
  const elPendSub = document.getElementById('kpi-rep-pendientes-sub');

  if (elTotal) elTotal.textContent = kpis.total_alertas ?? 0;
  if (elEfect) elEfect.textContent = `${kpis.efectividad_pct ?? 0}%`;
  if (elResSub) elResSub.textContent = `${kpis.resueltas ?? 0} resueltas con éxito`;
  if (elTiempo) elTiempo.textContent = `${kpis.tiempo_promedio_min ?? 0} min`;
  if (elPend) elPend.textContent = (kpis.pendientes ?? 0) + (kpis.en_proceso ?? 0);
  if (elPendSub) elPendSub.textContent = `${kpis.pendientes ?? 0} pendientes / ${kpis.en_proceso ?? 0} alertadas`;
}

/**
 * 1. Gráfico de Tendencia Histórica
 */
function renderTrendChart(data = []) {
  const ctx = document.getElementById('report-trend-chart');
  if (!ctx) return;

  const labels = data.map(d => {
    const parts = d.fecha.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.fecha;
  });
  const totals = data.map(d => d.total);
  const resolved = data.map(d => d.resueltas);

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Detectadas',
          data: totals,
          borderColor: '#479DE5',
          backgroundColor: 'rgba(71, 157, 229, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Resueltas por Cuadrillas',
          data: resolved,
          borderColor: '#3D5843',
          backgroundColor: 'rgba(61, 88, 67, 0.25)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#EDE7D9', font: { family: 'Inter', size: 12 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#7A857F', font: { family: 'Inter' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#7A857F', stepSize: 1, font: { family: 'Inter' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

/**
 * 2. Gráfico de Incidentes por Zona
 */
function renderZonesChart(data = []) {
  const ctx = document.getElementById('report-zones-chart');
  if (!ctx) return;

  const labels = data.map(d => d.zona);
  const values = data.map(d => d.total);
  const colors = data.map(d => d.color || '#479DE5');

  if (zonesChart) zonesChart.destroy();

  zonesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Alertas',
        data: values,
        backgroundColor: colors,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#7A857F', font: { family: 'Inter', size: 11 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#7A857F', stepSize: 1 },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

/**
 * 3. Gráfico Donut de Distribución por Estado
 */
function renderStatusChart(data = []) {
  const ctx = document.getElementById('report-status-chart');
  if (!ctx) return;

  const labels = data.map(d => d.estado);
  const values = data.map(d => d.total);
  const colors = data.map(d => d.color);

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#232B27',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#EDE7D9', boxWidth: 12, padding: 12, font: { family: 'Inter', size: 11 } }
        }
      },
      cutout: '65%'
    }
  });
}

/**
 * 4. Gráfico Horizontal de Rendimiento de Operadores
 */
function renderOperatorsChart(data = []) {
  const ctx = document.getElementById('report-operators-chart');
  if (!ctx) return;

  const labels = data.map(d => d.nombre);
  const resolved = data.map(d => d.resueltas);

  if (operatorsChart) operatorsChart.destroy();

  operatorsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Alertas Resueltas',
        data: resolved,
        backgroundColor: '#60B7BA',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#7A857F', stepSize: 1 },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#EDE7D9', font: { family: 'Inter', size: 12 } },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Tabla detallada de registros para auditoría
 */
function renderTableRecords(records = []) {
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">
          No se encontraron registros de alertas para el filtro aplicado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const estadoSlug = String(r.estado).toLowerCase().replace(/\s+/g, '-');
    let badgeClass = 'resuelta';
    let estadoLabel = r.estado;
    if (estadoSlug.includes('pendiente')) {
      badgeClass = 'pendiente';
      estadoLabel = 'Pendiente';
    } else if (estadoSlug.includes('proceso') || estadoSlug.includes('asig') || estadoSlug.includes('alerta')) {
      badgeClass = 'alertada';
      estadoLabel = 'Alertada';
    } else if (estadoSlug.includes('descart')) {
      badgeClass = 'descartada';
      estadoLabel = 'Descartada';
    } else if (estadoSlug.includes('resuel')) {
      badgeClass = 'resuelta';
      estadoLabel = 'Resuelta';
    }

    return `
      <tr class="report-row">
        <td style="font-weight: 600; color: var(--color-text-secondary);">#${r.id}</td>
        <td style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(r.direccion)}">
          ${escapeHTML(r.direccion)}
        </td>
        <td><strong>${escapeHTML(r.zona)}</strong></td>
        <td><span class="badge-status ${badgeClass}">${escapeHTML(estadoLabel)}</span></td>
        <td>${escapeHTML(r.operador)}</td>
        <td style="font-size: 12px; color: var(--color-text-secondary);">${r.detectado_en || '-'}</td>
        <td style="font-size: 12px; color: var(--color-text-secondary);">${r.resuelto_en || '-'}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Manejador de filtros y cambio de período
 */
function initFilterHandlers() {
  const periodoSelect = document.getElementById('filter-periodo');
  const g1 = document.getElementById('custom-date-group-1');
  const g2 = document.getElementById('custom-date-group-2');
  const form = document.getElementById('report-filter-form');

  if (periodoSelect) {
    periodoSelect.addEventListener('change', () => {
      if (periodoSelect.value === 'custom') {
        g1.classList.remove('hidden');
        g2.classList.remove('hidden');
      } else {
        g1.classList.add('hidden');
        g2.classList.add('hidden');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const periodoVal = periodoSelect.value;
      const zonaVal = document.getElementById('filter-zona').value;

      let filters = { zona_id: zonaVal };

      if (periodoVal === 'custom') {
        const desde = document.getElementById('filter-desde').value;
        const hasta = document.getElementById('filter-hasta').value;
        if (!desde) {
          alert('Por favor seleccione la fecha de inicio (Desde)');
          return;
        }
        filters.desde = desde;
        filters.hasta = hasta;
      } else {
        filters.dias = parseInt(periodoVal) || 30;
      }

      loadReportData(filters);
    });
  }
}

/**
 * Exportación a CSV y PDF/Print
 */
function initExportHandlers() {
  // 1. Exportar CSV
  const btnCsv = document.getElementById('btn-export-csv');
  if (btnCsv) {
    btnCsv.addEventListener('click', () => {
      if (!currentReportData || !currentReportData.registros || !currentReportData.registros.length) {
        alert('No hay datos disponibles para exportar.');
        return;
      }

      const rows = currentReportData.registros;
      const headers = ['ID', 'Direccion', 'Zona', 'Estado', 'Operador', 'Detectado_En', 'Resuelto_En'];
      
      const csvContent = [
        headers.join(';'),
        ...rows.map(r => {
          let estadoFinal = r.estado;
          const s = String(r.estado).toLowerCase();
          if (s.includes('proceso') || s.includes('asig') || s.includes('alerta')) {
            estadoFinal = 'Alertada';
          }
          return [
            r.id,
            `"${(r.direccion || '').replace(/"/g, '""')}"`,
            `"${r.zona || ''}"`,
            `"${estadoFinal || ''}"`,
            `"${r.operador || ''}"`,
            `"${r.detectado_en || ''}"`,
            `"${r.resuelto_en || ''}"`
          ].join(';');
        })
      ].join('\r\n');

      // Descargar con BOM UTF-8 para que Excel abra sin problemas de acentos
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_trashflow_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // 2. Imprimir / Exportar a PDF
  const btnPrint = document.getElementById('btn-print-report');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
}

/**
 * Búsqueda reactiva en la tabla de auditoría
 */
function initTableSearch() {
  const searchInput = document.getElementById('table-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#report-table-body .report-row');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(q)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
