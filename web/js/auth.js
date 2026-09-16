/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: auth.js
 * Descripción: Controla los flujos de autenticación, restricciones de acceso (Auth Guard),
 *              inicio y cierre de sesión, perfil de usuario en la interfaz y el sistema
 *              de notificaciones internas en tiempo real.
 * 
 * Dependencias:
 *   - config.js (Usa requestAPI)
 * 
 * Expone:
 *   - checkAuthGuard(): Protege las páginas para que solo accedan usuarios logueados.
 *   - logout(): Cierra la sesión activa y limpia el almacenamiento local.
 */

// Se ejecuta automáticamente al cargar el DOM de cualquier página HTML
document.addEventListener('DOMContentLoaded', () => {
  applySavedSettings();   // Aplica preferencias de accesibilidad y diseño (fuente, densidad, color)
  initSidebar();          // Renderiza el menú lateral común
  initTopbar();           // Renderiza el encabezado común
  checkAuthGuard();       // Verifica si el usuario tiene permiso para ver la página actual
  initLoginForm();        // Inicializa el formulario de inicio de sesión si existe en la página
  initNavbarUserInfo();   // Muestra las iniciales del perfil y vincula el botón de cerrar sesión
  initNotifications();    // Inicializa el sistema de notificaciones de la campana
  initCustomSelects();    // Convierte select nativos a dropdowns customizados
});

/**
 * Restringe o permite el acceso a las vistas según la existencia del token de sesión.
 * Si el usuario intenta entrar a login.html y ya está logueado, lo redirige al panel principal (dashboard.html).
 * Si intenta acceder a cualquier otra página interna sin token, lo expulsa a login.html.
 */
async function checkAuthGuard() {
  const path = window.location.pathname;
  // Determina si la página actual es la de login o la raíz del sitio
  const isLoginPage = path.includes('login.html') || path.endsWith('/') || path.endsWith('/web/');
  const token = localStorage.getItem('trashflow_token');

  if (isLoginPage) {
    // Si ya está logueado y entra a la pantalla de login, verifica validez del token
    if (token) {
      try {
        await requestAPI('/api/auth/me');
        window.location.href = 'dashboard.html'; // Redirige al panel si el token sigue vigente
      } catch (err) {
        localStorage.clear(); // Limpia almacenamiento si el token ya expiró o es inválido
      }
    }
  } else {
    // Si es una página interna y no posee token, redirige forzosamente al login
    if (!token) {
      window.location.href = 'login.html';
    }
  }
}

/**
 * Vincula la lógica interactiva al formulario de inicio de sesión de login.html.
 * Maneja la visibilidad de la contraseña y el envío de los datos en formato JSON a la API.
 */
function initLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return; // Si no estamos en la página de login, finaliza la ejecución de esta función

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const errorMsgDiv = document.getElementById('login-error');

  // Alterna la visibilidad de la contraseña (ojo abierto / ojo cerrado)
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Modifica el ícono SVG interno dinámicamente
      const eyeIcon = togglePasswordBtn.querySelector('svg');
      if (eyeIcon) {
        if (type === 'text') {
          // SVG del Ojo Abierto
          eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          `;
        } else {
          // SVG del Ojo Tachado/Cerrado
          eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          `;
        }
      }
    });
  }

  // Escucha el evento de envío del formulario
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpia mensajes de error previos
    if (errorMsgDiv) {
      errorMsgDiv.classList.add('hidden');
      errorMsgDiv.textContent = '';
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Por favor complete todos los campos.');
      return;
    }

    // Coloca el botón en estado de carga desactivándolo temporalmente
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner">Cargando...</span>';

    try {
      // Envía credenciales al Backend
      const data = await requestAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Guarda la información devuelta por la API en el localStorage del navegador
      localStorage.setItem('trashflow_token', data.token);
      localStorage.setItem('trashflow_rol', data.role);
      localStorage.setItem('trashflow_user', JSON.stringify(data.user || { email, nombre: 'Admin', iniciales: 'AD' }));

      // Valida que el rol sea administrador municipal antes de redirigir al panel principal
      if (data.role === 'admin') {
        window.location.href = 'dashboard.html';
      } else {
        throw new Error('Acceso denegado: este panel es exclusivo para administradores.');
      }
    } catch (err) {
      // Muestra el mensaje de error correspondiente y rehabilita el botón de login
      showError(err.message || 'Error al iniciar sesión. Inténtelo de nuevo.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // Helper local para renderizar el banner de error en la tarjeta de login
  function showError(msg) {
    if (errorMsgDiv) {
      errorMsgDiv.textContent = `⚠️ ${msg}`;
      errorMsgDiv.classList.remove('hidden');
    }
  }
}

/**
 * Cierre de sesión seguro: borra los tokens del navegador
 * y notifica al backend para invalidar la sesión.
 */
async function logout() {
  try {
    // Intenta enviar la petición de deslogueo de forma silenciosa
    await requestAPI('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } finally {
    // Borra localmente las variables de sesión y redirige al login
    localStorage.removeItem('trashflow_token');
    localStorage.removeItem('trashflow_rol');
    localStorage.removeItem('trashflow_user');
    window.location.href = 'login.html';
  }
}

/**
 * Carga dinámicamente las iniciales y el avatar del perfil del administrador
 * municipal logueado en la esquina superior derecha del topbar.
 */
function initNavbarUserInfo() {
  const user = JSON.parse(localStorage.getItem('trashflow_user'));
  if (!user) return;

  const userAvatar = document.querySelector('.user-avatar');
  if (userAvatar && user.iniciales) {
    userAvatar.textContent = user.iniciales; // Muestra ej: "MH"
    userAvatar.title = user.nombre || user.email;
  }

  // Vincula el botón de cerrar sesión del menú lateral (sidebar)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

/**
 * Inicializa y controla el dropdown de notificaciones internas de la barra superior.
 * Realiza consultas periódicas (polling) al backend para mantener alertas en tiempo real.
 */
async function initNotifications() {
  const bell = document.querySelector('.notification-bell');
  if (!bell) return;

  // Creamos y agregamos dinámicamente la insignia roja (badge) para las notificaciones no leídas si no existe
  let badge = bell.querySelector('.notification-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.style.display = 'none'; // oculto por defecto
    bell.appendChild(badge);
  }

  // Crea la caja flotante (dropdown) para el listado de notificaciones
  const dropdown = document.createElement('div');
  dropdown.className = 'notifications-dropdown hidden';
  dropdown.innerHTML = `
    <div class="notifications-dropdown-header">
      <h4>Notificaciones</h4>
      <button class="btn-mark-all-read" id="btn-mark-all-read">Marcar leídas</button>
    </div>
    <div class="notifications-dropdown-list" id="notifications-list">
      <div class="notification-empty">Cargando...</div>
    </div>
  `;
  bell.appendChild(dropdown);

  const listContainer = dropdown.querySelector('#notifications-list');
  const btnMarkAll = dropdown.querySelector('#btn-mark-all-read');

  /**
   * Consulta al backend las últimas alertas de cámaras de seguridad
   * y actualiza el contador/insignia visual.
   */
  async function updateBadge() {
    const token = localStorage.getItem('trashflow_token');
    if (!token) return [];
    try {
      const data = await requestAPI('/api/notificaciones');
      const unreadCount = data.filter(n => !n.leida).length;
      if (unreadCount > 0) {
        badge.style.display = 'block';
        badge.textContent = unreadCount; // Indica la cantidad sin leer
      } else {
        badge.style.display = 'none';
      }
      return data;
    } catch (err) {
      console.warn('Error al actualizar notificaciones:', err);
      return [];
    }
  }

  /**
   * Renderiza el listado HTML de notificaciones en el dropdown.
   * 
   * @param {Array} notifications - Listado de notificaciones devuelto por la API.
   */
  function renderNotifications(notifications) {
    listContainer.innerHTML = '';
    if (notifications.length === 0) {
      listContainer.innerHTML = '<div class="notification-empty">No hay notificaciones</div>';
      return;
    }

    notifications.forEach(n => {
      const item = document.createElement('div');
      item.className = `notification-item ${!n.leida ? 'unread' : ''}`;
      item.dataset.id = n.id;
      
      const timeStr = formatNotificationTime(n.creado_en);
      
      item.innerHTML = `
        <div class="notification-item-title">${escapeNotifHTML(n.titulo)}</div>
        <div class="notification-item-message">${escapeNotifHTML(n.mensaje)}</div>
        <div class="notification-item-time">${timeStr}</div>
      `;

      // Evento de clic en una notificación: la marca como leída en la base de datos
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!n.leida) {
          try {
            await requestAPI(`/api/notificaciones/${n.id}/leer`, { method: 'PATCH' });
            n.leida = 1;
            item.classList.remove('unread');
            updateBadge();
          } catch (err) {
            console.error('Error al marcar como leída:', err);
          }
        }
      });

      listContainer.appendChild(item);
    });
  }

  // Alterna la visibilidad del dropdown al hacer clic en la campana
  bell.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    
    // Cierra cualquier otro dropdown activo en la pantalla
    document.querySelectorAll('.notifications-dropdown').forEach(d => d.classList.add('hidden'));
    
    if (isHidden) {
      dropdown.classList.remove('hidden');
      listContainer.innerHTML = '<div class="notification-empty">Cargando...</div>';
      const notifications = await updateBadge();
      renderNotifications(notifications);
    } else {
      dropdown.classList.add('hidden');
    }
  });

  // Marca todas las notificaciones como leídas en lote
  btnMarkAll.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await requestAPI('/api/notificaciones/leer-todas', { method: 'PATCH' });
      dropdown.classList.add('hidden');
      updateBadge();
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
    }
  });

  // Ocultar dropdown si se hace clic en cualquier otra parte del documento
  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });

  // Evita cerrar el dropdown al hacer clic dentro de él
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  /**
   * Formatea la fecha ISO del servidor en una expresión de tiempo relativo amigable (ej: "Hace 5 min").
   */
  function formatNotificationTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `Hace ${diffHrs} hs`;
      return date.toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  }

  // Escapa caracteres HTML especiales para mitigar vulnerabilidades XSS
  function escapeNotifHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Polling automático: verifica nuevas notificaciones en el fondo cada 30 segundos
  if (localStorage.getItem('trashflow_token')) {
    updateBadge();
    setInterval(updateBadge, 30000);
  }
}

