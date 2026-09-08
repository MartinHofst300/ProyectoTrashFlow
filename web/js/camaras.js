/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 *
 * Archivo: camaras.js
 * Descripción: Controla la visualización y gestión completa de cámaras fijas.
 *              Carga, crea, edita y desactiva cámaras mediante la API REST.
 *
 * Dependencias:
 *   - config.js (requestAPI, escapeHTML)
 *   - Leaflet (geocodificación + mapa en modales)
 */

document.addEventListener('DOMContentLoaded', () => {
  loadCameras();
  initCameraModals();

  // Geocodificadores para ambos modales
  window._geocoderCrear = initGeocoder({
    inputId:     'cam-ubicacion',
    btnId:       'btn-geocodificar',
    latHiddenId: 'cam-lat',
    lngHiddenId: 'cam-lng',
    previewId:   'cam-mapa-preview',
    mapaId:      'cam-mapa',
    coordsId:    'cam-coords-display',
    zonaSelectId:'cam-zona',
    zonaBadgeId: 'cam-zona-badge'
  });

  window._geocoderEditar = initGeocoder({
    inputId:     'edit-cam-ubicacion',
    btnId:       'btn-geocodificar-edit',
    latHiddenId: 'edit-cam-lat',
    lngHiddenId: 'edit-cam-lng',
    previewId:   'edit-cam-mapa-preview',
    mapaId:      'edit-cam-mapa',
    coordsId:    'edit-cam-coords-display',
    zonaSelectId:'edit-cam-zona',
    zonaBadgeId: 'edit-cam-zona-badge'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadCameras — Carga y renderiza las tarjetas de cámara con Cooldown de 30 min
// ─────────────────────────────────────────────────────────────────────────────

const COOLDOWN_DURATION_MS = 30 * 60 * 1000; // 30 minutos

async function loadCameras() {
  const container = document.getElementById('camaras-container');
  if (!container) return;

  try {
    const data = await requestAPI('/api/camaras');

    // Remueve shimmers
    container.innerHTML = '';

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <h3>No hay cámaras registradas</h3>
          <p>Usá el botón "Nueva Cámara" para registrar el primer dispositivo.</p>
        </div>
      `;
      return;
    }

    data.forEach(camara => {
      const card = document.createElement('div');
      
      // ── Comprobación de Cooldown (30 min tras última alerta) ──
      let isCooldown = false;
      let cooldownEndTime = 0;

      if (camara.ultima_alerta) {
        const alertTime = new Date(camara.ultima_alerta.replace(/-/g, '/')).getTime();
        const diffMs = Date.now() - alertTime;
        if (diffMs >= 0 && diffMs < COOLDOWN_DURATION_MS) {
          isCooldown = true;
          cooldownEndTime = alertTime + COOLDOWN_DURATION_MS;
        }
      }

      card.className = `card camera-card ${isCooldown ? 'is-cooldown' : ''}`;

      // ── Estado: usar el campo estado de la DB + cooldown + umbral de 90s ──
      let badgeClass = 'badge-offline';
      let badgeHtml  = 'Desconectado';

      if (camara.estado === 'mantenimiento') {
        badgeClass = 'badge-mantenimiento';
        badgeHtml  = 'Mantenimiento';
      } else if (isCooldown) {
        badgeClass = 'badge-cooldown';
        badgeHtml  = '<span class="cooldown-dot"></span>Pausada (30m)';
      } else if (camara.estado === 'online' && camara.ultima_conexion) {
        // Umbral: 90 segundos (3 ciclos de heartbeat de 30s)
        const lastConn   = new Date(camara.ultima_conexion.replace(/-/g, '/'));
        const diffSecs   = (new Date() - lastConn) / 1000;
        if (diffSecs <= 90) {
          badgeClass = 'badge-online';
          badgeHtml  = 'En Línea';
        }
      }

      const ultimaConexion = camara.ultima_conexion
        ? formatDateTime(camara.ultima_conexion)
        : 'Nunca conectado';

      const cooldownBoxHtml = isCooldown ? `
        <div class="camera-cooldown-box" id="cooldown-box-${camara.id}">
          <div class="cooldown-box-header">
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Pausa anti-sobrecarga (30m)
            </span>
            <span style="font-size: 10.5px; opacity: 0.85;">Alerta reciente</span>
          </div>
          <div class="cooldown-box-timer">
            <span class="cooldown-label">Reactivación en:</span>
            <span class="cooldown-digits cooldown-countdown" data-camara-id="${camara.id}" data-target-time="${cooldownEndTime}">--:--</span>
          </div>
        </div>
      ` : '';

      card.innerHTML = `
        <div class="camera-card-header">
          <div class="camera-title-group">
            <h3 class="camera-card-title">
              Cámara #${camara.id}
            </h3>
            <div class="camera-card-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHTML(camara.ubicacion)}</span>
            </div>
          </div>
          <span class="badge ${badgeClass}">${badgeHtml}</span>
        </div>

        <div class="camera-stats">
          <div class="stat-item">
            <span class="stat-label">Detecciones</span>
            <span class="stat-value">${camara.total_detecciones || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Último Acceso</span>
            <span class="stat-value" title="${camara.ultima_conexion || ''}">${ultimaConexion}</span>
          </div>
        </div>

        ${cooldownBoxHtml}

        <div class="camera-card-actions" style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end;">
          <a href="alertas.html?camara_id=${camara.id}"
             class="btn btn-secondary"
             style="flex: 1; text-align: center; text-decoration: none; display: inline-block;">
            Ver Alertas
          </a>
          <button class="btn btn-secondary"
                  style="padding: 8px 12px;"
                  onclick="openEditCameraModal(${camara.id})"
                  title="Editar cámara">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn"
                  style="padding: 8px 12px; background: transparent; border: 1px solid var(--color-danger); color: var(--color-danger);"
                  onclick="confirmDeleteCamera(${camara.id})"
                  title="Desactivar cámara">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    // Inicia el temporizador de actualización cada 1s
    initCooldownTicker();

  } catch (error) {
    console.error('Error al cargar cámaras:', error);
    container.innerHTML = `
      <div class="empty-state" style="border-color: var(--color-danger);">
        <svg viewBox="0 0 24 24" style="color: var(--color-danger);">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 style="color: var(--color-danger);">Error al cargar cámaras</h3>
        <p>${escapeHTML(error.message || 'No se pudo conectar con el servidor')}</p>
        <button class="btn btn-secondary" onclick="loadCameras()" style="margin-top: var(--spacing-sm);">
          Reintentar
        </button>
      </div>
    `;
  }
}

/**
 * Temporizador en tiempo real (1s) para los contadores de enfriamiento
 */
function initCooldownTicker() {
  if (window._cooldownInterval) {
    clearInterval(window._cooldownInterval);
  }

  function updateTimers() {
    const countdownEls = document.querySelectorAll('.cooldown-countdown');
    const now = Date.now();

    countdownEls.forEach(el => {
      const targetTime = parseInt(el.getAttribute('data-target-time'), 10);
      if (!targetTime) return;

      const remainingMs = targetTime - now;
      if (remainingMs > 0) {
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        el.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} restante`;
      } else {
        // Enfriamiento concluido: Reactivación en vivo
        el.textContent = '00:00 - Reactivada';
        const camId = el.getAttribute('data-camara-id');
        const box = document.getElementById(`cooldown-box-${camId}`);
        if (box) {
          box.style.opacity = '0';
          setTimeout(() => box.remove(), 400);
        }
        const card = el.closest('.camera-card');
        if (card) {
          card.classList.remove('is-cooldown');
          const badge = card.querySelector('.badge-cooldown');
          if (badge) {
            badge.className = 'badge badge-online';
            badge.innerHTML = 'En Línea';
          }
        }
      }
    });
  }

  updateTimers();
  window._cooldownInterval = setInterval(updateTimers, 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// initCameraModals — Crea, edita, token display
// ─────────────────────────────────────────────────────────────────────────────

function initCameraModals() {
  // ── MODAL CREAR ──
  const btnNueva        = document.getElementById('btn-nueva-camara');
  const modalCrear      = document.getElementById('camara-modal');
  const btnCloseCrear   = document.getElementById('camara-modal-close');
  const btnCancelarCrear= document.getElementById('camara-btn-cancelar');
  const formCrear       = document.getElementById('camara-form');
  const errorCrear      = document.getElementById('camara-form-error');

  // ── MODAL TOKEN ──
  const modalToken      = document.getElementById('token-modal');
  const btnCopiar       = document.getElementById('token-btn-copiar');
  const btnCerrarToken  = document.getElementById('token-btn-cerrar');
  const tokenDisplay    = document.getElementById('token-display');

  // ── MODAL EDITAR ──
  const modalEditar     = document.getElementById('editar-camara-modal');
  const btnCloseEditar  = document.getElementById('editar-camara-close');
  const btnCancelarEdit = document.getElementById('editar-camara-cancelar');
  const formEditar      = document.getElementById('editar-camara-form');
  const errorEditar     = document.getElementById('editar-camara-error');

  const cerrarCrear  = () => { modalCrear.classList.remove('active');  formCrear.reset(); };
  const cerrarToken  = () => { modalToken.classList.remove('active');  };
  const cerrarEditar = () => { modalEditar.classList.remove('active'); formEditar.reset(); };

  // Abrir modal de creación
  if (btnNueva) {
    btnNueva.addEventListener('click', () => {
      formCrear.reset();
      if (errorCrear) errorCrear.style.display = 'none';
      modalCrear.classList.add('active');
    });
  }

  if (btnCloseCrear)    btnCloseCrear.addEventListener('click', cerrarCrear);
  if (btnCancelarCrear) btnCancelarCrear.addEventListener('click', cerrarCrear);
  if (modalCrear) modalCrear.addEventListener('click', (e) => { if (e.target === modalCrear) cerrarCrear(); });

  // Submit crear cámara
  if (formCrear) {
    formCrear.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorCrear) errorCrear.style.display = 'none';

      const ubicacion = document.getElementById('cam-ubicacion').value.trim();
      const latitud   = parseFloat(document.getElementById('cam-lat').value);
      const longitud  = parseFloat(document.getElementById('cam-lng').value);
      const zonaId    = document.getElementById('cam-zona').value;
      const desc      = document.getElementById('cam-descripcion').value.trim();

      if (!ubicacion || isNaN(latitud) || isNaN(longitud) || !zonaId || !desc) {
        showToast('Completá zona, dirección y descripción. Usá el botón Localizar para confirmar las coordenadas.', 'warning');
        return;
      }

      const btn = document.getElementById('camara-btn-guardar');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Creando...';

      try {
        const res = await requestAPI('/api/camaras', {
          method: 'POST',
          body: JSON.stringify({
            ubicacion,
            latitud,
            longitud,
            descripcion: desc,
            zona_id:     parseInt(zonaId)
          })
        });

        cerrarCrear();

        // Mostrar el token generado al admin
        if (tokenDisplay) tokenDisplay.textContent = res.token_api || 'Error: token no recibido';
        modalToken.classList.add('active');

        loadCameras();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error al crear la cámara.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
  }

  // Copiar token al portapapeles
  if (btnCopiar) {
    btnCopiar.addEventListener('click', () => {
      const token = tokenDisplay ? tokenDisplay.textContent : '';
      if (!token) return;
      navigator.clipboard.writeText(token).then(() => {
        const orig = btnCopiar.textContent;
        btnCopiar.textContent = '✅ ¡Copiado!';
        setTimeout(() => { btnCopiar.textContent = orig; }, 2000);
      }).catch(() => {
        // Fallback para navegadores sin clipboard API
        const ta = document.createElement('textarea');
        ta.value = token;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btnCopiar.textContent = '✅ ¡Copiado!';
        setTimeout(() => { btnCopiar.textContent = '📋 Copiar Token'; }, 2000);
      });
    });
  }

  if (btnCerrarToken) btnCerrarToken.addEventListener('click', cerrarToken);
  if (modalToken) modalToken.addEventListener('click', (e) => { if (e.target === modalToken) cerrarToken(); });

  // Cerrar modal editar
  if (btnCloseEditar)   btnCloseEditar.addEventListener('click', cerrarEditar);
  if (btnCancelarEdit)  btnCancelarEdit.addEventListener('click', cerrarEditar);
  if (modalEditar) modalEditar.addEventListener('click', (e) => { if (e.target === modalEditar) cerrarEditar(); });

  // Submit editar cámara
  if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorEditar) errorEditar.style.display = 'none';

      const id        = document.getElementById('edit-cam-id').value;
      const ubicacion = document.getElementById('edit-cam-ubicacion').value.trim();
      const latStr    = document.getElementById('edit-cam-lat').value;
      const lngStr    = document.getElementById('edit-cam-lng').value;
      const zonaId    = document.getElementById('edit-cam-zona').value;
      const desc      = document.getElementById('edit-cam-descripcion').value.trim();

      const body = { ubicacion };
      if (desc)      body.descripcion = desc;
      if (zonaId)    body.zona_id     = parseInt(zonaId);
      if (latStr)    body.latitud     = parseFloat(latStr);
      if (lngStr)    body.longitud    = parseFloat(lngStr);

      const btn = document.getElementById('editar-camara-guardar');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Guardando...';

      try {
        await requestAPI(`/api/camaras/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body)
        });
        cerrarEditar();
        loadCameras();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error al actualizar la cámara.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// openEditCameraModal — Precarga los datos para edición
// ─────────────────────────────────────────────────────────────────────────────

async function openEditCameraModal(id) {
  const modal = document.getElementById('editar-camara-modal');
  const error = document.getElementById('editar-camara-error');
  if (!modal) return;

  if (error) error.style.display = 'none';

  try {
    const cam = await requestAPI(`/api/camaras/${id}`);

    document.getElementById('edit-cam-id').value          = cam.id;
    document.getElementById('edit-cam-ubicacion').value   = cam.ubicacion || '';
    document.getElementById('edit-cam-descripcion').value = cam.descripcion || '';
    document.getElementById('edit-cam-zona').value        = cam.zona_id || '';

    // Si la cámara tiene coordenadas, mostrar el mapa precargado
    if (cam.latitud !== null && cam.longitud !== null && window._geocoderEditar) {
      // Limpiar hidden antes de precarga
      document.getElementById('edit-cam-lat').value = '';
      document.getElementById('edit-cam-lng').value = '';
      setTimeout(() => window._geocoderEditar.setLocation(cam.latitud, cam.longitud), 50);
    }

    modal.classList.add('active');
  } catch (err) {
    console.error('Error al cargar datos de cámara:', err);
    showToast(`No se pudieron cargar los datos: ${err.message}`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmDeleteCamera — Desactiva una cámara con confirmación
// ─────────────────────────────────────────────────────────────────────────────

async function confirmDeleteCamera(id) {
  const ok = confirm(`¿Desactivar la Cámara #${id}? Conservará su historial de alertas.`);
  if (!ok) return;

  try {
    const res = await requestAPI(`/api/camaras/${id}`, { method: 'DELETE' });
    showToast(res.mensaje || 'Cámara desactivada correctamente.', 'success');
    loadCameras();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error al desactivar la cámara.', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/** Convierte 'YYYY-MM-DD HH:MM:SS' a 'DD/MM HH:MM' */
function formatDateTime(dateStr) {
  try {
    const parts = dateStr.split(/[- :]/);
    if (parts.length < 5) return dateStr;
    return `${parts[2]}/${parts[1]} ${parts[3]}:${parts[4]}`;
  } catch (e) {
    return dateStr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// showToast — Muestra una notificación flotante con el estilo del sistema
// type: 'error' | 'success' | 'warning' | 'info'
// ─────────────────────────────────────────────────────────────────────────────

function showToast(message, type = 'error') {
  // Inyectar estilos la primera vez
  if (!document.getElementById('tf-toast-styles')) {
    const s = document.createElement('style');
    s.id = 'tf-toast-styles';
    s.textContent = `
      #tf-toast-container {
        position: fixed; top: 24px; right: 24px; z-index: 99999;
        display: flex; flex-direction: column; gap: 10px;
        max-width: 380px; pointer-events: none;
      }
      .tf-toast {
        pointer-events: all;
        display: flex; align-items: flex-start; gap: 12px;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid var(--color-border, #2a2a3e);
        background: var(--color-bg-card, #1a1a2e);
        box-shadow: 0 8px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04);
        animation: tfSlideIn .28s cubic-bezier(.22,1,.36,1) both;
        backdrop-filter: blur(12px);
      }
      .tf-toast.removing {
        animation: tfSlideOut .22s ease forwards;
      }
      .tf-toast-icon {
        width: 24px; height: 24px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 1px;
      }
      .tf-toast-msg {
        flex: 1; font-size: 13px; line-height: 1.55;
        color: var(--color-text-primary, #e2e8f0);
        font-family: inherit;
      }
      .tf-toast-close {
        background: none; border: none; cursor: pointer; padding: 0;
        color: var(--color-text-muted, #64748b); font-size: 15px;
        line-height: 1; flex-shrink: 0; transition: color .15s;
      }
      .tf-toast-close:hover { color: var(--color-text-primary, #e2e8f0); }
      @keyframes tfSlideIn {
        from { transform: translateX(110%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes tfSlideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(110%); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  // Crear o reusar el contenedor
  let container = document.getElementById('tf-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tf-toast-container';
    document.body.appendChild(container);
  }

  const palette = {
    error:   { border: '#f87171', bg: 'rgba(248,113,113,.12)', text: '#f87171', icon: '✕' },
    success: { border: '#4ade80', bg: 'rgba(74,222,128,.12)', text: '#4ade80', icon: '✓' },
    warning: { border: '#fbbf24', bg: 'rgba(251,191,36,.12)',  text: '#fbbf24', icon: '⚠' },
    info:    { border: '#38bdf8', bg: 'rgba(56,189,248,.12)',  text: '#38bdf8', icon: 'ℹ' }
  };
  const p = palette[type] || palette.error;

  const toast = document.createElement('div');
  toast.className = 'tf-toast';
  toast.style.borderLeftColor = p.border;
  toast.style.borderLeftWidth = '3px';
  toast.innerHTML = `
    <div class="tf-toast-icon" style="background:${p.bg};border:1.5px solid ${p.border};color:${p.text};">${p.icon}</div>
    <div class="tf-toast-msg">${message}</div>
    <button class="tf-toast-close" aria-label="Cerrar">×</button>
  `;

  const dismiss = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 230);
  };
  toast.querySelector('.tf-toast-close').addEventListener('click', dismiss);

  container.appendChild(toast);
  setTimeout(dismiss, 5500);
}

// ─────────────────────────────────────────────────────────────────────────────
// initGeocoder — Inicializa el buscador de dirección + mapa Leaflet para un modal
// Parámetros:
//   inputId      — id del <input> de dirección
//   btnId        — id del botón "Localizar"
//   latHiddenId  — id del <input type="hidden"> de latitud
//   lngHiddenId  — id del <input type="hidden"> de longitud
//   previewId    — id del div de vista previa (hidden por defecto)
//   mapaId       — id del div donde se renderiza el mapa Leaflet
//   coordsId     — id del span que muestra las coords al usuario
//   zonaSelectId — id del <select> de zona (oculto, se actualiza automáticamente)
//   zonaBadgeId  — id del span que muestra la zona detectada al usuario
// ─────────────────────────────────────────────────────────────────────────────

function initGeocoder({ inputId, btnId, latHiddenId, lngHiddenId, previewId, mapaId, coordsId, zonaSelectId, zonaBadgeId }) {
  const btn     = document.getElementById(btnId);
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const coords  = document.getElementById(coordsId);
  if (!btn || !input || !preview) return null;

  let leafletMap = null;
  let marker     = null;

  function updateHidden(lat, lng) {
    document.getElementById(latHiddenId).value = lat;
    document.getElementById(lngHiddenId).value = lng;
    if (coords) coords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function showMap(lat, lng) {
    preview.classList.remove('hidden');

    if (!leafletMap) {
      if (!window.L) { console.warn('Leaflet no disponible'); return; }
      leafletMap = L.map(mapaId, { zoomControl: true, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(leafletMap);
    }

    if (marker) { marker.setLatLng([lat, lng]); }
    else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap);
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        updateHidden(pos.lat, pos.lng);

        // Geocodificación inversa: actualizar dirección y zona al mover el pin
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&addressdetails=1`;
          const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
          const data = await resp.json();
          if (data && data.address) {
            const a = data.address;
            const partes = [
              a.road,
              a.house_number,
              a.suburb || a.neighbourhood || a.city_district,
              a.city   || a.town          || a.municipality
            ].filter(Boolean);
            input.value = partes.join(', ') || data.display_name || input.value;
            autoSetZona(data.address, zonaSelectId, zonaBadgeId);
          }
        } catch (e) {
          console.warn('[TrashFlow] Reverse geocode error al arrastrar pin:', e);
        }
      });
    }

    leafletMap.setView([lat, lng], 16);
    // Leaflet necesita que el contenedor esté visible para calcular el tamaño
    setTimeout(() => leafletMap.invalidateSize(), 120);
    updateHidden(lat, lng);
  }

  btn.addEventListener('click', async () => {
    const direccion = input.value.trim();
    if (!direccion) { input.focus(); return; }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
      // addressdetails=1 devuelve el desglose del domicilio (barrio, localidad, etc.)
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(direccion)}`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const results = await resp.json();

      if (!results || results.length === 0) {
        showToast('No se encontró la dirección. Intentá ser más específico (incluí ciudad y provincia).', 'warning');
        return;
      }

      const { lat, lon, address } = results[0];
      showMap(parseFloat(lat), parseFloat(lon));

      if (address) {
        autoSetZona(address, zonaSelectId, zonaBadgeId);
      }
    } catch (e) {
      console.error('Error al geocodificar:', e);
      showToast('No se pudo obtener la ubicación. Verificá tu conexión a internet.', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  // Reset: limpia el mapa y desbloquea el select de zona
  input.closest('form')?.addEventListener('reset', () => {
    preview.classList.add('hidden');
    document.getElementById(latHiddenId).value = '';
    document.getElementById(lngHiddenId).value = '';
    if (coords) coords.textContent = '';
    if (marker) { marker.remove(); marker = null; }
    // Restaurar el select de zona a editable y vacío
    const zonaSelect = document.getElementById(zonaSelectId);
    if (zonaSelect) {
      zonaSelect.value = '';
      zonaSelect.style.pointerEvents = '';
      zonaSelect.style.opacity = '';
      zonaSelect.title = '';
    }
    const badge = badgeId ? document.getElementById(badgeId) : null;
    if (badge) badge.textContent = '';
  });

  return {
    // Precarga de coordenadas desde fuera (usado al abrir modal editar)
    setLocation(lat, lng) { showMap(lat, lng); }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// autoSetZona — Detecta la zona a partir del address object de Nominatim
// y la selecciona automáticamente en el <select> indicado.
// ─────────────────────────────────────────────────────────────────────────────

function autoSetZona(address, selectId, badgeId) {
  const zonaMap = [
    { id: '1', nombre: 'Centro',         keywords: ['centro', 'vicente lópez centro'] },
    { id: '2', nombre: 'Olivos',         keywords: ['olivos'] },
    { id: '3', nombre: 'La Lucila',      keywords: ['la lucila', 'lucila'] },
    { id: '4', nombre: 'Munro',          keywords: ['munro'] },
    { id: '5', nombre: 'Villa Martelli', keywords: ['villa martelli', 'martelli'] },
    { id: '6', nombre: 'Florida',        keywords: ['florida'] },
    { id: '7', nombre: 'Carapachay',     keywords: ['carapachay'] }
  ];

  const candidatos = [
    address.suburb,
    address.neighbourhood,
    address.city_district,
    address.quarter,
    address.village,
    address.town,
    address.county
  ].filter(Boolean).map(s => s.toLowerCase());

  const select = document.getElementById(selectId);
  const badge  = badgeId ? document.getElementById(badgeId) : null;
  if (!select) return;

  for (const candidato of candidatos) {
    for (const zona of zonaMap) {
      if (zona.keywords.some(kw => candidato.includes(kw))) {
        // ── Zona detectada: asignar y bloquear el select ──
        select.value = zona.id;
        select.style.pointerEvents = 'none';
        select.style.opacity = '0.75';
        select.title = 'Zona detectada automáticamente según la dirección. Relocalizá para cambiarla.';
        if (badge) {
          badge.textContent = `✅ Zona detectada: ${zona.nombre}`;
          badge.style.color = 'var(--accent-teal)';
        }
        console.log(`[TrashFlow] Zona autodetectada: "${candidato}" → ${zona.nombre}`);
        return;
      }
    }
  }

  // ── Zona NO detectada: dejar el select libre para selección manual ──
  select.value = '';
  select.style.pointerEvents = '';
  select.style.opacity = '';
  select.title = '';
  if (badge) {
    badge.textContent = '⚠️ Zona no detectada — seleccioná manualmente';
    badge.style.color = 'var(--color-warning, orange)';
  }
  console.log('[TrashFlow] Zona no detectada automáticamente. Campos recibidos:', candidatos);
}
