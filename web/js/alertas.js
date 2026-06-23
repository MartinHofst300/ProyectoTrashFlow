/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: alertas.js
 * Descripción: Controla la lógica de la página de administración de alertas de basura (alertas.html).
 *              Administra la búsqueda interactiva, los filtros combinados por zona, estado
 *              y fecha, la paginación de resultados, la visualización de la barra de confianza
 *              de la Inteligencia Artificial y la asignación manual de operadores de campo.
 * 
 * Dependencias:
 *   - config.js (Usa requestAPI y BASE_URL)
 * 
 * Expone:
 *   - loadAlertas(): Realiza la petición HTTP filtrada y renderiza la tabla.
 */

// Variables globales para controlar la paginación del listado
let currentPage = 1;
const perPage = 10;

// Inicialización de escuchadores tras cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('trashflow_token');
  if (!token) return; // Si no hay token, el flujo es interceptado por auth.js

  initAlertsPage();
});

/**
 * Vincula los formularios de filtros e inicializa los modales de asignación.
 */
function initAlertsPage() {
  loadAlertas();      // Carga el listado inicial de alertas
  initAsignarModal(); // Vincula los botones del modal de asignación de operadores

  // Escucha el envío del formulario de filtros para reiniciar la página y volver a buscar
  const filterForm = document.getElementById('filters-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      currentPage = 1; // Reinicia a la página 1 ante una nueva búsqueda
      loadAlertas();
    });
  }
}

/**
 * Consulta las alertas en el backend de Flask aplicando los filtros de la interfaz
 * y dibuja las filas de la tabla de alertas de forma dinámica.
 */
