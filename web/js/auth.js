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
  checkAuthGuard();       // Verifica si el usuario tiene permiso para ver la página actual
  initLoginForm();        // Inicializa el formulario de inicio de sesión si existe en la página
  initNavbarUserInfo();   // Muestra las iniciales del perfil y vincula el botón de cerrar sesión
  initNotifications();    // Inicializa el sistema de notificaciones de la campana
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
