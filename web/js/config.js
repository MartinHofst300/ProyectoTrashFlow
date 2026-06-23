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

// URL base para conectar con el servidor de la API de Flask. Por defecto corre en el puerto 5000.
const BASE_URL = 'http://localhost:5000';

// Interruptor para demostraciones: si es 'true', simula respuestas de base de datos directamente en el cliente.
// Si es 'false', realiza llamadas reales a la API de Flask.
const USE_MOCK = false; 

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
      throw new Error(errData.message || `Error del servidor: ${response.status}`);
    }

    // Retorna la respuesta serializada en un objeto JS
    return await response.json();
  } catch (error) {
    // Captura específicamente errores de conexión física (cuando Flask no se está ejecutando)
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Load failed'))) {
      console.error('Error de conexión: La API Flask no está corriendo en el puerto 5000. Por favor, asegúrate de iniciar el servidor Flask.');
    }
    console.error('API Error:', error);
    throw error;
  }
}

// --- SIMULADOR DE BASE DE DATOS Y RUTA MOCK ---
// Este conjunto de datos imita la estructura de la base de datos de MySQL para que el sistema funcione offline.
const mockAlerts = [
  { id: 'TF-1025', foto: '../assets/trash1.png', zona: 'Olivos', direccion: 'Av. del Libertador 1520', tipo: 'Bolsa de residuos', estado: 'pendiente', fecha: '2026-06-18T14:30:00', operador: 'Sin asignar', confianza: 94, latitud: -34.512, longitud: -58.485, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1024', foto: '../assets/trash2.png', zona: 'Centro', direccion: 'Av. Maipú 2105', tipo: 'Desechos voluminosos', estado: 'asignada', fecha: '2026-06-18T13:15:00', operador: 'Juan Pérez', confianza: 87, latitud: -34.522, longitud: -58.472, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1023', foto: '../assets/trash3.png', zona: 'Munro', direccion: 'Av. Mitre 3210', tipo: 'Cartones', estado: 'en_proceso', fecha: '2026-06-18T11:45:00', operador: 'Sofía Rodríguez', confianza: 78, latitud: -34.530, longitud: -58.520, zona_id: 4, zona_color: '#2ECC71' },
  { id: 'TF-1022', foto: '../assets/trash1.png', zona: 'La Lucila', direccion: 'Paraná 950', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-18T09:20:00', operador: 'Carlos Gómez', confianza: 98, latitud: -34.500, longitud: -58.488, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1021', foto: '../assets/trash2.png', zona: 'Florida', direccion: 'Av. San Martín 2480', tipo: 'Escombros', estado: 'descartada', fecha: '2026-06-18T08:05:00', operador: 'Sin asignar', confianza: 52, latitud: -34.536, longitud: -58.490, zona_id: 6, zona_color: '#EC4899' },
  { id: 'TF-1020', foto: '../assets/trash3.png', zona: 'Villa Martelli', direccion: 'Laprida 3800', tipo: 'Cartones', estado: 'pendiente', fecha: '2026-06-17T17:40:00', operador: 'Sin asignar', confianza: 61, latitud: -34.548, longitud: -58.508, zona_id: 5, zona_color: '#8B5CF6' },
  { id: 'TF-1019', foto: '../assets/trash1.png', zona: 'Carapachay', direccion: 'Independencia 3100', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-17T15:10:00', operador: 'Ana Martínez', confianza: 92, latitud: -34.535, longitud: -58.528, zona_id: 7, zona_color: '#14B8A6' },
  { id: 'TF-1018', foto: '../assets/trash2.png', zona: 'Olivos', direccion: 'Ugarte 1820', tipo: 'Desechos voluminosos', estado: 'asignada', fecha: '2026-06-17T11:22:00', operador: 'Juan Pérez', confianza: 82, latitud: -34.513, longitud: -58.486, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1017', foto: '../assets/trash3.png', zona: 'Centro', direccion: 'Ricardo Gutiérrez 1200', tipo: 'Escombros', estado: 'en_proceso', fecha: '2026-06-17T09:05:00', operador: 'Carlos Gómez', confianza: 74, latitud: -34.521, longitud: -58.471, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1016', foto: '../assets/trash1.png', zona: 'La Lucila', direccion: 'Rawson 3500', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-16T16:50:00', operador: 'Sofía Rodríguez', confianza: 95, latitud: -34.501, longitud: -58.489, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1015', foto: '../assets/trash2.png', zona: 'Munro', direccion: 'Vélez Sarsfield 4100', tipo: 'Desechos voluminosos', estado: 'pendiente', fecha: '2026-06-16T14:12:00', operador: 'Sin asignar', confianza: 69, latitud: -34.531, longitud: -58.521, zona_id: 4, zona_color: '#2ECC71' },
  { id: 'TF-1014', foto: '../assets/trash3.png', zona: 'Florida', direccion: 'Gral. Roca 1900', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-16T10:30:00', operador: 'Ana Martínez', confianza: 89, latitud: -34.537, longitud: -58.491, zona_id: 6, zona_color: '#EC4899' },
  { id: 'TF-1013', foto: '../assets/trash1.png', zona: 'Villa Martelli', direccion: 'Av. Constituyentes 5200', tipo: 'Bolsa de residuos', estado: 'descartada', fecha: '2026-06-16T08:15:00', operador: 'Sin asignar', confianza: 45, latitud: -34.549, longitud: -58.509, zona_id: 5, zona_color: '#8B5CF6' },
  { id: 'TF-1012', foto: '../assets/trash2.png', zona: 'Carapachay', direccion: 'Drysdale 5800', tipo: 'Escombros', estado: 'resuelta', fecha: '2026-06-15T18:00:00', operador: 'Carlos Gómez', confianza: 97, latitud: -34.536, longitud: -58.529, zona_id: 7, zona_color: '#14B8A6' },
  { id: 'TF-1011', foto: '../assets/trash3.png', zona: 'Olivos', direccion: 'Corrientes 1540', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-15T14:45:00', operador: 'Juan Pérez', confianza: 91, latitud: -34.514, longitud: -58.487, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1010', foto: '../assets/trash1.png', zona: 'Centro', direccion: 'Borges 2200', tipo: 'Bolsa de residuos', estado: 'en_proceso', fecha: '2026-06-15T10:10:00', operador: 'Sofía Rodríguez', confianza: 83, latitud: -34.523, longitud: -58.473, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1009', foto: '../assets/trash2.png', zona: 'La Lucila', direccion: 'Roma 800', tipo: 'Desechos voluminosos', estado: 'resuelta', fecha: '2026-06-15T09:05:00', operador: 'Ana Martínez', confianza: 90, latitud: -34.502, longitud: -58.490, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1008', foto: '../assets/trash3.png', zona: 'Munro', direccion: 'Carlos Villate 4050', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-14T16:30:00', operador: 'Carlos Gómez', confianza: 86, latitud: -34.532, longitud: -58.522, zona_id: 4, zona_color: '#2ECC71' },
  { id: 'TF-1007', foto: '../assets/trash1.png', zona: 'Florida', direccion: 'Melos 2200', tipo: 'Bolsa de residuos', estado: 'descartada', fecha: '2026-06-14T11:20:00', operador: 'Sin asignar', confianza: 58, latitud: -34.538, longitud: -58.492, zona_id: 6, zona_color: '#EC4899' },
  { id: 'TF-1006', foto: '../assets/trash2.png', zona: 'Villa Martelli', direccion: 'Chile 400', tipo: 'Escombros', estado: 'resuelta', fecha: '2026-06-14T08:50:00', operador: 'Juan Pérez', confianza: 96, latitud: -34.550, longitud: -58.510, zona_id: 5, zona_color: '#8B5CF6' },
  { id: 'TF-1005', foto: '../assets/trash3.png', zona: 'Carapachay', direccion: 'Uriburu 5300', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-13T17:15:00', operador: 'Sofía Rodríguez', confianza: 88, latitud: -34.537, longitud: -58.530, zona_id: 7, zona_color: '#14B8A6' },
  { id: 'TF-1004', foto: '../assets/trash1.png', zona: 'Olivos', direccion: 'Malaver 2600', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-13T12:00:00', operador: 'Ana Martínez', confianza: 93, latitud: -34.515, longitud: -58.488, zona_id: 2, zona_color: '#F5A623' },
  { id: 'TF-1003', foto: '../assets/trash2.png', zona: 'Centro', direccion: 'Av. Maipú 1800', tipo: 'Desechos voluminosos', estado: 'resuelta', fecha: '2026-06-13T10:45:00', operador: 'Carlos Gómez', confianza: 91, latitud: -34.524, longitud: -58.474, zona_id: 1, zona_color: '#EF4444' },
  { id: 'TF-1002', foto: '../assets/trash3.png', zona: 'La Lucila', direccion: 'Díaz Vélez 2500', tipo: 'Cartones', estado: 'resuelta', fecha: '2026-06-12T15:30:00', operador: 'Juan Pérez', confianza: 85, latitud: -34.503, longitud: -58.491, zona_id: 3, zona_color: '#4A90D9' },
  { id: 'TF-1001', foto: '../assets/trash1.png', zona: 'Munro', direccion: 'Belgrano 2800', tipo: 'Bolsa de residuos', estado: 'resuelta', fecha: '2026-06-12T09:15:00', operador: 'Sofía Rodríguez', confianza: 97, latitud: -34.533, longitud: -58.523, zona_id: 4, zona_color: '#2ECC71' }
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

  const url = new URL(endpoint, 'http://localhost:5000');
  const path = url.pathname;
  const params = url.searchParams;

  // 1. Simulación de POST /api/auth/login (Autenticación del Administrador)
  if (path === '/api/auth/login' && options.method === 'POST') {
    const { email, password } = JSON.parse(options.body);
    if (!email || !password) {
      throw new Error('El email y la contraseña son obligatorios.');
    }
    // Permite loguearse con cualquier correo institucional
    if (email.endsWith('@municipalidad.gov.ar') || email === 'admin@trashflow.gov.ar') {
      if (password === 'admin123' || password.length >= 6) {
        return {
          token: 'mock-jwt-token-xyz-12345',
          role: 'admin',
          user: {
            email: email,
            nombre: 'Martín Hofstetter',
            iniciales: 'MH'
          }
        };
      } else {
        throw new Error('Contraseña incorrecta. Intente con "admin123".');
      }
    } else {
      throw new Error('Email inválido. Debe pertenecer a @municipalidad.gov.ar');
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

    // Filtro por término de búsqueda (ID o dirección postal)
    const q = params.get('q');
    if (q) {
      const queryLower = q.toLowerCase();
      list = list.filter(a => a.id.toLowerCase().includes(queryLower) || a.direccion.toLowerCase().includes(queryLower));
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
        'Asignada': 'asignada',
        'En Proceso': 'en_proceso',
        'Resuelta': 'resuelta',
        'Descartada': 'descartada'
      };
      const dbEstado = stateMap[estado] || estado.toLowerCase();
      list = list.filter(a => a.estado === dbEstado);
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
      total_items: totalItems,
      total_pages: totalPages
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

  throw new Error(`Mock endpoint no implementado: ${options.method || 'GET'} ${path}`);
}
