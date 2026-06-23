/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: dashboard.js
 * Descripción: Inicializa el panel de control principal del municipio.
 *              Obtiene métricas clave (KPIs), genera gráficos interactivos con Chart.js
 *              (distribución semanal y mapa de alertas por zonas), y lista de forma dinámica
 *              las últimas 5 alertas de residuos capturadas en Vicente López.
 * 
 * Dependencias:
 *   - config.js (Usa requestAPI y BASE_URL)
 *   - Chart.js (Biblioteca externa cargada vía CDN para dibujar gráficos)
 * 
 * Expone:
 *   - initDashboard(): Carga de forma paralela toda la información visual del panel.
 */

// Se ejecuta tras cargar el DOM de la página dashboard.html
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('trashflow_token');
  if (!token) return; // Si no hay token, el flujo es interceptado por auth.js

  initDashboard();
});

/**
 * Orquesta la carga simultánea de las métricas, gráficos interactivos
 * e historial reciente utilizando promesas concurrentes.
 */
async function initDashboard() {
  try {
    // Ejecuta las tres tareas en paralelo para una carga ultrarrápida del frontend
    await Promise.all([
      loadKPIs(),
      loadCharts(),
      loadRecentAlerts()
    ]);
  } catch (error) {
    console.error('Error al inicializar el panel principal:', error);
    showDashboardError();
  }
}

/**
 * 1. Carga de KPIs (Indicadores Clave de Desempeño).
 * Obtiene métricas del servidor (ej: alertas detectadas hoy, incidentes pendientes, etc.)
 * y las renderiza en las tarjetas superiores reemplazando los esqueletos (shimmers) de carga.
 */
async function loadKPIs() {
  const kpiContainer = document.getElementById('kpis-container');
  if (!kpiContainer) return;

  try {
    const data = await requestAPI('/api/dashboard/hoy');

    // Tarjeta: Alertas de hoy
    document.getElementById('kpi-alertas-hoy-value').textContent = data.alertas_hoy;
    document.getElementById('kpi-alertas-hoy-sub').textContent = data.alertas_hoy_cambio;
    document.getElementById('kpi-alertas-hoy-sub').className = 'card-subtitle text-danger';

    // Tarjeta: Alertas pendientes
    document.getElementById('kpi-pendientes-value').textContent = data.pendientes;
    document.getElementById('kpi-pendientes-sub').textContent = data.pendientes_subtitulo;
    document.getElementById('kpi-pendientes-sub').className = 'card-subtitle text-warning';

    // Tarjeta: Alertas resueltas
    document.getElementById('kpi-resueltas-value').textContent = data.resueltas;
    document.getElementById('kpi-resueltas-sub').textContent = `${data.resueltas_porcentaje} completado`;
    document.getElementById('kpi-resueltas-sub').className = 'card-subtitle text-success';

    // Tarjeta: Tiempo promedio de respuesta municipal
    document.getElementById('kpi-tiempo-value').textContent = `${data.tiempo_promedio} min`;
    document.getElementById('kpi-tiempo-sub').textContent = data.tiempo_promedio_subtitulo;
    document.getElementById('kpi-tiempo-sub').className = 'card-subtitle text-info';

    // Oculta los esqueletos visuales y activa la visualización del contenido real
    kpiContainer.querySelectorAll('.skeleton').forEach(el => el.classList.add('hidden'));
    kpiContainer.querySelectorAll('.kpi-card-content').forEach(el => el.classList.remove('hidden'));

  } catch (error) {
    console.error('Error al cargar KPIs:', error);
    throw error;
  }
}

// Instancias globales para los gráficos de Chart.js para permitir reinicializarlos o limpiarlos
let weeklyChartInstance = null;
let zonesChartInstance = null;

/**
 * 2. Carga y renderizado de gráficos estadísticos (Chart.js).
 * Consulta las tendencias semanales y la distribución geográfica de acumulación de basura.
 */
