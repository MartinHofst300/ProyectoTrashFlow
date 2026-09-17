/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: mapa.js
 * Descripción: Controla el funcionamiento del mapa interactivo geoespacial (mapa.html).
 *              Inicializa Leaflet.js para renderizar calles y coordenadas de Vicente López,
 *              crea grupos de clusters dinámicos (para agrupar pines cercanos), implementa
 *              los filtros flotantes por estado y zona, y programa un refresco periódico
 *              de geolocalizaciones en segundo plano.
 * 
 * Dependencias:
 *   - config.js (Usa requestAPI y BASE_URL)
 *   - Leaflet.js (Biblioteca cartográfica externa)
 *   - Leaflet.markercluster (Extensión de Leaflet para agrupar marcadores superpuestos)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Validación de seguridad básica en el cliente
  const token = localStorage.getItem('trashflow_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Carga complementaria del estado del menú lateral
  loadPendingBadge();

  // Inicializa el objeto Mapa de Leaflet apuntando a un elemento con id 'map'.
  // Las coordenadas centran el mapa en el partido de Vicente López, Buenos Aires.
  const map = L.map('map').setView([-34.525, -58.473], 13);

  // Agrega la capa de mosaicos (tiles) de OpenStreetMap. Esto proporciona el dibujo de las calles.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Mapeo oficial de colores por zona municipal (Centro en Rojo #EF4444 según pedido)
  const ZONE_COLORS = {
    1: '#EF4444', // Zona 1 - Centro (Rojo)
    2: '#F5A623', // Zona 2 - Olivos (Ámbar / Naranja)
    3: '#3B82F6', // Zona 3 - La Lucila (Azul)
    4: '#10B981', // Zona 4 - Munro (Verde)
    5: '#8B5CF6', // Zona 5 - Villa Martelli (Violeta)
    6: '#EC4899', // Zona 6 - Florida (Rosa)
    7: '#F97316'  // Zona 7 - Carapachay (Naranja vibrante)
  };

  function getZonaColor(alerta) {
    const zId = Number(alerta.zona_id);
    if (zId && ZONE_COLORS[zId]) return ZONE_COLORS[zId];
    
    const zName = (alerta.zona || '').trim().toLowerCase();
    if (zName.includes('centro')) return '#EF4444';
    if (zName.includes('olivos')) return '#F5A623';
    if (zName.includes('lucila')) return '#3B82F6';
    if (zName.includes('munro')) return '#10B981';
    if (zName.includes('martelli')) return '#8B5CF6';
    if (zName.includes('florida')) return '#EC4899';
    if (zName.includes('carapachay')) return '#F97316';

    if (alerta.zona_color && alerta.zona_color !== '#3B82F6') return alerta.zona_color;
    return '#60B7BA';
  }

  // Inicializa el agrupador de marcadores (Marker Cluster Group) con estilos inteligentes según zona
  const markersCluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,      // Al hacer clic en un clúster al zoom máximo, despliega los pines en abanico
    showCoverageOnHover: false,    // Oculta el polígono de cobertura al pasar el mouse por encima
    zoomToBoundsOnClick: true,    // Centra y hace zoom automáticamente al pulsar un clúster
    iconCreateFunction: function (cluster) {
      const markers = cluster.getAllChildMarkers();
      const count = markers.length;

      // Evalúa los colores de zona presentes en este grupo para teñir el clúster coherentemente
      const colorCounts = {};
      markers.forEach(m => {
        const c = m.zonaColor || '#60B7BA';
        colorCounts[c] = (colorCounts[c] || 0) + 1;
      });

      let predominantColor = '#60B7BA';
      let maxCount = 0;
      for (const [col, num] of Object.entries(colorCounts)) {
        if (num > maxCount) {
          maxCount = num;
          predominantColor = col;
        }
      }

      return L.divIcon({
        html: `<div style="background-color: ${predominantColor}; box-shadow: 0 0 0 4px ${predominantColor}40;"><span>${count}</span></div>`,
        className: 'marker-cluster marker-cluster-zone',
        iconSize: L.point(48, 48)
      });
    }
  });
  map.addLayer(markersCluster);

  // Array en memoria para rastrear y filtrar los marcadores activos
  let allAlertMarkers = [];

  // Referencias a los componentes de la interfaz de filtros
  const filterCheckboxes = document.querySelectorAll('.filter-status');
  const filterZonaSelect = document.getElementById('filter-zona');
  const visibleCounter = document.getElementById('visible-counter');
  const filtersPanel = document.getElementById('filters-panel');
  const toggleFiltersBtn = document.getElementById('toggle-filters-btn');

  // Alterna el estado colapsado/minimizado del panel flotante de filtros en el mapa
  let reopenBtn = null;
  toggleFiltersBtn.addEventListener('click', () => {
    filtersPanel.classList.add('collapsed');
    
    // Si se colapsa, crea dinámicamente un pequeño botón flotante para reabrir los filtros
    reopenBtn = document.createElement('button');
    reopenBtn.className = 'reopen-filters-btn';
    reopenBtn.id = 'reopen-filters-btn';
    reopenBtn.title = 'Mostrar filtros';
    reopenBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
    `;
    
    document.querySelector('.map-view-container').appendChild(reopenBtn);
    
    // Escucha el clic en el botón de reapertura
    reopenBtn.addEventListener('click', () => {
      filtersPanel.classList.remove('collapsed');
      reopenBtn.remove();
      reopenBtn = null;
    });
  });

  /**
   * Filtra en caliente los marcadores cargados en base a las opciones seleccionadas.
   * Remueve y agrega marcadores al cluster sin volver a consultar al servidor backend.
   */
  function applyFilters() {
    // Obtiene una lista de los estados marcados en el panel de checkboxes
    const selectedStatuses = Array.from(filterCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const selectedZona = filterZonaSelect.value;
    let visibleCount = 0;

    // Limpia todos los marcadores actualmente renderizados en el mapa
    markersCluster.clearLayers();

    // Evalúa cada marcador guardado en memoria
    allAlertMarkers.forEach(item => {
      // Normaliza estados para concordar con los valores del checkbox
      let statusVal = item.status.toLowerCase();
      if (statusVal === 'en proceso' || statusVal === 'en_proceso' || statusVal === 'asignada') {
        statusVal = 'alertada';
      }
      const statusMatch = selectedStatuses.includes(statusVal);
      
      const zonaMatch = (selectedZona === 'todas') || (String(item.zonaId) === selectedZona);

      // Si cumple con ambos filtros, lo reactiva en el agrupador cartográfico
      if (statusMatch && zonaMatch) {
        markersCluster.addLayer(item.marker);
        visibleCount++;
      }
    });

    // Actualiza el indicador textual de alertas visibles
    visibleCounter.textContent = `${visibleCount} alertas visibles`;
  }

  // Escuchadores de eventos para aplicar filtros instantáneos
  filterCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
  filterZonaSelect.addEventListener('change', applyFilters);

  /**
   * Obtiene la ubicación geoespacial de las últimas 200 alertas desde la API
   * y las dibuja en el mapa con colores identificadores de estado y zona.
   * 
   * @param {boolean} isBackground - Si es 'true', actualiza marcadores de forma silenciosa.
   */
  async function fetchAndRenderAlerts(isBackground = false) {
    try {
      const data = await requestAPI('/api/alertas?per_page=200');
      const alerts = data.alertas || [];

      // Identifica si hay alguna tarjeta/globo emergente (popup) abierto para no cerrarlo abruptamente en el refresco
      let openPopupAlertId = null;
      allAlertMarkers.forEach(item => {
        if (item.marker.getPopup() && item.marker.getPopup().isOpen()) {
          openPopupAlertId = item.id;
        }
      });

      // Limpia la caché local y el agrupador del mapa
      allAlertMarkers = [];
      markersCluster.clearLayers();
      
      alerts.forEach(alerta => {
        const lat = alerta.latitud;
        const lng = alerta.longitud;
        if (!lat || !lng) return; // Si la alerta no posee coordenadas, la omite

        // Colores temáticos vibrantes según el estado para una interfaz premium
        let status_color = '#9E9E9E';
        let estadoLabel = alerta.estado.toUpperCase();
        const estadoLower = alerta.estado.toLowerCase();
        if (estadoLower === 'pendiente') {
          status_color = '#FF1E27'; // Rojo de atención
          estadoLabel = 'PENDIENTE';
        } else if (estadoLower === 'en proceso' || estadoLower === 'en_proceso' || estadoLower === 'asignada' || estadoLower === 'alertada') {
          status_color = '#F5A623'; // Ámbar Alertada
          estadoLabel = 'ALERTADA';
        } else if (estadoLower === 'resuelta') {
          status_color = '#10B981'; // Verde resuelto
          estadoLabel = 'RESUELTA';
        } else if (estadoLower === 'descartada') {
          status_color = '#6B7280'; // Gris descarte
          estadoLabel = 'DESCARTADA';
        }

        const zona_color = getZonaColor(alerta);

        // Cada puntito (marcador) lleva el color de la zona en la que está (ej. Centro = Rojo)
        const estado_class = estadoLower.replace(/\s+/g, '_');
        const markerClass = `map-marker map-marker-${estado_class}`;
        const markerIcon = L.divIcon({
          className: markerClass,
          html: `<div class="marker-pin" style="background-color: ${zona_color}; border: 2.5px solid #ffffff;"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        
        // Instancia el marcador cartográfico y anota el estado y zona para el clúster
        const marker = L.marker([lat, lng], { icon: markerIcon });
        marker.alertStatus = alerta.estado;
        marker.zonaColor = zona_color;

        // Prepara el popup enriquecido con imagen, estado, zona y fecha de detección
        const thumbUrl = resolveFotoUrl(alerta.foto);
        
        const popupContent = `
          <div class="map-popup-card">
            <div class="map-popup-img-container">
              <img src="${thumbUrl}" class="map-popup-img" onerror="this.onerror=null;this.src=getFotoPlaceholder()">
            </div>
            <div class="map-popup-info">
              <h3 class="map-popup-address" title="${alerta.direccion}">${alerta.direccion}</h3>
              <div class="map-popup-badges">
                <span class="map-popup-badge" style="background-color: ${status_color};">${estadoLabel}</span>
                <span class="map-popup-badge map-popup-badge-zona"><span class="map-popup-zona-dot" style="background-color: ${zona_color};"></span>Zona: ${alerta.zona}</span>
              </div>
              <div class="map-popup-meta">
                <span>Reportado: <strong>${formatDateTime(alerta.fecha)}</strong></span>
              </div>
              <a href="alertas.html?alerta_id=${alerta.id}" class="map-popup-action-btn">Ver detalle</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Agrega el marcador estructurado al listado
        allAlertMarkers.push({
          id: alerta.id,
          marker: marker,
          status: alerta.estado,
          zonaId: alerta.zona_id
        });
      });

      // Dibuja en el mapa aplicando las configuraciones activas de los filtros
      applyFilters();

      // Si había un popup abierto antes del refresco periódico, vuelve a abrirlo automáticamente
      if (openPopupAlertId) {
        const found = allAlertMarkers.find(item => item.id === openPopupAlertId);
        if (found) {
          let statusVal = found.status.toLowerCase();
          if (statusVal === 'en proceso' || statusVal === 'en_proceso' || statusVal === 'asignada') {
            statusVal = 'alertada';
          }
          const selectedStatuses = Array.from(filterCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
          const selectedZona = filterZonaSelect.value;
          
          const statusMatch = selectedStatuses.includes(statusVal);
          const zonaMatch = (selectedZona === 'todas') || (String(found.zonaId) === selectedZona);

          if (statusMatch && zonaMatch) {
            found.marker.openPopup();
          }
        }
      }

    } catch (err) {
      console.error('Error al renderizar alertas en el mapa Leaflet:', err);
    }
  }

  // Carga inicial y refresco cada 60 segundos
  fetchAndRenderAlerts();
  setInterval(() => {
    fetchAndRenderAlerts(true);
  }, 60000);

  // Marcador del menú lateral (actualmente sin operaciones)
  async function loadPendingBadge() {
    // Reservado para futuras implementaciones
  }

  // Helper de cierre de sesión
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('trashflow_token');
      localStorage.removeItem('trashflow_rol');
      localStorage.removeItem('trashflow_user');
      window.location.href = 'login.html';
    });
  }
});

/**
 * Helper para formatear fechas a representación humanizada.
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  let iso = String(dateStr).trim();
  if (!iso.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso = iso.replace(' ', 'T') + 'Z';
  }
  const date = new Date(iso);
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