async function loadAlertas() {
  const tableBody = document.querySelector('#alerts-table tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const paginationControls = document.getElementById('pagination-controls');
  
  if (!tableBody) return;

  // Renderiza shimmers de carga en la tabla mientras se completa la llamada de red
  renderTableSkeletons();

  // Obtiene los valores ingresados por el usuario en el panel de filtros
  const q = document.getElementById('search-input')?.value.trim() || '';
  const zona = document.getElementById('filter-zona')?.value || 'Todas las Zonas';
  const estado = document.getElementById('filter-estado')?.value || 'Todos los Estados';
  const fecha = document.getElementById('filter-fecha')?.value || '';

  try {
    // Configura los parámetros HTTP en formato query string
    const queryParams = new URLSearchParams({
      page: currentPage,
      per_page: perPage,
      q: q,
      zona: zona,
      estado: estado,
      fecha: fecha
    });

    // Permite filtrar alertas de una cámara de videovigilancia específica si se pasa en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const camaraId = urlParams.get('camara_id');
    if (camaraId) {
      queryParams.set('camara_id', camaraId);
    }

    // Realiza la petición GET al backend de Flask
    const data = await requestAPI(`/api/alertas?${queryParams.toString()}`);

    // Limpia las animaciones de carga
    tableBody.innerHTML = '';

    // Maneja el caso de resultados vacíos
    if (data.alertas.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: var(--spacing-xl); color: var(--color-text-secondary);">
            No se encontraron alertas con los filtros especificados.
          </td>
        </tr>
      `;
      if (paginationInfo) paginationInfo.textContent = 'Mostrando 0-0 de 0 alertas';
      if (paginationControls) paginationControls.innerHTML = '';
      return;
    }

    // Mapeo estético de los nombres de estados operativos
    const statesMap = {
      pendiente: { label: 'Pendiente', badgeClass: 'badge-pendiente' },
      asignada: { label: 'Asignada', badgeClass: 'badge-asignada' },
      en_proceso: { label: 'En Proceso', badgeClass: 'badge-en-proceso' },
      resuelta: { label: 'Resuelta', badgeClass: 'badge-resuelta' },
      descartada: { label: 'Descartada', badgeClass: 'badge-descartada' }
    };

    // Renderiza cada fila de alerta
    data.alertas.forEach(alert => {
      const stateObj = statesMap[alert.estado] || { label: alert.estado, badgeClass: 'badge-descartada' };
      const formattedDate = formatDateTime(alert.fecha);
      const operatorHtml = getOperatorDisplay(alert.operador, alert.id, alert.estado);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <img src="${BASE_URL}/${alert.foto}" class="table-thumbnail alert-thumb" alt="Evidencia" data-id="${alert.id}">
        </td>
        <td>
          <div style="font-weight: 600; font-size: 14px;">${alert.zona}</div>
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
          ${operatorHtml}
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

    // Calcula y actualiza el texto de resumen de paginación (ej: "Mostrando 1-10 de 25 alertas")
    const startIdx = (data.page - 1) * data.per_page + 1;
    const endIdx = Math.min(startIdx + data.alertas.length - 1, data.total_items);
    if (paginationInfo) {
      paginationInfo.textContent = `Mostrando ${startIdx}-${endIdx} de ${data.total_items} alertas activas`;
    }

    // Dibuja los botones del paginador
    buildPagination(data.total_pages);

    // Inicializa los clicks para ampliar fotos
    initThumbModals();

  } catch (error) {
    console.error('Error al obtener alertas:', error);
    showTableError(error.message);
  }
}

/**
 * Renderiza 5 filas de esqueleto (Skeleton) animadas para indicar al usuario
 * que la información se está cargando desde el servidor.
 */
function renderTableSkeletons() {
  const tableBody = document.querySelector('#alerts-table tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><div class="skeleton skeleton-thumbnail"></div></td>
      <td>
        <div class="skeleton" style="height: 14px; width: 80px; margin-bottom: 6px;"></div>
        <div class="skeleton" style="height: 10px; width: 120px;"></div>
      </td>
      <td><div class="skeleton" style="height: 14px; width: 90px;"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton" style="height: 12px; width: 130px;"></div></td>
      <td>
        <div class="flex items-center gap: 8px;">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton" style="height: 12px; width: 70px;"></div>
        </div>
      </td>
      <td>
        <div class="flex items-center gap: var(--spacing-sm);">
          <div class="skeleton" style="height: 6px; width: 80px; border-radius: 3px;"></div>
          <div class="skeleton" style="height: 12px; width: 30px;"></div>
        </div>
      </td>
      <td><div class="skeleton" style="height: 30px; width: 30px; border-radius: 4px;"></div></td>
    `;
    tableBody.appendChild(row);
  }
}

/**
 * Genera el formato de visualización del operador.
 * Si no está asignado y la alerta está pendiente, muestra un botón interactivo de "Asignar".
 * Si está asignado, muestra un avatar con las iniciales (ej: "MH" para Martín Hofstetter) y su nombre.
 */
function getOperatorDisplay(operatorName, alertId, alertStatus) {
  if (!operatorName || operatorName === 'Sin asignar' || operatorName.trim() === '') {
    if (alertStatus === 'pendiente') {
      return `
        <div class="operator-cell">
          <button class="btn btn-secondary btn-asignar" data-id="${alertId}" style="padding: 4px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; background-color: #4a5568; color: #fff; border: none; font-weight: 500;">Asignar</button>
        </div>
      `;
    } else {
      return `
        <div class="operator-cell">
          <span class="operator-unassigned">Sin asignar</span>
        </div>
      `;
    }
  }

  // Generación de iniciales del nombre
  const parts = operatorName.split(' ');
  let initials = '';
  if (parts.length > 0) {
    initials += parts[0][0];
    if (parts.length > 1) {
      initials += parts[1][0];
    }
  }
  initials = initials.toUpperCase();

  return `
    <div class="operator-cell">
      <div class="operator-avatar" title="${operatorName}">${initials}</div>
      <span class="operator-name">${operatorName}</span>
    </div>
  `;
}

/**
 * Crea dinámicamente los botones de control de páginas (Paginación).
 */
function buildPagination(totalPages) {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  container.innerHTML = '';

  // Oculta el paginador si toda la información entra en una sola página
  if (totalPages <= 1) return;

  // Botón: Anterior
  const prevBtn = document.createElement('button');
  prevBtn.className = `btn btn-secondary pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.innerHTML = `&larr; Anterior`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadAlertas();
    }
  });
  container.appendChild(prevBtn);

  // Páginas numeradas
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `pagination-number-btn ${currentPage === i ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      if (currentPage !== i) {
        currentPage = i;
        loadAlertas();
      }
    });
    container.appendChild(pageBtn);
  }

  // Botón: Siguiente
  const nextBtn = document.createElement('button');
  nextBtn.className = `btn btn-secondary pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.innerHTML = `Siguiente &rarr;`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadAlertas();
    }
  });
  container.appendChild(nextBtn);
}

/**
 * Helper para formatear fechas a representación humanizada.
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
 * Renderiza el estado de error en la tabla si falla la comunicación.
 */
function showTableError(msg) {
  const tableBody = document.querySelector('#alerts-table tbody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: var(--spacing-xl); color: var(--color-danger);">
          <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 4px;">Error al cargar alertas</div>
          <div style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 12px;">${msg || 'No se pudo conectar al servidor.'}</div>
          <button onclick="loadAlertas()" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Reintentar</button>
        </td>
      </tr>
    `;
  }
}

