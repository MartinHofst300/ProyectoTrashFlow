/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: config.js
 * Descripción: Configuración global de la aplicación y cliente API para la comunicación con el Backend.
 *              Contiene las URL bases, el manejo de tokens JWT y una base de datos simulada (Mock)
 *              que permite ejecutar el frontend de forma independiente sin depender de la API de Flask
 *              o la base de datos MySQL (útil para pruebas y presentaciones rápidas).
 * 
 * Dependencias: Ninguna (utiliza la API nativa de Fetch de JS).
 * Expone:
 *   - BASE_URL: Dirección IP y puerto del backend en Flask.
 *   - USE_MOCK: Interruptor para activar la simulación local (mocking).
 *   - requestAPI(): Wrapper de fetch para hacer llamadas HTTP y manejar la expiración del token (401).
 */

// Determina automáticamente la URL de la API:
// - Si se ejecuta en localhost o 127.0.0.1 (desarrollo local XAMPP / Live Server): usa http://127.0.0.1:5005
// - Si se ejecuta en producción (trashflow.site / Nginx Proxy / Hosting): usa ruta relativa ('')
//   para que las peticiones vayan directo a /api/... y Nginx Proxy Manager las reenvíe al contenedor trashflow-api:5005
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.protocol === 'file:'
);

const BASE_URL = isLocalhost ? 'http://127.0.0.1:5005' : '';

const USE_MOCK = false; 

/**
 * Resuelve la URL correcta para una foto de alerta o evidencia.
 * En localhost utiliza el servidor Flask en el puerto 5005.
 * En producción rutea por /api/static/... para que Flask sirva la imagen
 * o aplique el fallback automático al placeholder si el archivo huérfano no existe.
 */
function resolveFotoUrl(fotoPath) {
  if (!fotoPath) {
    return getFotoPlaceholder();
  }
  const clean = fotoPath.startsWith('/') ? fotoPath.substring(1) : fotoPath;
  if (isLocalhost) {
    return `http://127.0.0.1:5005/${clean}`;
  }
  if (clean.startsWith('static/')) {
    return `/api/${clean}`;
  }
  return `/${clean}`;
}

function getFotoPlaceholder() {
  return isLocalhost
    ? 'http://127.0.0.1:5005/static/fotos/detecciones/deteccion_20260915_224219_cam1_conf86.jpg'
    : '/api/static/fotos/detecciones/deteccion_20260915_224219_cam1_conf86.jpg';
} 



/**
 * Obtiene los encabezados necesarios para las peticiones HTTP seguras.
 * Si el usuario ya inició sesión y cuenta con un token JWT guardado en localStorage,
 * lo adjunta en el encabezado de "Authorization" como tipo Bearer.
 * 
 * @returns {Object} Un objeto con los encabezados 'Content-Type' y 'Authorization'.
 */
function getHeaders() {
  const token = localStorage.getItem('trashflow_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

/**
 * Función envolvente (Wrapper) para realizar peticiones HTTP (GET, POST, PATCH, etc.) a la API.
 * Administra de forma centralizada los encabezados de autenticación y maneja respuestas de error común
 * como el código 401 (Sesión no autorizada / expirada).
 * 
 * @param {string} endpoint - Ruta relativa del recurso (ej: '/api/alertas').
 * @param {Object} options - Opciones de fetch adicionales (método, cuerpo de la petición, etc.).
 * @returns {Promise<any>} Promesa con los datos en formato JSON retornados por el servidor.
 */
async function requestAPI(endpoint, options = {}) {
  // Si la simulación local está activa, redirige la llamada a la función mockeadora
  if (USE_MOCK) {
    return fetchMock(endpoint, options);
  }

  // Mezcla los encabezados de autenticación por defecto con los encabezados adicionales que se pasen en las opciones
  const headers = getHeaders();
  options.headers = { ...headers, ...options.headers };

  // Limpia y normaliza el formato del endpoint asegurando la diagonal "/"
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, options);
    
    // Si el servidor responde 401, significa que el token JWT expiró o es inválido
    if (response.status === 401) {
      // Se borran las credenciales del almacenamiento local y se redirige a la pantalla de login
      localStorage.removeItem('trashflow_token');
      localStorage.removeItem('trashflow_rol');
      localStorage.removeItem('trashflow_user');
      window.location.href = 'login.html';
      throw new Error('Sesión expirada. Redirigiendo a login...');
    }

    // Si la respuesta no es exitosa (códigos 4xx o 5xx), obtiene el mensaje de error y lanza una excepción
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.mensaje || errData.message || `Error del servidor: ${response.status}`);
    }

    // Retorna la respuesta serializada en un objeto JS
    return await response.json();
  } catch (error) {
    // Captura específicamente errores de conexión física (cuando la API o el proxy no responden)
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Load failed'))) {
      console.error('Error de conexión: No se pudo conectar con la API de TrashFlow (puerto 5005 / proxy). Por favor, asegurate de que el backend o el host proxy estén activos.');
    }
    console.error('API Error:', error);
    throw error;
  }
}

