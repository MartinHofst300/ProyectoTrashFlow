/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: hardware.js
 * Descripción: Gestión del hardware ESP32, asignación de operarios y monitoreo de conectividad en tiempo real.
 */

let devicesData = [];
let operatorsData = [];
let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initHardwareView();
  initModals();
  initAutoRefresh();
});

/**
 * Carga inicial de datos de dispositivos y operadores
 */
async function initHardwareView() {
  await Promise.all([
    fetchOperators(),
    fetchDevices()
  ]);
}

/**
 * Consulta la lista de operadores activos para los selectores de asignación
 */
async function fetchOperators() {
  try {
    const data = await requestAPI('/api/operadores');
    // Si viene en array directo o {operadores: [...]}
    operatorsData = Array.isArray(data) ? data : (data.operadores || []);
  } catch (err) {
    console.warn('Error al cargar operadores:', err);
    operatorsData = [];
  }
}

/**
 * Consulta la lista de terminales ESP32 registradas
 */
async function fetchDevices() {
  const tbody = document.getElementById('devices-table-body');
  if (!tbody) return;

  try {
    const data = await requestAPI('/api/hardware/dispositivos');
    devicesData = data.dispositivos || [];
    renderKPIs(devicesData);
    renderDevicesTable(devicesData);
  } catch (err) {
    console.error('Error al cargar dispositivos:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--color-danger);">
          ⚠️ Error al conectar con el servidor de hardware: ${escapeHTML(err.message)}
        </td>
      </tr>
    `;
  }
}

/**
 * Renderiza los KPIs de resumen del hardware
 */
function renderKPIs(devices) {
  const total = devices.length;
  let online = 0;
  let asignados = 0;
  let reserva = 0;

  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  devices.forEach(d => {
    if (d.operador_id) asignados++;
    else reserva++;

    if (d.activo && d.ultima_conexion) {
      const connTime = new Date(d.ultima_conexion).getTime();
      if (!isNaN(connTime) && (now - connTime) <= FIVE_MINUTES_MS) {
        online++;
      }
    }
  });

  const elTotal = document.getElementById('kpi-total-hw');
  const elOnline = document.getElementById('kpi-online-hw');
  const elAsignados = document.getElementById('kpi-asignados-hw');
  const elReserva = document.getElementById('kpi-reserva-hw');

  if (elTotal) elTotal.textContent = total;
  if (elOnline) elOnline.textContent = online;
  if (elAsignados) elAsignados.textContent = asignados;
  if (elReserva) elReserva.textContent = reserva;
}

/**
 * Renderiza la tabla de dispositivos con sus estados y botones de acción
 */
function renderDevicesTable(devices) {
  const tbody = document.getElementById('devices-table-body');
  if (!tbody) return;

  if (devices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 32px; color: var(--color-text-secondary);">
          No hay dispositivos de campo registrados aún. Haga clic en "+ Nuevo Dispositivo" para dar de alta el primero.
        </td>
      </tr>
    `;
    return;
  }

  const now = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;
  const THIRTY_MIN = 30 * 60 * 1000;

  tbody.innerHTML = devices.map(d => {
    // Cálculo de conectividad
    let statusPill = `<span class="status-pill offline"><span class="status-dot"></span> Desconectado</span>`;
    let timeText = 'Nunca conectado';

    if (d.ultima_conexion) {
      const connTime = new Date(d.ultima_conexion).getTime();
      timeText = formatRelativeTime(d.ultima_conexion);

      if (!isNaN(connTime)) {
        const diff = now - connTime;
        if (diff <= FIVE_MIN) {
          statusPill = `<span class="status-pill online"><span class="status-dot"></span> En Línea</span>`;
        } else if (diff <= THIRTY_MIN) {
          statusPill = `<span class="status-pill idle"><span class="status-dot"></span> Inactivo (${timeText})</span>`;
        } else {
          statusPill = `<span class="status-pill offline"><span class="status-dot"></span> Desconectado</span>`;
        }
      }
    }

    // Nombre del operario
    let opDisplay = `<span style="color: var(--color-text-secondary); font-style: italic;">Sin asignar (Reserva)</span>`;
    if (d.operador_id) {
      const opNombre = (d.operador_nombre || '') + ' ' + (d.operador_apellido || '');
      opDisplay = `<strong style="color: var(--color-text-primary);">👤 ${escapeHTML(opNombre.trim() || 'Operario #' + d.operador_id)}</strong>`;
    }

    const tokenPreview = d.token_preview || ('...' + (d.token_device || '').slice(-8));

    return `
      <tr>
        <td style="color: var(--color-text-secondary); font-weight: 600;">#${d.id}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="15" x2="23" y2="15"></line>
            </svg>
            <span style="font-weight: 600;">${escapeHTML(d.nombre)}</span>
          </div>
        </td>
        <td>${statusPill}</td>
        <td>${opDisplay}</td>
        <td>
          <span class="token-code" title="${d.token_device ? 'Token de dispositivo' : 'Token oculto'}">
            ${tokenPreview}
          </span>
        </td>
        <td style="font-size: 13px; color: var(--color-text-secondary);">${timeText}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="openAssignModal(${d.id}, '${escapeHTML(d.nombre)}', ${d.operador_id || 'null'})" title="Asignar o reasignar operario">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <polyline points="17 11 19 13 23 9"></polyline>
              </svg>
              <span>Asignar</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="deactivateDevice(${d.id}, '${escapeHTML(d.nombre)}')" title="Desactivar terminal" style="color: var(--color-danger); border-color: rgba(229, 72, 77, 0.2);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Inicialización de modales y listeners de formularios
 */
function initModals() {
  // 1. Modal Crear Dispositivo
  const btnNuevo = document.getElementById('btn-nuevo-dispositivo');
  const modalDev = document.getElementById('device-modal');
  const closeDev = document.getElementById('modal-close-btn');
  const cancelDev = document.getElementById('btn-cancelar-crear');
  const formDev = document.getElementById('device-form');

  if (btnNuevo && modalDev) {
    btnNuevo.addEventListener('click', () => {
      formDev.reset();
      hideError('form-error-msg');
      modalDev.classList.add('open');
      document.getElementById('dev-nombre')?.focus();
    });
  }

  [closeDev, cancelDev].forEach(btn => {
    btn?.addEventListener('click', () => modalDev.classList.remove('open'));
  });

  if (formDev) {
    formDev.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('dev-nombre').value.trim();
      if (!nombre) return;

      const submitBtn = document.getElementById('btn-guardar-device');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Generando...';

      try {
        const res = await requestAPI('/api/hardware/dispositivos', {
          method: 'POST',
          body: JSON.stringify({ nombre })
        });

        modalDev.classList.remove('open');
        showTokenSuccessModal(res.token_device, res.nombre);
        await fetchDevices();
        showToast(`Dispositivo "${nombre}" creado correctamente.`, 'success');
      } catch (err) {
        showError('form-error-msg', err.message || 'Error al registrar el dispositivo.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // 2. Modal Token Generado
  const modalToken = document.getElementById('token-success-modal');
  const closeToken = document.getElementById('token-modal-close-btn');
  const btnCerrarToken = document.getElementById('btn-cerrar-token-modal');
  const btnCopy = document.getElementById('btn-copy-token');

  [closeToken, btnCerrarToken].forEach(b => {
    b?.addEventListener('click', () => modalToken.classList.remove('open'));
  });

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const tokenText = document.getElementById('full-token-text').textContent;
      navigator.clipboard.writeText(tokenText).then(() => {
        document.getElementById('copy-btn-text').textContent = '¡Copiado!';
        btnCopy.classList.add('btn-primary');
        setTimeout(() => {
          document.getElementById('copy-btn-text').textContent = 'Copiar';
          btnCopy.classList.remove('btn-primary');
        }, 2000);
      });
    });
  }

  // 3. Modal Asignar Operario
  const modalAssign = document.getElementById('assign-modal');
  const closeAssign = document.getElementById('assign-close-btn');
  const cancelAssign = document.getElementById('btn-cancelar-asignar');
  const formAssign = document.getElementById('assign-form');

  [closeAssign, cancelAssign].forEach(b => {
    b?.addEventListener('click', () => modalAssign.classList.remove('open'));
  });

  if (formAssign) {
    formAssign.addEventListener('submit', async (e) => {
      e.preventDefault();
      const devId = document.getElementById('assign-device-id').value;
      const opSelect = document.getElementById('assign-operator-select');
      const opId = opSelect.value ? parseInt(opSelect.value) : null;

      const submitBtn = document.getElementById('btn-guardar-asignacion');
      submitBtn.disabled = true;

      try {
        await requestAPI(`/api/hardware/dispositivos/${devId}/asignar`, {
          method: 'PATCH',
          body: JSON.stringify({ operador_id: opId })
        });

        modalAssign.classList.remove('open');
        await fetchDevices();
        showToast('Asignación de operario actualizada.', 'success');
      } catch (err) {
        showError('assign-error-msg', err.message || 'Error al asignar operario.');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // 4. Botón Refrescar
  const btnRefrescar = document.getElementById('btn-refrescar');
  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', async () => {
      btnRefrescar.classList.add('rotating');
      await fetchDevices();
      setTimeout(() => btnRefrescar.classList.remove('rotating'), 600);
      showToast('Estado de dispositivos sincronizado.', 'success');
    });
  }
}

/**
 * Muestra el modal con el token generado
 */
function showTokenSuccessModal(token, deviceName) {
  const modal = document.getElementById('token-success-modal');
  const tokenEl = document.getElementById('full-token-text');
  if (modal && tokenEl) {
    tokenEl.textContent = token;
    modal.classList.add('open');
  }
}

/**
 * Abre el modal de asignación de operario para un dispositivo específico
 */
window.openAssignModal = function(deviceId, deviceName, currentOpId) {
  const modal = document.getElementById('assign-modal');
  const titleEl = document.getElementById('assign-device-name');
  const idInput = document.getElementById('assign-device-id');
  const select = document.getElementById('assign-operator-select');

  if (!modal || !select) return;

  hideError('assign-error-msg');
  idInput.value = deviceId;
  titleEl.textContent = `Terminal: ${deviceName}`;

  // Poblar select con operarios
  select.innerHTML = `<option value="">-- Sin asignar (Dejar en reserva) --</option>`;
  operatorsData.forEach(op => {
    const selected = (currentOpId && op.id === currentOpId) ? 'selected' : '';
    const opNombre = `${op.nombre} ${op.apellido}` + (op.zona_nombre ? ` (${op.zona_nombre})` : '');
    select.innerHTML += `<option value="${op.id}" ${selected}>${escapeHTML(opNombre)}</option>`;
  });

  modal.classList.add('open');
};

/**
 * Desactiva un dispositivo previa confirmación
 */
window.deactivateDevice = async function(deviceId, deviceName) {
  if (!confirm(`¿Está seguro de que desea desactivar o dar de baja el dispositivo "${deviceName}"?`)) {
    return;
  }

  try {
    await requestAPI(`/api/hardware/dispositivos/${deviceId}`, {
      method: 'DELETE'
    });
    await fetchDevices();
    showToast(`Dispositivo "${deviceName}" desactivado.`, 'success');
  } catch (err) {
    alert(`Error: ${err.message || 'No se pudo desactivar el dispositivo'}`);
  }
};

/**
 * Auto-actualización periódica en segundo plano cada 30 segundos
 */
function initAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    fetchDevices();
  }, 30000);
}

// --- Helpers de Utilidad ---

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Hace instantes';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} hs`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) {
    el.textContent = `⚠️ ${msg}`;
    el.classList.remove('hidden');
    el.style.display = 'block';
  }
}

function hideError(elId) {
  const el = document.getElementById(elId);
  if (el) {
    el.classList.add('hidden');
    el.style.display = 'none';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : 'ℹ️'}</span>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