/**
 * Vincula clicks en miniaturas para abrir imágenes en modal gigante.
 */
function initThumbModals() {
  const thumbnails = document.querySelectorAll('.alert-thumb');
  const modalOverlay = document.getElementById('photo-modal');
  const modalImg = document.getElementById('modal-photo-img');
  const modalTitle = document.getElementById('modal-photo-title');
  const modalClose = document.getElementById('modal-photo-close');

  if (!modalOverlay || !modalImg || !modalClose) return;

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

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

/**
 * Inicializa y controla el modal para asignar un operador de recolección
 * a un incidente de basura.
 */
function initAsignarModal() {
  const modalAsignar = document.getElementById('asignar-operador-modal');
  const modalClose = document.getElementById('modal-asignar-close');
  const btnCancelar = document.getElementById('btn-cancelar-asignar');
  const btnConfirmar = document.getElementById('btn-confirmar-asignar');
  const selectOperador = document.getElementById('select-operador');
  const inputAlertaId = document.getElementById('asignar-alerta-id');

  if (!modalAsignar || !modalClose || !btnCancelar || !btnConfirmar || !selectOperador || !inputAlertaId) return;

  // Delegación de eventos en el cuerpo de la tabla para capturar clics en los botones dinámicos de "Asignar"
  const tableBody = document.querySelector('#alerts-table tbody');
  if (tableBody) {
    tableBody.addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-asignar')) {
        const alertaId = e.target.getAttribute('data-id');
        inputAlertaId.value = alertaId;
        
        selectOperador.innerHTML = '<option value="">Cargando operadores...</option>';
        modalAsignar.classList.add('active');
        
        try {
          // Obtiene los operadores disponibles del backend
          const operadores = await requestAPI('/api/operadores');
          // Filtra únicamente operadores que se encuentren activos en el sistema
          const activos = operadores.filter(op => op.activo === 1 || op.activo === true);
          
          if (activos.length === 0) {
            selectOperador.innerHTML = '<option value="">No hay operadores activos</option>';
          } else {
            selectOperador.innerHTML = '<option value="">Selecciona un operador...</option>';
            activos.forEach(op => {
              const opt = document.createElement('option');
              opt.value = op.id;
              opt.textContent = `${op.nombre} ${op.apellido}`;
              selectOperador.appendChild(opt);
            });
          }
        } catch (err) {
          console.error("Error cargando operadores:", err);
          selectOperador.innerHTML = '<option value="">Error al cargar operadores</option>';
        }
      }
    });
  }

  const closeModal = () => {
    modalAsignar.classList.remove('active');
    inputAlertaId.value = '';
    selectOperador.value = '';
  };

  modalClose.addEventListener('click', closeModal);
  btnCancelar.addEventListener('click', closeModal);
  modalAsignar.addEventListener('click', (e) => {
    if (e.target === modalAsignar) closeModal();
  });

  // Envía la petición PATCH para registrar la asignación en la base de datos
  btnConfirmar.addEventListener('click', async () => {
    const alertaId = inputAlertaId.value;
    const operadorId = selectOperador.value;

    if (!alertaId || !operadorId) {
      alert("Por favor, selecciona un operador.");
      return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Asignando...';

    try {
      const res = await requestAPI(`/api/alertas/${alertaId}/asignar`, {
        method: 'PATCH',
        body: JSON.stringify({ operador_id: parseInt(operadorId) })
      });

      if (res.ok) {
        closeModal();
        loadAlertas(); // Recarga la tabla con los datos actualizados
      } else {
        alert(res.mensaje || "Error al asignar el operador.");
      }
    } catch (err) {
      console.error("Error al asignar operador:", err);
      alert(err.message || "Error de conexión.");
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar asignación';
    }
  });
}