// --- SIMULADOR DE BASE DE DATOS Y RUTA MOCK ---
// Este conjunto de datos imita la estructura de la base de datos de MySQL para que el sistema funcione offline.
const mockAlerts = [
  { id: 'TF-1025', foto: '../assets/trash1.png', zona: 'Olivos', direccion: 'Av. del Libertador 1520', tipo: 'Bolsa de residuos', estado: 'pendiente', fecha: '2026-06-18T14:30:00', operador: 'Sin asignar', latitud: -34.512, longitud: -58.485, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1024', foto: '../assets/trash2.png', zona: 'Centro', direccion: 'Av. Maipú 2105', tipo: 'Desechos voluminosos', estado: 'alertada', fecha: '2026-06-18T13:15:00', operador: 'Juan Pérez', latitud: -34.522, longitud: -58.472, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1023', foto: '../assets/trash3.png', zona: 'Munro', direccion: 'Av. Mitre 3210', tipo: 'Cartones', estado: 'alertada', fecha: '2026-06-18T11:45:00', operador: 'Sofía Rodríguez', latitud: -34.530, longitud: -58.520, zona_id: 4, zona_color: '#2ECC71' },
  { id: 'TF-1022', foto: '../assets/trash1.png', zona: 'La Lucila', direccion: 'Paraná 950', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-18T09:20:00', operador: 'Carlos Gómez', latitud: -34.500, longitud: -58.488, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1021', foto: '../assets/trash2.png', zona: 'Florida', direccion: 'Av. San Martín 2480', tipo: 'Escombros', estado: 'descartada', fecha: '2026-06-18T08:05:00', operador: 'Sin asignar', latitud: -34.536, longitud: -58.490, zona_id: 6, zona_color: '#EC4899' },
  { id: 'TF-1020', foto: '../assets/trash3.png', zona: 'Villa Martelli', direccion: 'Laprida 3800', tipo: 'Cartones', estado: 'pendiente', fecha: '2026-06-17T17:40:00', operador: 'Sin asignar', latitud: -34.548, longitud: -58.508, zona_id: 5, zona_color: '#8B5CF6' },
  { id: 'TF-1019', foto: '../assets/trash1.png', zona: 'Carapachay', direccion: 'Independencia 3100', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-17T15:10:00', operador: 'Ana Martínez', latitud: -34.535, longitud: -58.528, zona_id: 7, zona_color: '#14B8A6' },
  { id: 'TF-1018', foto: '../assets/trash2.png', zona: 'Olivos', direccion: 'Ugarte 1820', tipo: 'Desechos voluminosos', estado: 'alertada', fecha: '2026-06-17T11:22:00', operador: 'Juan Pérez', latitud: -34.513, longitud: -58.486, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1017', foto: '../assets/trash3.png', zona: 'Centro', direccion: 'Ricardo Gutiérrez 1200', tipo: 'Escombros', estado: 'alertada', fecha: '2026-06-17T09:05:00', operador: 'Carlos Gómez', latitud: -34.521, longitud: -58.471, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1016', foto: '../assets/trash1.png', zona: 'La Lucila', direccion: 'Rawson 3500', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-16T16:50:00', operador: 'Sofía Rodríguez', latitud: -34.501, longitud: -58.489, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1015', foto: '../assets/trash2.png', zona: 'Munro', direccion: 'Vélez Sarsfield 4100', tipo: 'Desechos voluminosos', estado: 'pendiente', fecha: '2026-06-16T14:12:00', operador: 'Sin asignar', latitud: -34.531, longitud: -58.521, zona_id: 4, zona_color: '#2ECC71' },
  { id: 'TF-1014', foto: '../assets/trash3.png', zona: 'Florida', direccion: 'Gral. Roca 1900', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-16T10:30:00', operador: 'Ana Martínez', latitud: -34.537, longitud: -58.491, zona_id: 6, zona_color: '#EC4899' },
  { id: 'TF-1013', foto: '../assets/trash1.png', zona: 'Villa Martelli', direccion: 'Av. Constituyentes 5200', tipo: 'Bolsa de residuos', estado: 'descartada', fecha: '2026-06-16T08:15:00', operador: 'Sin asignar', latitud: -34.549, longitud: -58.509, zona_id: 5, zona_color: '#8B5CF6' },
  { id: 'TF-1012', foto: '../assets/trash2.png', zona: 'Carapachay', direccion: 'Drysdale 5800', tipo: 'Escombros', estado: 'resuelta', fecha: '2026-06-15T18:00:00', operador: 'Carlos Gómez', latitud: -34.536, longitud: -58.529, zona_id: 7, zona_color: '#14B8A6' },
  { id: 'TF-1011', foto: '../assets/trash3.png', zona: 'Olivos', direccion: 'Corrientes 1540', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-15T14:45:00', operador: 'Juan Pérez', latitud: -34.514, longitud: -58.487, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1010', foto: '../assets/trash1.png', zona: 'Centro', direccion: 'Borges 2200', tipo: 'Bolsa de residuos', estado: 'alertada', fecha: '2026-06-15T10:10:00', operador: 'Sofía Rodríguez', latitud: -34.523, longitud: -58.473, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1009', foto: '../assets/trash2.png', zona: 'La Lucila', direccion: 'Roma 800', tipo: 'Desechos voluminosos', estado: 'resuelta', fecha: '2026-06-15T09:05:00', operador: 'Ana Martínez', latitud: -34.502, longitud: -58.490, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1008', foto: '../assets/trash3.png', zona: 'Munro', direccion: 'Carlos Villate 4050', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-14T16:30:00', operador: 'Carlos Gómez', latitud: -34.532, longitud: -58.522, zona_id: 4, zona_color: '#2ECC71' },
  { id: 'TF-1007', foto: '../assets/trash1.png', zona: 'Florida', direccion: 'Melos 2200', tipo: 'Bolsa de residuos', estado: 'descartada', fecha: '2026-06-14T11:20:00', operador: 'Sin asignar', latitud: -34.538, longitud: -58.492, zona_id: 6, zona_color: '#EC4899' },
  { id: 'TF-1006', foto: '../assets/trash2.png', zona: 'Villa Martelli', direccion: 'Chile 400', tipo: 'Escombros', estado: 'resuelta', fecha: '2026-06-14T08:50:00', operador: 'Juan Pérez', latitud: -34.550, longitud: -58.510, zona_id: 5, zona_color: '#8B5CF6' },
  { id: 'TF-1005', foto: '../assets/trash3.png', zona: 'Carapachay', direccion: 'Uriburu 5300', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-13T17:15:00', operador: 'Sofía Rodríguez', latitud: -34.537, longitud: -58.530, zona_id: 7, zona_color: '#14B8A6' },
  { id: 'TF-1004', foto: '../assets/trash1.png', zona: 'Olivos', direccion: 'Malaver 2600', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-13T12:00:00', operador: 'Ana Martínez', latitud: -34.515, longitud: -58.488, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1003', foto: '../assets/trash2.png', zona: 'Centro', direccion: 'Av. Maipú 1800', tipo: 'Desechos voluminosos', estado: 'resuelta', fecha: '2026-06-13T10:45:00', operador: 'Carlos Gómez', latitud: -34.524, longitud: -58.474, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1002', foto: '../assets/trash3.png', zona: 'La Lucila', direccion: 'Díaz Vélez 2500', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-12T15:30:00', operador: 'Juan Pérez', latitud: -34.503, longitud: -58.491, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1001', foto: '../assets/trash1.png', zona: 'Munro', direccion: 'Belgrano 2800', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-12T09:15:00', operador: 'Sofía Rodríguez', latitud: -34.533, longitud: -58.523, zona_id: 4, zona_color: '#2ECC71' }
];

/**
 * Simulador de API Local. Intercepta los endpoints y genera respuestas coherentes
 * manipulando el array mockAlerts en memoria.
 * 
 * @param {string} endpoint - Ruta del servicio a simular.
 * @param {Object} options - Configuración de la petición HTTP.
 */
async function fetchMock(endpoint, options = {}) {
  // Simula latencia de red de 300ms para emular un entorno web real
  await new Promise(resolve => setTimeout(resolve, 300));

  const url = new URL(endpoint, (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'https://trashflow.site');
  const path = url.pathname;
  const params = url.searchParams;

  // 1. Simulación de POST /api/auth/login (Autenticación del Administrador)
  if (path === '/api/auth/login' && options.method === 'POST') {
    const { email, password } = JSON.parse(options.body);
    if (!email || !password) {
      throw new Error('El email y la contraseña son obligatorios.');
    }
    // Permite loguearse con cualquier correo en modo demostración/mock (contraseña >= 6 caracteres o "admin123")
    if (password === 'admin123' || password.length >= 6) {
      const username = email.split('@')[0];
      const initials = username.slice(0, 2).toUpperCase();
      return {
        token: 'mock-jwt-token-xyz-12345',
        role: 'admin',
        user: {
          email: email,
          nombre: username.charAt(0).toUpperCase() + username.slice(1),
          iniciales: initials || 'AD'
        }
      };
    } else {
      throw new Error('Contraseña incorrecta. Intente con "admin123".');
    }
  }

  // 2. Simulación de GET /api/auth/me (Verificación del perfil actual)
  if (path === '/api/auth/me') {
    const token = localStorage.getItem('trashflow_token');
    if (!token) {
      throw new Error('No autorizado');
    }
    return {
      email: 'admin@trashflow.gov.ar',
      nombre: 'Martín Hofstetter',
      iniciales: 'MH'
    };
  }

  // 3. Simulación de POST /api/auth/logout (Cierre de sesión)
  if (path === '/api/auth/logout') {
    return { message: 'Logged out successfully' };
  }

  // 4. Simulación de GET /api/dashboard/hoy (Métricas KPIs del dashboard principal)
  if (path === '/api/dashboard/hoy') {
    const totalHoy = mockAlerts.filter(a => a.fecha.startsWith('2026-06-18')).length;
    const pendientes = mockAlerts.filter(a => a.estado === 'pendiente').length;
    const resueltas = mockAlerts.filter(a => a.estado === 'resuelta').length;
    const total = mockAlerts.length;
    const resueltasPorcentaje = total > 0 ? Math.round((resueltas / total) * 100) : 0;

    return {
      alertas_hoy: 28, // Valores estáticos representativos para la presentación
      alertas_hoy_cambio: '+12% vs ayer',
      pendientes: pendientes,
      pendientes_subtitulo: 'En espera',
      resueltas: resueltas,
      resueltas_porcentaje: `${resueltasPorcentaje}%`,
      tiempo_promedio: 24,
      tiempo_promedio_subtitulo: 'Optimizado'
    };
  }

  // 5. Simulación de GET /api/estadisticas/semanal (Gráfico de línea de alertas detectadas)
  if (path === '/api/estadisticas/semanal') {
    return {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      datasets: [
        {
          label: 'Alertas Detectadas',
          data: [14, 21, 18, 27, 22, 31, 28]
        }
      ]
    };
  }

  // 6. Simulación de GET /api/estadisticas/por-zona (Gráfico de barras de distribución por localidad)
  if (path === '/api/estadisticas/por-zona') {
    return {
      labels: ['Centro', 'Olivos', 'La Lucila', 'Munro', 'Villa Martelli', 'Florida', 'Carapachay'],
      data: [15, 12, 10, 8, 7, 5, 4]
    };
  }

  // 7. Simulación de GET /api/alertas (Listado general de alertas con paginación y filtros)
  if (path === '/api/alertas') {
    let list = [...mockAlerts];

    // Filtrar por límite (útil para la mini-tabla de las alertas recientes)
    const limit = parseInt(params.get('limit'));
    if (limit) {
      const order = params.get('orden');
      if (order === 'desc') {
        list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      }
      return list.slice(0, limit);
    }

    // Filtro por identificador de alerta único
    const alertaId = params.get('alerta_id') || params.get('id');
    if (alertaId) {
      list = list.filter(a => String(a.id) === String(alertaId) || (a.id && String(a.id).replace(/\D/g, '') === String(alertaId).replace(/\D/g, '')));
    }

    // Filtro por término de búsqueda (únicamente por dirección/ubicación)
    const q = params.get('q');
    if (q) {
      const queryLower = q.toLowerCase();
      list = list.filter(a => a.direccion.toLowerCase().includes(queryLower));
    }

    // Filtro por zona del municipio
    const zona = params.get('zona');
    if (zona && zona !== 'Todas las Zonas') {
      list = list.filter(a => a.zona.toLowerCase() === zona.toLowerCase());
    }

    // Filtro por estado operativo
    const estado = params.get('estado');
    if (estado && estado !== 'Todos los Estados') {
      const stateMap = {
        'Pendiente': 'pendiente',
        'Alertada': 'alertada',
        'Asignada': 'alertada',
        'En Proceso': 'alertada',
        'Resuelta': 'resuelta',
        'Descartada': 'descartada'
      };
      const dbEstado = stateMap[estado] || estado.toLowerCase();
      if (dbEstado === 'alertada') {
        list = list.filter(a => a.estado === 'alertada' || a.estado === 'en_proceso' || a.estado === 'asignada');
      } else {
        list = list.filter(a => a.estado === dbEstado);
      }
    }

    // Filtro por fecha de captura
    const fecha = params.get('fecha');
    if (fecha) {
      list = list.filter(a => a.fecha.startsWith(fecha));
    }

    // Ordenamiento por fecha descendente (más nuevas al principio)
    list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Paginación lógica de los resultados filtrados
    const page = parseInt(params.get('page')) || 1;
    const perPage = parseInt(params.get('per_page')) || 10;
    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIdx = (page - 1) * perPage;
    const endIdx = startIdx + perPage;
    const paginatedItems = list.slice(startIdx, endIdx);

    return {
      alertas: paginatedItems,
      page: page,
      per_page: perPage,
      total: totalItems,
      total_paginas: totalPages
    };
  }

  // 8. Simulación de GET /api/alertas/:id (Detalle de alerta individual)
  const alertIdMatch = path.match(/^\/api\/alertas\/([A-Z0-9-]+)$/);
  if (alertIdMatch && options.method === 'GET') {
    const id = alertIdMatch[1];
    const alert = mockAlerts.find(a => a.id === id);
    if (!alert) {
      throw new Error(`Alerta ${id} no encontrada`);
    }
    return alert;
  }

  // 9. Simulación de PATCH /api/alertas/:id/estado (Actualizar estado administrativo)
  const alertEstadoMatch = path.match(/^\/api\/alertas\/([A-Z0-9-]+)\/estado$/);
  if (alertEstadoMatch && options.method === 'PATCH') {
    const id = alertEstadoMatch[1];
    const { estado } = JSON.parse(options.body);
    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      throw new Error(`Alerta ${id} no encontrada`);
    }
    mockAlerts[alertIndex].estado = estado;
    return mockAlerts[alertIndex];
  }

  // 10. Simulación de PATCH /api/alertas/:id/asignar (Asignar operario a la recolección)
  const alertAsignarMatch = path.match(/^\/api\/alertas\/([A-Z0-9-]+)\/asignar$/);
  if (alertAsignarMatch && options.method === 'PATCH') {
    const id = alertAsignarMatch[1];
    const { operador } = JSON.parse(options.body);
    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      throw new Error(`Alerta ${id} no encontrada`);
    }
    mockAlerts[alertIndex].operador = operador;
    // Si estaba pendiente y se asignó operador, cambia automáticamente a 'asignada'
    if (mockAlerts[alertIndex].estado === 'pendiente' && operador !== 'Sin asignar') {
      mockAlerts[alertIndex].estado = 'asignada';
    }
    return mockAlerts[alertIndex];
  }

  // 11. Simulación de GET /api/operadores
  if (path === '/api/operadores' && (!options.method || options.method === 'GET')) {
    return [
      { id: 4, nombre: 'Carlos', apellido: 'Gómez', nombre_completo: 'Carlos Gómez', zona_nombre: 'Centro', activo: 1, alertas_activas: 2, resueltas_hoy: 5, total_historico: 42, dispositivo_nombre: 'Dispositivo Móvil #1', dispositivo_ultima_conexion: '2026-06-18 14:28:00' },
      { id: 5, nombre: 'Juan', apellido: 'Pérez', nombre_completo: 'Juan Pérez', zona_nombre: 'Olivos', activo: 1, alertas_activas: 1, resueltas_hoy: 3, total_historico: 35, dispositivo_nombre: 'Dispositivo Móvil #2', dispositivo_ultima_conexion: '2026-06-18 14:15:00' },
      { id: 6, nombre: 'Sofía', apellido: 'Rodríguez', nombre_completo: 'Sofía Rodríguez', zona_nombre: 'Munro', activo: 1, alertas_activas: 1, resueltas_hoy: 4, total_historico: 29, dispositivo_nombre: null, dispositivo_ultima_conexion: null },
      { id: 7, nombre: 'Ana', apellido: 'Martínez', nombre_completo: 'Ana Martínez', zona_nombre: 'La Lucila', activo: 1, alertas_activas: 0, resueltas_hoy: 6, total_historico: 51, dispositivo_nombre: 'Dispositivo Base Central', dispositivo_ultima_conexion: '2026-06-18 14:31:00' }
    ];
  }

  // 12. Simulación de GET /api/hardware/dispositivos
  if (path === '/api/hardware/dispositivos' && (!options.method || options.method === 'GET')) {
    let devList = JSON.parse(localStorage.getItem('trashflow_mock_devices') || 'null');
    if (!devList) {
      devList = [
        {
          id: 1,
          nombre: "Dispositivo Móvil #1 — Cuadrilla Centro",
          token_device: "trashflow_dev_token_centro_2026",
          token_preview: "...centro_2026",
          operador_id: 4,
          operador_nombre: "Carlos",
          operador_apellido: "Gómez",
          activo: 1,
          ultima_conexion: new Date(Date.now() - 2 * 60000).toISOString().replace('T', ' ').substring(0, 19),
          creado_en: "2026-06-01 10:00:00"
        },
        {
          id: 2,
          nombre: "Dispositivo Móvil #2 — Cuadrilla Olivos",
          token_device: "trashflow_dev_7f8a9b1c2d3e4f5a",
          token_preview: "...c2d3e4f5a",
          operador_id: 5,
          operador_nombre: "Juan",
          operador_apellido: "Pérez",
          activo: 1,
          ultima_conexion: new Date(Date.now() - 14 * 60000).toISOString().replace('T', ' ').substring(0, 19),
          creado_en: "2026-06-05 11:30:00"
        },
        {
          id: 3,
          nombre: "Dispositivo Base Central Vicente López",
          token_device: "trashflow_dev_1122334455667788",
          token_preview: "...55667788",
          operador_id: 7,
          operador_nombre: "Ana",
          operador_apellido: "Martínez",
          activo: 1,
          ultima_conexion: new Date(Date.now() - 1 * 60000).toISOString().replace('T', ' ').substring(0, 19),
          creado_en: "2026-06-10 09:15:00"
        },
        {
          id: 4,
          nombre: "Dispositivo Móvil #3 — Reserva / Reemplazo",
          token_device: "trashflow_dev_9988776655443322",
          token_preview: "...55443322",
          operador_id: null,
          operador_nombre: null,
          operador_apellido: null,
          activo: 1,
          ultima_conexion: null,
          creado_en: "2026-06-15 16:40:00"
        }
      ];
      localStorage.setItem('trashflow_mock_devices', JSON.stringify(devList));
    }
    return { dispositivos: devList, total: devList.length };
  }

  // 13. Simulación de POST /api/hardware/dispositivos (Crear dispositivo)
  if (path === '/api/hardware/dispositivos' && options.method === 'POST') {
    const { nombre } = JSON.parse(options.body || '{}');
    if (!nombre) throw new Error("El nombre del dispositivo es obligatorio.");
    const devList = JSON.parse(localStorage.getItem('trashflow_mock_devices') || '[]');
    const randomHex = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    const token = `trashflow_esp32_${randomHex}`;
    const newId = devList.length > 0 ? Math.max(...devList.map(d => d.id)) + 1 : 1;
    const newDev = {
      id: newId,
      nombre: nombre,
      token_device: token,
      token_preview: '...' + token.slice(-8),
      operador_id: null,
      operador_nombre: null,
      operador_apellido: null,
      activo: 1,
      ultima_conexion: null,
      creado_en: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    devList.push(newDev);
    localStorage.setItem('trashflow_mock_devices', JSON.stringify(devList));
    return {
      ok: true,
      id: newId,
      nombre: nombre,
      token_device: token,
      mensaje: `Dispositivo #${newId} creado con éxito.`
    };
  }

  // 14. Simulación de PATCH /api/hardware/dispositivos/:id/asignar
  const devAsignarMatch = path.match(/^\/api\/hardware\/dispositivos\/(\d+)\/asignar$/);
  if (devAsignarMatch && options.method === 'PATCH') {
    const devId = parseInt(devAsignarMatch[1]);
    const { operador_id } = JSON.parse(options.body || '{}');
    const devList = JSON.parse(localStorage.getItem('trashflow_mock_devices') || '[]');
    const dev = devList.find(d => d.id === devId);
    if (!dev) throw new Error("Dispositivo no encontrado");
    
    if (operador_id) {
      const ops = [
        { id: 4, nombre: 'Carlos', apellido: 'Gómez' },
        { id: 5, nombre: 'Juan', apellido: 'Pérez' },
        { id: 6, nombre: 'Sofía', apellido: 'Rodríguez' },
        { id: 7, nombre: 'Ana', apellido: 'Martínez' }
      ];
      const op = ops.find(o => o.id === parseInt(operador_id));
      dev.operador_id = op ? op.id : operador_id;
      dev.operador_nombre = op ? op.nombre : 'Operador';
      dev.operador_apellido = op ? op.apellido : '';
    } else {
      dev.operador_id = null;
      dev.operador_nombre = null;
      dev.operador_apellido = null;
    }
    localStorage.setItem('trashflow_mock_devices', JSON.stringify(devList));
    return { ok: true, mensaje: "Dispositivo actualizado correctamente." };
  }

  // 15. Simulación de DELETE /api/hardware/dispositivos/:id
  const devDeleteMatch = path.match(/^\/api\/hardware\/dispositivos\/(\d+)$/);
  if (devDeleteMatch && options.method === 'DELETE') {
    const devId = parseInt(devDeleteMatch[1]);
    let devList = JSON.parse(localStorage.getItem('trashflow_mock_devices') || '[]');
    devList = devList.filter(d => d.id !== devId);
    localStorage.setItem('trashflow_mock_devices', JSON.stringify(devList));
    return { ok: true, mensaje: "Dispositivo eliminado con éxito." };
  }

  // 16. Simulación de GET /api/estadisticas/reportes
  if (path === '/api/estadisticas/reportes') {
    const total = mockAlerts.length;
    const resueltas = mockAlerts.filter(a => a.estado === 'resuelta').length;
    const pendientes = mockAlerts.filter(a => a.estado === 'pendiente').length;
    const alertadas = mockAlerts.filter(a => a.estado === 'alertada' || a.estado === 'en_proceso' || a.estado === 'asignada').length;
    const descartadas = mockAlerts.filter(a => a.estado === 'descartada').length;
    const efectividad = Math.round((resueltas / total) * 100);

    return {
      kpis: {
        total_alertas: total,
        resueltas: resueltas,
        pendientes: pendientes,
        en_proceso: alertadas,
        descartadas: descartadas,
        efectividad_pct: efectividad,
        tiempo_promedio_min: 24.5
      },
      tendencia_diaria: [
        { fecha: '2026-06-12', total: 4, resueltas: 4 },
        { fecha: '2026-06-13', total: 6, resueltas: 5 },
        { fecha: '2026-06-14', total: 5, resueltas: 4 },
        { fecha: '2026-06-15', total: 7, resueltas: 6 },
        { fecha: '2026-06-16', total: 8, resueltas: 6 },
        { fecha: '2026-06-17', total: 9, resueltas: 7 },
        { fecha: '2026-06-18', total: 11, resueltas: 9 }
      ],
      distribucion_zonas: [
        { zona: 'Centro', total: 9, color: '#EF4444' },
        { zona: 'Olivos', total: 7, color: '#F5A623' },
        { zona: 'La Lucila', total: 6, color: '#4A90D9' },
        { zona: 'Munro', total: 5, color: '#2ECC71' },
        { zona: 'Villa Martelli', total: 4, color: '#8B5CF6' },
        { zona: 'Florida', total: 3, color: '#EC4899' },
        { zona: 'Carapachay', total: 3, color: '#14B8A6' }
      ],
      distribucion_estados: [
        { estado: 'Resueltas', total: resueltas, color: '#3D5843' },
        { estado: 'Alertadas', total: alertadas, color: '#F5A623' },
        { estado: 'Pendientes', total: pendientes, color: '#E5484D' },
        { estado: 'Descartadas', total: descartadas, color: '#7A857F' }
      ],
      rendimiento_operadores: [
        { id: 7, nombre: 'Ana Martínez', zona: 'La Lucila', asignadas: 14, resueltas: 13, efectividad: 92.8, tiempo_promedio_min: 19.2 },
        { id: 4, nombre: 'Carlos Gómez', zona: 'Centro', asignadas: 12, resueltas: 11, efectividad: 91.6, tiempo_promedio_min: 22.0 },
        { id: 5, nombre: 'Juan Pérez', zona: 'Olivos', asignadas: 10, resueltas: 9, efectividad: 90.0, tiempo_promedio_min: 26.4 },
        { id: 6, nombre: 'Sofía Rodríguez', zona: 'Munro', asignadas: 9, resueltas: 8, efectividad: 88.8, tiempo_promedio_min: 28.1 }
      ],
      registros: mockAlerts.map(a => ({
        id: a.id,
        direccion: a.direccion,
        zona: a.zona,
        estado: (a.estado === 'alertada' || a.estado === 'en_proceso' || a.estado === 'asignada') ? 'Alertada' : (a.estado.charAt(0).toUpperCase() + a.estado.slice(1)),
        operador: a.operador || 'Sin asignar',
        detectado_en: a.fecha ? a.fecha.replace('T', ' ') : '',
        resuelto_en: a.estado === 'resuelta' ? a.fecha.replace('T', ' ') : '-'
      }))
    };
  }

  // 17. Simulación de GET /api/camaras
  if (path === '/api/camaras' && (!options.method || options.method === 'GET')) {
    return [
      {
        id: 1,
        nombre: 'Cámara #1 — Munro',
        ubicacion: 'Av. Mitre y Vélez Sarsfield, Munro',
        latitud: -34.5312,
        longitud: -58.5214,
        estado: 'online',
        activa: 1,
        zona_id: 4,
        total_detecciones: 38,
        ultima_conexion: new Date(Date.now() - 25000).toISOString().replace('T', ' ').substring(0, 19),
        ultima_alerta: new Date(Date.now() - 11 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
      },
      {
        id: 2,
        nombre: 'Cámara #2 — Olivos',
        ubicacion: 'Av. del Libertador y Corrientes, Olivos',
        latitud: -34.5125,
        longitud: -58.4851,
        estado: 'online',
        activa: 1,
        zona_id: 2,
        total_detecciones: 54,
        ultima_conexion: new Date(Date.now() - 40000).toISOString().replace('T', ' ').substring(0, 19),
        ultima_alerta: new Date(Date.now() - 26 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
      },
      {
        id: 3,
        nombre: 'Cámara #3 — Vicente López Centro',
        ubicacion: 'Av. Maipú y Ricardo Gutiérrez, Centro',
        latitud: -34.5221,
        longitud: -58.4723,
        estado: 'online',
        activa: 1,
        zona_id: 1,
        total_detecciones: 61,
        ultima_conexion: new Date(Date.now() - 15000).toISOString().replace('T', ' ').substring(0, 19),
        ultima_alerta: new Date(Date.now() - 75 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
      },
      {
        id: 4,
        nombre: 'Cámara #4 — Florida',
        ubicacion: 'Av. San Martín y Gral. Roca, Florida',
        latitud: -34.5367,
        longitud: -58.4905,
        estado: 'online',
        activa: 1,
        zona_id: 6,
        total_detecciones: 29,
        ultima_conexion: new Date(Date.now() - 50000).toISOString().replace('T', ' ').substring(0, 19),
        ultima_alerta: null
      },
      {
        id: 5,
        nombre: 'Cámara #5 — Villa Martelli',
        ubicacion: 'Laprida y Av. de los Constituyentes, Villa Martelli',
        latitud: -34.5489,
        longitud: -58.5082,
        estado: 'mantenimiento',
        activa: 1,
        zona_id: 5,
        total_detecciones: 17,
        ultima_conexion: new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19),
        ultima_alerta: null
      }
    ];
  }

  throw new Error(`Mock endpoint no implementado: ${options.method || 'GET'} ${path}`);
}