/**
 * Inicializa y renderiza la barra lateral (sidebar) dinámica común
 * para evitar redundancia y mantener una única estructura de navegación.
 */
function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const path = window.location.pathname;
  const page = path.split('/').pop() || 'dashboard.html';

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <a href="dashboard.html" class="logo-link">
        <img src="../assets/isologo.png" class="sidebar-logo-full" alt="TrashFlow Logo">
        <img src="../assets/isotipo.png" class="sidebar-logo-icon" alt="TrashFlow Icon">
      </a>
    </div>
    
    <nav class="sidebar-content">
      <a href="dashboard.html" class="sidebar-nav-link ${page === 'dashboard.html' || page === '' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
        <span class="nav-text">Panel Principal</span>
      </a>
      <a href="alertas.html" class="sidebar-nav-link ${page === 'alertas.html' || page.startsWith('alerta-detalle.html') ? 'active' : ''}">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="nav-text">Alertas</span>
      </a>
      <a href="mapa.html" class="sidebar-nav-link ${page === 'mapa.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
          <line x1="8" y1="2" x2="8" y2="18"></line>
          <line x1="16" y1="6" x2="16" y2="22"></line>
        </svg>
        <span class="nav-text">Mapa Interactivo</span>
      </a>
      <a href="camaras.html" class="sidebar-nav-link ${page === 'camaras.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span class="nav-text">Cámaras</span>
      </a>
      <a href="operadores.html" class="sidebar-nav-link ${page === 'operadores.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span class="nav-text">Operadores</span>
      </a>
      <a href="hardware.html" class="sidebar-nav-link ${page === 'hardware.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2"></rect>
          <rect x="9" y="9" width="6" height="6"></rect>
          <line x1="9" y1="1" x2="9" y2="4"></line>
          <line x1="15" y1="1" x2="15" y2="4"></line>
          <line x1="9" y1="20" x2="9" y2="23"></line>
          <line x1="15" y1="20" x2="15" y2="23"></line>
          <line x1="20" y1="9" x2="23" y2="9"></line>
          <line x1="20" y1="15" x2="23" y2="15"></line>
          <line x1="1" y1="9" x2="4" y2="9"></line>
          <line x1="1" y1="15" x2="4" y2="15"></line>
        </svg>
        <span class="nav-text">Dispositivos</span>
      </a>
      <a href="reportes.html" class="sidebar-nav-link ${page === 'reportes.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
          <line x1="2" y1="20" x2="22" y2="20"></line>
        </svg>
        <span class="nav-text">Reportes</span>
      </a>
      <a href="configuracion.html" class="sidebar-nav-link ${page === 'configuracion.html' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span class="nav-text">Configuración</span>
      </a>
    </nav>
    
    <div class="sidebar-footer">
      <a href="#" class="logout-btn" id="logout-btn" title="Cerrar Sesión">
        <svg viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        <span>Cerrar Sesión</span>
      </a>
    </div>
  `;

  // Volver a vincular la acción de logout ya que el botón fue inyectado dinámicamente
  const logoutBtn = sidebar.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

/**
 * Inicializa y unifica el subtítulo y título del encabezado (topbar) de cada vista
 * para garantizar consistencia y accesibilidad de color/contraste.
 */
function initTopbar() {
  const topbarLeft = document.querySelector('.topbar-left');
  if (!topbarLeft) return;

  const path = window.location.pathname;
  const page = path.split('/').pop() || 'dashboard.html';

  let title = 'Panel Municipal';
  let shortName = 'Panel Principal';

  if (page === 'dashboard.html' || page === '') {
    title = 'Panel Municipal';
    shortName = 'Panel Principal';
  } else if (page === 'alertas.html') {
    title = 'Registro de Alertas';
    shortName = 'Alertas';
  } else if (page === 'mapa.html') {
    title = 'Mapa Interactivo';
    shortName = 'Mapa Interactivo';
  } else if (page === 'camaras.html') {
    title = 'Dispositivos y Cámaras';
    shortName = 'Cámaras';
  } else if (page === 'operadores.html') {
    title = 'Operadores de Campo';
    shortName = 'Operadores';
  } else if (page === 'hardware.html') {
    title = 'Dispositivos de Campo';
    shortName = 'Dispositivos';
  } else if (page === 'reportes.html') {
    title = 'Reportes y Métricas';
    shortName = 'Reportes';
  } else if (page === 'configuracion.html') {
    title = 'Configuración del Sistema';
    shortName = 'Configuración';
  }

  const muniName = localStorage.getItem('trashflow_municipality_name') || 'Vicente López';

  topbarLeft.innerHTML = `
    <h1 class="topbar-title">${title}</h1>
    <div class="topbar-subtitle">
      <span>📍 ${shortName} — ${muniName}</span>
    </div>
  `;
}

/**
 * Convierte dinámicamente cualquier elemento <select> en la interfaz en un
 * componente de dropdown customizado HTML/CSS que respeta el diseño oscuro.
 */
function initCustomSelects() {
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    // Si ya fue customizado previamente, omitir
    if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-container')) {
      return;
    }

    // Ocultar select original
    select.style.display = 'none';

    // Contenedor principal del custom select
    const container = document.createElement('div');
    container.className = 'custom-select-container';
    
    // Disparador (trigger) que muestra la opción seleccionada
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const triggerText = document.createElement('span');
    triggerText.textContent = select.options[select.selectedIndex]?.text || '';
    trigger.appendChild(triggerText);
    
    // Icono de flecha
    const arrow = document.createElement('div');
    arrow.className = 'custom-select-arrow';
    arrow.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    trigger.appendChild(arrow);
    container.appendChild(trigger);

    // Lista desplegable de opciones
    const optionsList = document.createElement('ul');
    optionsList.className = 'custom-select-options';

    const updateOptions = () => {
      optionsList.innerHTML = '';
      Array.from(select.options).forEach((opt, idx) => {
        const item = document.createElement('li');
        item.className = 'custom-select-option';
        item.textContent = opt.text;
        item.setAttribute('data-value', opt.value);
        if (idx === select.selectedIndex) {
          item.classList.add('selected');
        }

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          select.selectedIndex = idx;
          triggerText.textContent = opt.text;
          
          // Disparar el evento change nativo para que otros scripts reaccionen
          select.dispatchEvent(new Event('change'));
          
          // Resaltar la opción seleccionada
          optionsList.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          
          // Cerrar dropdown
          container.classList.remove('open');
        });
        optionsList.appendChild(item);
      });
    };

    updateOptions();
    container.appendChild(optionsList);

    // Abrir/cerrar dropdown al hacer click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Cerrar otros dropdowns abiertos
      document.querySelectorAll('.custom-select-container').forEach(el => {
        if (el !== container) el.classList.remove('open');
      });
      container.classList.toggle('open');
    });

    // Insertar el componente customizado justo después del select original
    select.parentNode.insertBefore(container, select.nextSibling);

    // Observar cambios dinámicos en los options del select original (ej: carga de operadores)
    const observer = new MutationObserver(() => {
      updateOptions();
      triggerText.textContent = select.options[select.selectedIndex]?.text || '';
    });
    observer.observe(select, { childList: true, characterData: true, subtree: true });

    // Sincronizar si el valor se cambia por código externo
    select.addEventListener('change', () => {
      triggerText.textContent = select.options[select.selectedIndex]?.text || '';
      optionsList.querySelectorAll('.custom-select-option').forEach((el, idx) => {
        if (idx === select.selectedIndex) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
    });
  });

  // Cerrar todos los dropdowns si el usuario hace click en cualquier otra parte
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-container').forEach(el => {
      el.classList.remove('open');
    });
  });
}

/**
 * Carga y aplica las preferencias de apariencia guardadas en localStorage
 * (tamaño de fuente, densidad visual, color de acento, bordes y modos de tema).
 */
function applySavedSettings() {
  try {
    const raw = localStorage.getItem('trashflow_settings');
    if (!raw) return;
    const s = JSON.parse(raw);
    const root = document.documentElement;

    // 1. Tamaño de fuente base (Clases de escalado global en body)
    document.body.classList.remove('font-size-12', 'font-size-14', 'font-size-16', 'font-size-18');
    const fSize = s.fontSize || 14;
    document.body.classList.add(`font-size-${fSize}`);
    root.style.setProperty('--font-size-base', `${fSize}px`);

    // 2. Modo de Tema Visual (Dark, OLED, Light)
    document.body.classList.remove('theme-oled', 'theme-light');
    if (s.themeMode === 'oled') {
      document.body.classList.add('theme-oled');
    } else if (s.themeMode === 'light') {
      document.body.classList.add('theme-light');
    }

    // 3. Estilo de Bordes (Round, Standard, Straight)
    if (s.borderRadius === 'round') {
      root.style.setProperty('--radius-card', '16px');
      root.style.setProperty('--radius-button', '10px');
      root.style.setProperty('--radius-input', '10px');
    } else if (s.borderRadius === 'straight') {
      root.style.setProperty('--radius-card', '4px');
      root.style.setProperty('--radius-button', '4px');
      root.style.setProperty('--radius-input', '4px');
    } else {
      root.style.setProperty('--radius-card', '12px');
      root.style.setProperty('--radius-button', '8px');
      root.style.setProperty('--radius-input', '8px');
    }

    // 4. Densidad de espaciado
    document.body.classList.remove('density-compact', 'density-comfortable');
    if (s.density === 'compact') {
      document.body.classList.add('density-compact');
      root.style.setProperty('--spacing-density', '0.75');
    } else if (s.density === 'comfortable') {
      document.body.classList.add('density-comfortable');
      root.style.setProperty('--spacing-density', '1.25');
    } else {
      root.style.setProperty('--spacing-density', '1');
    }

    // 5. Color de acento con contraste inteligente
    if (s.accentColor) {
      root.style.setProperty('--accent-teal', s.accentColor);
      root.style.setProperty('--color-accent-teal', s.accentColor);

      // Calcular contraste para botones principales
      try {
        let hex = s.accentColor;
        if (hex.startsWith('#') && hex.length === 7) {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          const textContrast = (yiq >= 140) ? '#121815' : '#FFFFFF';
          root.style.setProperty('--btn-primary-text', textContrast);
        }
      } catch (err) {
        root.style.setProperty('--btn-primary-text', '#121815');
      }
    }

    // 6. Alto contraste
    if (s.highContrast === true) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  } catch (e) {
    console.warn('Error aplicando configuraciones guardadas:', e);
  }
}



