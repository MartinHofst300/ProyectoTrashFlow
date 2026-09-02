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
// loadCameras — Carga y renderiza las tarjetas de cámara
// ─────────────────────────────────────────────────────────────────────────────

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
      card.className = 'card camera-card';

      // ── Estado: usar el campo estado de la DB + umbral de 90s para heartbeat ──
      let badgeClass = 'badge-offline';
      let badgeText  = 'Desconectado';

      if (camara.estado === 'mantenimiento') {
        badgeClass = 'badge-mantenimiento';
        badgeText  = 'Mantenimiento';
      } else if (camara.estado === 'online' && camara.ultima_conexion) {
        // Umbral: 90 segundos (3 ciclos de heartbeat de 30s)
        const lastConn   = new Date(camara.ultima_conexion.replace(/-/g, '/'));
        const diffSecs   = (new Date() - lastConn) / 1000;
        if (diffSecs <= 90) {
          badgeClass = 'badge-online';
          badgeText  = 'En Línea';
        }
      }

      const ultimaConexion = camara.ultima_conexion
        ? formatDateTime(camara.ultima_conexion)
        : 'Nunca conectado';

      card.innerHTML = `
        <div class="camera-card-header">
          <div class="camera-title-group">
            <h3 class="camera-card-title">
              <span style="font-size:12px; font-weight:500; color:var(--color-text-secondary); margin-right:6px; font-family:monospace;">#${camara.id}</span>${escapeHTML(camara.nombre)}
            </h3>
            <div class="camera-card-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHTML(camara.ubicacion)}</span>
            </div>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
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
                  onclick="confirmDeleteCamera(${camara.id}, '${escapeHTML(camara.nombre)}')"
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

      const nombre    = document.getElementById('cam-nombre').value.trim();
      const ubicacion = document.getElementById('cam-ubicacion').value.trim();
      const latitud   = parseFloat(document.getElementById('cam-lat').value);
      const longitud  = parseFloat(document.getElementById('cam-lng').value);
      const zonaId    = document.getElementById('cam-zona').value;
      const desc      = document.getElementById('cam-descripcion').value.trim();

      if (!nombre || !ubicacion || isNaN(latitud) || isNaN(longitud)) {
        if (errorCrear) {
          errorCrear.textContent = '⚠️ Completá nombre y ubicación, y usá el botón Localizar para confirmar las coordenadas.';
          errorCrear.style.display = 'block';
        }
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
            nombre,
            ubicacion,
            latitud,
            longitud,
            descripcion: desc || null,
            zona_id:     zonaId ? parseInt(zonaId) : null
          })
        });

        cerrarCrear();

        // Mostrar el token generado al admin
        if (tokenDisplay) tokenDisplay.textContent = res.token_api || 'Error: token no recibido';
        modalToken.classList.add('active');

        loadCameras();
      } catch (err) {
        console.error(err);
        if (errorCrear) {
          errorCrear.textContent = `⚠️ ${err.message || 'Error al crear la cámara'}`;
          errorCrear.style.display = 'block';
        }
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

      const id         = document.getElementById('edit-cam-id').value;
      const nombre     = document.getElementById('edit-cam-nombre').value.trim();
      const ubicacion  = document.getElementById('edit-cam-ubicacion').value.trim();
      const latStr     = document.getElementById('edit-cam-lat').value;
      const lngStr     = document.getElementById('edit-cam-lng').value;
      const zonaId     = document.getElementById('edit-cam-zona').value;
      const desc       = document.getElementById('edit-cam-descripcion').value.trim();

      const body = { nombre, ubicacion };
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
        if (errorEditar) {
          errorEditar.textContent = `⚠️ ${err.message || 'Error al actualizar la cámara'}`;
          errorEditar.style.display = 'block';
        }
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
    document.getElementById('edit-cam-nombre').value      = cam.nombre || '';
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
    alert(`No se pudieron cargar los datos de la cámara: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmDeleteCamera — Desactiva una cámara con confirmación
// ─────────────────────────────────────────────────────────────────────────────

async function confirmDeleteCamera(id, nombre) {
  const ok = confirm(`¿Desactivar la cámara "${nombre}"? Conservará su historial de alertas.`);
  if (!ok) return;

  try {
    const res = await requestAPI(`/api/camaras/${id}`, { method: 'DELETE' });
    alert(res.mensaje || 'Cámara desactivada.');
    loadCameras();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Error al desactivar la cámara.');
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
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateHidden(pos.lat, pos.lng);
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
        alert('No se encontró la dirección. Intentá ser más específico (incluí ciudad y provincia).');
        return;
      }

      const { lat, lon, address } = results[0];
      showMap(parseFloat(lat), parseFloat(lon));

      // Autodetectar zona a partir del desglose de dirección de Nominatim
      if (address) {
        autoSetZona(address, zonaSelectId, zonaBadgeId);
      }
    } catch (e) {
      console.error('Error al geocodificar:', e);
      alert('No se pudo obtener la ubicación. Verificá tu conexión a internet.');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  // Reset: limpia el mapa cuando se resetea el formulario
  input.closest('form')?.addEventListener('reset', () => {
    preview.classList.add('hidden');
    document.getElementById(latHiddenId).value = '';
    document.getElementById(lngHiddenId).value = '';
    if (coords) coords.textContent = '';
    if (marker) { marker.remove(); marker = null; }
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
  // Tabla de mapeo: keywords (lowercase) → { id, nombre }
  const zonaMap = [
    { id: '1', nombre: 'Centro',        keywords: ['centro', 'vicente lópez centro'] },
    { id: '2', nombre: 'Olivos',        keywords: ['olivos'] },
    { id: '3', nombre: 'La Lucila',     keywords: ['la lucila', 'lucila'] },
    { id: '4', nombre: 'Munro',         keywords: ['munro'] },
    { id: '5', nombre: 'Villa Martelli',keywords: ['villa martelli', 'martelli'] },
    { id: '6', nombre: 'Florida',       keywords: ['florida'] },
    { id: '7', nombre: 'Carapachay',    keywords: ['carapachay'] }
  ];

  // Nominatim puede devolver la zona en distintos campos según cómo esté cargado OSM
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
        select.value = zona.id;
        // Mostrar zona detectada en el badge visual
        if (badge) {
          badge.textContent = `📍 Zona: ${zona.nombre}`;
          badge.style.color = 'var(--accent-teal)';
        }
        console.log(`[TrashFlow] Zona autodetectada: "${candidato}" → ${zona.nombre}`);
        return;
      }
    }
  }

  // No se detectó zona: limpiar badge
  if (badge) badge.textContent = '';
  console.log('[TrashFlow] Zona no detectada automáticamente. Campos recibidos:', candidatos);
}
