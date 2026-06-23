/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: camaras.js
 * Descripción: Controla la visualización del listado de cámaras fijas (camaras.html)
 *              instaladas en la vía pública. Carga la información de rendimiento de cada
 *              dispositivo (número total de detecciones de basura, estado de conexión
 *              y última fecha de actividad) mapeando las respuestas a tarjetas interactivas.
 * 
 * Dependencias:
 *   - config.js (Usa requestAPI y escapeHTML)
 * 
 * Expone:
 *   - loadCameras(): Obtiene los dispositivos del servidor y los renderiza.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadCameras(); // Dispara la carga de cámaras al cargar el documento
});

/**
 * Obtiene los dispositivos de videovigilancia registrados desde la API
 * y genera tarjetas informativas con shimmers y clases estilizadas según el estado.
 */
async function loadCameras() {
  const container = document.getElementById('camaras-container');
  if (!container) return;

  try {
    const data = await requestAPI('/api/camaras');
    
    // Remueve shimmers (esqueletos de carga)
    container.innerHTML = '';

    // Maneja caso sin dispositivos registrados
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <h3>No hay cámaras registradas</h3>
          <p>No se encontraron dispositivos de visión artificial en el sistema.</p>
        </div>
      `;
      return;
    }

    // Recorre y crea una tarjeta por cada dispositivo
    data.forEach(camara => {
      const card = document.createElement('div');
      card.className = 'card camera-card';

      // Define colores visuales (clases CSS) según la conectividad del dispositivo
      let badgeClass = 'badge-offline';
      let badgeText = 'Desconectada';
      if (camara.estado === 'online') {
        badgeClass = 'badge-online';
        badgeText = 'En Línea';
      } else if (camara.estado === 'mantenimiento') {
        badgeClass = 'badge-mantenimiento';
        badgeText = 'Mantenimiento';
      }

      // Formatea la última fecha en que la cámara reportó transmisión
      const ultimaConexion = camara.ultima_conexion 
        ? formatDateTime(camara.ultima_conexion) 
        : 'Nunca conectado';

      card.innerHTML = `
        <div class="camera-card-header">
          <div class="camera-title-group">
            <h3 class="camera-card-title">${escapeHTML(camara.nombre)}</h3>
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
        <div class="camera-card-actions" style="margin-top: 15px; display: flex; justify-content: flex-end;">
          <a href="alertas.html?camara_id=${camara.id}" class="btn btn-secondary" style="width: 100%; text-align: center; text-decoration: none; display: inline-block;">Ver Alertas</a>
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

// Limpia caracteres HTML especiales para evitar inyecciones XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Formatea fecha del formato de base de datos MySQL (YYYY-MM-DD HH:MM:SS) a DD/MM HH:MM
function formatDateTime(dateStr) {
  try {
    const parts = dateStr.split(/[- :]/);
    if (parts.length < 5) return dateStr;
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const hour = parts[3];
    const minute = parts[4];
    return `${day}/${month} ${hour}:${minute}`;
  } catch (e) {
    return dateStr;
  }
}