async function loadCharts() {
  const weeklyCanvas = document.getElementById('weekly-trend-chart');
  const zonesCanvas = document.getElementById('zones-chart');

  if (!weeklyCanvas || !zonesCanvas) return;

  try {
    // Obtiene datos estadísticos del backend
    const weeklyData = await requestAPI('/api/estadisticas/semanal');
    const zonesData = await requestAPI('/api/estadisticas/por-zona');

    // Remueve animaciones de carga (skeletons) y muestra los elementos canvas
    document.querySelectorAll('.chart-card-wrapper .skeleton').forEach(el => el.classList.add('hidden'));
    weeklyCanvas.classList.remove('hidden');
    zonesCanvas.classList.remove('hidden');

    // Procesa datos de tendencias semanales
    const rawWeekly = weeklyData.ultimos_7_dias || [];
    const weeklyLabels = rawWeekly.map(item => {
      if (!item.fecha) return "";
      const parts = item.fecha.split("-");
      // Transforma formato 'AAAA-MM-DD' a 'DD/MM' para el gráfico
      return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : item.fecha;
    });
    const weeklyCounts = rawWeekly.map(item => item.total_alertas || 0);

    // Procesa distribución por zonas municipales
    const rawZones = zonesData || [];
    const zoneLabels = rawZones.map(item => item.zona || "Desconocido");
    const zoneCounts = rawZones.map(item => item.total_alertas || 0);
    const zoneColors = rawZones.map(item => item.color_hex || '#4A90D9');

    // Paleta tipográfica y de color del gráfico integrada con variables CSS
    const chartFontColor = '#8888AA'; // --color-text-secondary
    const chartGridColor = '#2A2A45'; // --color-border

    // Gráfico 1: Tendencia Semanal de Detecciones (Gráfico de Líneas)
    weeklyChartInstance = new Chart(weeklyCanvas, {
      type: 'line',
      data: {
        labels: weeklyLabels,
        datasets: [{
          label: 'Alertas',
          data: weeklyCounts,
          borderColor: '#6B8F8A', // --color-accent-teal
          backgroundColor: 'rgba(107, 143, 138, 0.1)',
          fill: true,
          tension: 0.3, // Suaviza la curva de la línea
          borderWidth: 3,
          pointBackgroundColor: '#6B8F8A',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false } // Oculta leyenda ya que hay una sola métrica
        },
        scales: {
          x: {
            grid: { color: chartGridColor },
            ticks: { color: chartFontColor, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: chartGridColor },
            ticks: { color: chartFontColor, font: { family: 'Inter', size: 11 }, precision: 0 }
          }
        }
      }
    });

    // Gráfico 2: Alertas por Zona / Localidad (Gráfico de Barras Horizontal)
    zonesChartInstance = new Chart(zonesCanvas, {
      type: 'bar',
      data: {
        labels: zoneLabels,
        datasets: [{
          data: zoneCounts,
          backgroundColor: zoneColors,
          borderRadius: 4,
          barThickness: 16
        }]
      },
      options: {
        indexAxis: 'y', // Configura orientación horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: chartGridColor },
            ticks: { color: chartFontColor, font: { family: 'Inter', size: 11 }, precision: 0 }
          },
          y: {
            grid: { display: false },
            ticks: { color: chartFontColor, font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al cargar gráficos:', error);
    throw error;
  }
}

/**
 * 3. Carga y renderizado de la tabla de alertas recientes.
 * Consulta las últimas 5 incidencias detectadas en la vía pública por el modelo de IA.
 */
async function loadRecentAlerts() {
  const tableBody = document.querySelector('#recent-alerts-table tbody');
  if (!tableBody) return;

  try {
    const data = await requestAPI('/api/alertas?limit=5&orden=desc');
    const alerts = data.alertas || [];

    // Limpia las filas animadas (shimmers)
    tableBody.innerHTML = '';

    if (alerts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: var(--spacing-xl); color: var(--color-text-secondary);">
            No se han registrado alertas hoy
          </td>
        </tr>
      `;
      return;
    }

    // Mapeo estético de estados con sus respectivas clases CSS
    const statesMap = {
      pendiente: { label: 'Pendiente', badgeClass: 'badge-pendiente' },
      asignada: { label: 'Asignada', badgeClass: 'badge-asignada' },
      en_proceso: { label: 'En Proceso', badgeClass: 'badge-en-proceso' },
      resuelta: { label: 'Resuelta', badgeClass: 'badge-resuelta' },
      descartada: { label: 'Descartada', badgeClass: 'badge-descartada' }
    };

    alerts.forEach(alert => {
      const stateObj = statesMap[alert.estado] || { label: alert.estado, badgeClass: 'badge-descartada' };
      const formattedDate = formatDateTime(alert.fecha);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <img src="${BASE_URL}/${alert.foto}" class="table-thumbnail alert-thumb" alt="Evidencia" data-id="${alert.id}">
        </td>
        <td>
          <div style="font-weight: 600;">${alert.zona}</div>
          <div style="font-size: 12px; color: var(--color-text-secondary);">${alert.direccion}</div>
        </td>
        <td>
          <span style="font-size: 13px;">${alert.tipo}</span>
        </td>
        <td>
          <span class="badge ${stateObj.badgeClass}">${stateObj.label}</span>
        </td>
        <td style="font-size: 13px; color: var(--color-text-secondary);">
          ${formattedDate}
        </td>
        <td>
          <a href="alerta-detalle.html?id=${alert.id}" class="action-icon-btn" title="Ver detalle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </a>
        </td>
      `;

      tableBody.appendChild(row);
    });

    // Vincula el modal visor de fotos para ampliar la evidencia al hacer clic en las miniaturas
    initThumbModals();

  } catch (error) {
    console.error('Error al cargar alertas recientes:', error);
    throw error;
  }
}

/**
 * Formatea una fecha en formato ISO 'AAAA-MM-DDTHH:MM:SS' a una representación legible
 * en español (ej: "18 Jun, 2026 / 02:30 PM").
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  return `${day} ${month}, ${year} / ${strTime}`;
}

/**
 * Renderiza de forma amigable un estado de error en todo el panel
 * si el backend de Flask no responde.
 */
function showDashboardError() {
  const contentBody = document.querySelector('.content-body');
  if (contentBody) {
    contentBody.innerHTML = `
      <div class="flex flex-col items-center justify-center text-center" style="padding: 100px var(--spacing-lg); height: 100%;">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h2 style="font-size: 22px; margin-bottom: 10px; color: var(--color-text-primary);">Error al Cargar Panel</h2>
        <p style="margin-bottom: var(--spacing-lg); max-width: 450px;">Ocurrió un problema de conexión al obtener los datos del servidor. Verifique si la API está en ejecución o reintente.</p>
        <button onclick="window.location.reload()" class="btn btn-primary">Reintentar</button>
      </div>
    `;
  }
}

/**
 * Vincula los escuchadores de eventos para ampliar las imágenes de basura
 * (evidencia fotográfica) de la tabla en un modal flotante.
 */
function initThumbModals() {
  const thumbnails = document.querySelectorAll('.alert-thumb');
  const modalOverlay = document.getElementById('photo-modal');
  const modalImg = document.getElementById('modal-photo-img');
  const modalTitle = document.getElementById('modal-photo-title');
  const modalClose = document.getElementById('modal-photo-close');

  if (!modalOverlay || !modalImg || !modalClose) return;

  // Al hacer clic en una foto, la abre en pantalla completa
  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const alertId = thumb.getAttribute('data-id');
      modalImg.src = thumb.src;
      if (modalTitle) modalTitle.textContent = `Evidencia de Alerta ${alertId}`;
      modalOverlay.classList.add('active');
    });
  });

  const closeModal = () => {
    modalOverlay.classList.remove('active');
    modalImg.src = '';
  };

  // Permite cerrar el modal con el botón X o haciendo clic en el fondo oscuro
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
