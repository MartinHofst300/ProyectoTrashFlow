-- ==========================================================================
-- TrashFlow — Sistema de Monitoreo de Residuos Urbano
--
-- Archivo: base_de_datos/trashflow.sql
-- Descripción: Script de creación y estructura de base de datos relacional MySQL/MariaDB.
--              Define las tablas (alertas, camaras, usuarios, sesiones, configuración),
--              índices de rendimiento, relaciones FK, y vistas analíticas de KPIs.
-- ==========================================================================

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-06-2026 a las 04:54:05
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `trashflow`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alertas`
--

CREATE TABLE `alertas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `camara_id` int(10) UNSIGNED NOT NULL,
  `zona_id` smallint(5) UNSIGNED DEFAULT NULL,
  `estado_id` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `operador_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'Operador asignado para ir a limpiar',
  `confianza` decimal(5,2) NOT NULL COMMENT 'Porcentaje de confianza del modelo CNN (0.00-100.00)',
  `foto_url` varchar(255) NOT NULL COMMENT 'Foto principal capturada por la cámara al momento de detección',
  `latitud` decimal(10,7) NOT NULL,
  `longitud` decimal(10,7) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL COMMENT 'Dirección legible obtenida por geocoding inverso',
  `notas_admin` text DEFAULT NULL COMMENT 'Observaciones del panel municipalidad',
  `notas_operador` text DEFAULT NULL COMMENT 'Observaciones del operador al resolver',
  `foto_resolucion` varchar(255) DEFAULT NULL COMMENT 'Foto del lugar limpio subida por el operador como evidencia',
  `detectado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `asignado_en` datetime DEFAULT NULL,
  `en_proceso_en` datetime DEFAULT NULL,
  `resuelto_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Detecciones de bolsas de basura generadas por el modelo CNN Python';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `camaras`
--

CREATE TABLE `camaras` (
  `id` int(10) UNSIGNED NOT NULL,
  `zona_id` smallint(5) UNSIGNED DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `ubicacion` varchar(255) NOT NULL COMMENT 'Dirección legible para mostrar en la UI',
  `latitud` decimal(10,7) NOT NULL,
  `longitud` decimal(10,7) NOT NULL,
  `ip_stream` varchar(150) DEFAULT NULL COMMENT 'URL del stream MJPEG para verlo en el panel web',
  `token_api` varchar(255) NOT NULL COMMENT 'Token único que usa detector.py para autenticarse en la API Flask',
  `estado` enum('online','offline','mantenimiento') NOT NULL DEFAULT 'offline',
  `ultima_conexion` datetime DEFAULT NULL,
  `total_detecciones` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Contador de detecciones históricas',
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cámaras fijas en la vía pública conectadas al modelo Python';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion`
--

CREATE TABLE `configuracion` (
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `tipo` enum('texto','numero','booleano','json') NOT NULL DEFAULT 'texto',
  `grupo` varchar(50) NOT NULL DEFAULT 'general' COMMENT 'Agrupa parámetros en el panel: general, email, modelo, notificaciones',
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración global editable desde el panel web de municipalidad';

--
-- Volcado de datos para la tabla `configuracion`
--

INSERT INTO `configuracion` (`clave`, `valor`, `descripcion`, `tipo`, `grupo`, `actualizado_en`) VALUES
('dias_historial_visible', '90', 'Días de historial visible en los reportes del panel', 'numero', 'general', '2026-06-17 23:28:47'),
('email_activo', 'true', 'Habilitar envío de emails del sistema', 'booleano', 'email', '2026-06-17 23:28:47'),
('email_admin', 'admin@trashflow.com', 'Email del administrador para recibir alertas y resúmenes', 'texto', 'email', '2026-06-17 23:28:47'),
('email_alerta_asignada', 'true', 'Enviar email al operador cuando se le asigna una alerta', 'booleano', 'email', '2026-06-17 23:28:47'),
('email_alerta_resuelta', 'true', 'Enviar email al admin cuando un operador resuelve una alerta', 'booleano', 'email', '2026-06-17 23:28:47'),
('email_credenciales', 'true', 'Enviar email con credenciales al crear un nuevo operador', 'booleano', 'email', '2026-06-17 23:28:47'),
('email_nueva_alerta', 'true', 'Enviar email al admin cuando el modelo detecta una nueva alerta', 'booleano', 'email', '2026-06-17 23:28:47'),
('email_remitente_nombre', 'TrashFlow - Municipalidad de Vicente López', 'Nombre visible del remitente en los emails', 'texto', 'email', '2026-06-17 23:28:47'),
('email_resumen_diario', 'true', 'Enviar resumen diario automático al admin', 'booleano', 'email', '2026-06-17 23:28:47'),
('firebase_activo', 'true', 'Habilitar notificaciones push via Firebase Cloud Messaging', 'booleano', 'notificaciones', '2026-06-17 23:28:47'),
('firebase_project_id', '', 'Project ID del proyecto en Firebase Console', 'texto', 'notificaciones', '2026-06-17 23:28:47'),
('firebase_server_key', '', 'Server Key de Firebase Cloud Messaging (FCM)', 'texto', 'notificaciones', '2026-06-17 23:28:47'),
('intervalo_deteccion_seg', '5', 'Segundos mínimos entre detecciones de la misma cámara para evitar spam', 'numero', 'modelo', '2026-06-17 23:28:47'),
('max_fotos_por_alerta', '5', 'Cantidad máxima de fotos por alerta', 'numero', 'modelo', '2026-06-17 23:28:47'),
('max_intentos_email', '3', 'Intentos máximos para reenviar un email fallido', 'numero', 'email', '2026-06-17 23:28:47'),
('max_intentos_login', '5', 'Intentos de login fallidos antes de bloquear la cuenta temporalmente', 'numero', 'auth', '2026-06-17 23:28:47'),
('nombre_municipalidad', 'Municipalidad de Vicente López', 'Nombre que aparece en la interfaz y en los emails', 'texto', 'general', '2026-06-17 23:28:47'),
('notif_alerta_asignada', 'true', 'Notificar al operador asignado cuando se le asigna una alerta', 'booleano', 'notificaciones', '2026-06-17 23:28:47'),
('notif_nueva_alerta', 'true', 'Notificar a todos los operadores cuando hay nueva alerta', 'booleano', 'notificaciones', '2026-06-17 23:28:47'),
('smtp_host', 'smtp.gmail.com', 'Servidor SMTP para envío de emails', 'texto', 'email', '2026-06-17 23:28:47'),
('smtp_password', '', 'Contraseña o App Password del email remitente', 'texto', 'email', '2026-06-17 23:28:47'),
('smtp_puerto', '587', 'Puerto SMTP (587 para TLS, 465 para SSL)', 'numero', 'email', '2026-06-17 23:28:47'),
('smtp_tls', 'true', 'Usar TLS para conexión SMTP segura', 'booleano', 'email', '2026-06-17 23:28:47'),
('smtp_usuario', 'trashflow@gmail.com', 'Cuenta de email que envía los mensajes', 'texto', 'email', '2026-06-17 23:28:47'),
('tiempo_bloqueo_min', '15', 'Minutos de bloqueo tras superar el máximo de intentos fallidos', 'numero', 'auth', '2026-06-17 23:28:47'),
('tiempo_expiracion_jwt', '480', 'Minutos de validez del token JWT (480 = 8 horas)', 'numero', 'auth', '2026-06-17 23:28:47'),
('tiempo_expiracion_pwa', '10080', 'Minutos de validez del token JWT en PWA (10080 = 7 días)', 'numero', 'auth', '2026-06-17 23:28:47'),
('tiempo_expiracion_reset', '60', 'Minutos de validez del token de recuperación de contraseña', 'numero', 'auth', '2026-06-17 23:28:47'),
('timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria del sistema', 'texto', 'general', '2026-06-17 23:28:47'),
('umbral_confianza', '85', 'Porcentaje mínimo de confianza del modelo para generar alerta (0-100)', 'numero', 'modelo', '2026-06-17 23:28:47'),
('version_modelo', '1.0', 'Versión actual del modelo CNN TrashFlow', 'texto', 'modelo', '2026-06-17 23:28:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `emails_log`
--

CREATE TABLE `emails_log` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'Destinatario si es usuario del sistema',
  `alerta_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Alerta relacionada si aplica',
  `destinatario` varchar(150) NOT NULL COMMENT 'Email destino siempre guardado por si se borra el usuario',
  `asunto` varchar(255) NOT NULL,
  `tipo` enum('nueva_alerta','alerta_asignada','alerta_resuelta','resumen_diario','credenciales_operador','cambio_password','recuperacion_password','sistema') NOT NULL,
  `estado` enum('pendiente','enviado','fallido') NOT NULL DEFAULT 'pendiente',
  `intentos` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `ultimo_intento` datetime DEFAULT NULL,
  `error_detalle` text DEFAULT NULL COMMENT 'Mensaje de error si falló el envío',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `enviado_en` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de todos los emails enviados por el sistema con estado y reintentos';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estados_alerta`
--

CREATE TABLE `estados_alerta` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(30) NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  `color_hex` varchar(7) NOT NULL COMMENT 'Color para chips y pines en la UI',
  `orden` tinyint(3) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Orden lógico del flujo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de estados de una alerta: pendiente → asignada → en_proceso → resuelta';

--
-- Volcado de datos para la tabla `estados_alerta`
--

INSERT INTO `estados_alerta` (`id`, `nombre`, `descripcion`, `color_hex`, `orden`) VALUES
(1, 'pendiente', 'Alerta nueva generada por el modelo, sin operador asignado', '#EF4444', 1),
(2, 'asignada', 'Operador asignado, está en camino al lugar', '#F5A623', 2),
(3, 'en_proceso', 'El operador llegó al lugar y está retirando la basura', '#4A90D9', 3),
(4, 'resuelta', 'La basura fue retirada, lugar limpio con foto de evidencia', '#2ECC71', 4),
(5, 'descartada', 'Falsa alarma, duplicado o error del modelo, sin intervención', '#6B8F8A', 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fotos_alerta`
--

CREATE TABLE `fotos_alerta` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `alerta_id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'NULL si la subió el sistema automáticamente',
  `url` varchar(255) NOT NULL,
  `tipo` enum('deteccion','resolucion','adicional') NOT NULL DEFAULT 'deteccion',
  `descripcion` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fotos adicionales por alerta: detección, resolución y evidencia';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_alertas`
--

CREATE TABLE `historial_alertas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `alerta_id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'NULL si el cambio fue automático por el sistema',
  `estado_id` tinyint(3) UNSIGNED NOT NULL COMMENT 'Estado nuevo al que cambió la alerta',
  `notas` text DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoría de cada cambio de estado de una alerta';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logs_sistema`
--

CREATE TABLE `logs_sistema` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'NULL si fue acción automática del sistema',
  `accion` varchar(100) NOT NULL COMMENT 'Ej: login, crear_operador, resolver_alerta',
  `entidad` varchar(50) DEFAULT NULL COMMENT 'Tabla afectada: alertas, usuarios, camaras',
  `entidad_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'ID del registro afectado',
  `detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Datos adicionales relevantes en formato JSON' CHECK (json_valid(`detalle`)),
  `ip` varchar(45) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoría completa de acciones del sistema';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `alerta_id` bigint(20) UNSIGNED DEFAULT NULL,
  `titulo` varchar(100) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo` enum('nueva_alerta','alerta_asignada','alerta_resuelta','sistema') NOT NULL DEFAULT 'nueva_alerta',
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `leida_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificaciones push enviadas a operadores via Firebase FCM';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recuperacion_password`
--

CREATE TABLE `recuperacion_password` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `token` varchar(255) NOT NULL COMMENT 'Token único enviado por email',
  `usado` tinyint(1) NOT NULL DEFAULT 0,
  `expira_en` datetime NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tokens temporales para recuperación de contraseña por email';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes_programados`
--

CREATE TABLE `reportes_programados` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL COMMENT 'Admin que recibe el reporte',
  `tipo` enum('resumen_diario','resumen_semanal') NOT NULL DEFAULT 'resumen_diario',
  `hora_envio` time NOT NULL DEFAULT '08:00:00' COMMENT 'Hora del día para enviar el reporte',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_envio` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración de reportes automáticos por email para admins';

--
-- Volcado de datos para la tabla `reportes_programados`
--

INSERT INTO `reportes_programados` (`id`, `usuario_id`, `tipo`, `hora_envio`, `activo`, `ultimo_envio`, `creado_en`) VALUES
(1, 1, 'resumen_diario', '08:00:00', 1, NULL, '2026-06-17 23:28:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(20) NOT NULL,
  `descripcion` varchar(150) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Roles del sistema: admin y operador';

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `creado_en`) VALUES
(1, 'admin', 'Administrador del panel web de municipalidad, acceso total al sistema', '2026-06-17 23:28:47'),
(2, 'operador', 'Operador de campo, acceso solo a la PWA mobile para gestionar sus alertas asignadas', '2026-06-17 23:28:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones`
--

CREATE TABLE `sesiones` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `token_hash` varchar(255) NOT NULL COMMENT 'SHA256 del JWT para invalidar sin guardar el token completo',
  `ip` varchar(45) DEFAULT NULL COMMENT 'IPv4 o IPv6',
  `dispositivo` varchar(255) DEFAULT NULL COMMENT 'User-Agent del navegador o PWA',
  `plataforma` enum('web','pwa') NOT NULL DEFAULT 'web',
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `expira_en` datetime NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sesiones JWT activas por usuario y plataforma';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tokens_push`
--

CREATE TABLE `tokens_push` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `token` varchar(255) NOT NULL COMMENT 'Token FCM de Firebase',
  `dispositivo` varchar(255) DEFAULT NULL COMMENT 'User-Agent para identificar el dispositivo',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tokens FCM de Firebase para notificaciones push en PWA';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `rol_id` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `primer_login` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = debe cambiar contraseña al entrar',
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `eliminado_en` datetime DEFAULT NULL COMMENT 'Soft delete: fecha de baja lógica'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios del sistema: admin municipalidad y operadores de campo';

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `rol_id`, `nombre`, `apellido`, `email`, `password_hash`, `telefono`, `avatar_url`, `activo`, `primer_login`, `ultimo_acceso`, `creado_en`, `actualizado_en`, `eliminado_en`) VALUES
(1, 1, 'Administrador', 'TrashFlow', 'admin@trashflow.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsntBNSAkiGRloueKBHCH3BQBvnm', NULL, NULL, 1, 0, NULL, '2026-06-17 23:28:47', '2026-06-17 23:28:47', NULL);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_alertas_completa`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_alertas_completa` (
`id` bigint(20) unsigned
,`confianza` decimal(5,2)
,`foto_url` varchar(255)
,`foto_resolucion` varchar(255)
,`latitud` decimal(10,7)
,`longitud` decimal(10,7)
,`direccion` varchar(255)
,`notas_admin` text
,`notas_operador` text
,`detectado_en` datetime
,`asignado_en` datetime
,`en_proceso_en` datetime
,`resuelto_en` datetime
,`minutos_hasta_asignacion` bigint(21)
,`minutos_hasta_resolucion` bigint(21)
,`estado_id` tinyint(3) unsigned
,`estado` varchar(30)
,`estado_color` varchar(7)
,`camara_id` int(10) unsigned
,`camara_nombre` varchar(100)
,`camara_ubicacion` varchar(255)
,`zona_id` smallint(5) unsigned
,`zona_nombre` varchar(100)
,`zona_color` varchar(7)
,`operador_id` int(10) unsigned
,`operador_nombre` varchar(161)
,`operador_email` varchar(150)
,`operador_telefono` varchar(20)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_dashboard_hoy`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_dashboard_hoy` (
`total_hoy` bigint(21)
,`pendientes_hoy` decimal(22,0)
,`asignadas_hoy` decimal(22,0)
,`en_proceso_hoy` decimal(22,0)
,`resueltas_hoy` decimal(22,0)
,`descartadas_hoy` decimal(22,0)
,`confianza_promedio_hoy` decimal(5,1)
,`porcentaje_resolucion_hoy` decimal(27,1)
,`minutos_resolucion_promedio_hoy` decimal(21,0)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_emails_log`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_emails_log` (
`id` bigint(20) unsigned
,`destinatario` varchar(150)
,`asunto` varchar(255)
,`tipo` enum('nueva_alerta','alerta_asignada','alerta_resuelta','resumen_diario','credenciales_operador','cambio_password','recuperacion_password','sistema')
,`estado` enum('pendiente','enviado','fallido')
,`intentos` tinyint(3) unsigned
,`error_detalle` text
,`creado_en` datetime
,`enviado_en` datetime
,`usuario_nombre` varchar(161)
,`alerta_direccion` varchar(255)
,`alerta_detectado_en` datetime
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_estadisticas_diarias`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_estadisticas_diarias` (
`fecha` date
,`total_alertas` bigint(21)
,`pendientes` decimal(22,0)
,`asignadas` decimal(22,0)
,`en_proceso` decimal(22,0)
,`resueltas` decimal(22,0)
,`descartadas` decimal(22,0)
,`confianza_promedio` decimal(6,2)
,`porcentaje_resolucion` decimal(27,1)
,`minutos_resolucion_promedio` decimal(21,0)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_estadisticas_por_zona`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_estadisticas_por_zona` (
`zona_id` smallint(5) unsigned
,`zona` varchar(100)
,`color_hex` varchar(7)
,`total_alertas` bigint(21)
,`pendientes` decimal(22,0)
,`resueltas` decimal(22,0)
,`confianza_promedio` decimal(6,2)
,`ultima_alerta` datetime
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_operadores`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_operadores` (
`id` int(10) unsigned
,`nombre` varchar(80)
,`apellido` varchar(80)
,`nombre_completo` varchar(161)
,`email` varchar(150)
,`telefono` varchar(20)
,`activo` tinyint(1)
,`ultimo_acceso` datetime
,`eliminado_en` datetime
,`alertas_activas` bigint(21)
,`resueltas_hoy` bigint(21)
,`total_historico` bigint(21)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `zonas`
--

CREATE TABLE `zonas` (
  `id` smallint(5) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `color_hex` varchar(7) NOT NULL DEFAULT '#EF4444' COMMENT 'Color del pin/área en el mapa interactivo',
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Zonas geográficas de Vicente López para organizar alertas';

--
-- Volcado de datos para la tabla `zonas`
--

INSERT INTO `zonas` (`id`, `nombre`, `descripcion`, `color_hex`, `activa`, `creado_en`) VALUES
(1, 'Centro', 'Zona céntrica de Vicente López', '#EF4444', 1, '2026-06-17 23:28:47'),
(2, 'Olivos', 'Barrio Olivos y alrededores', '#F5A623', 1, '2026-06-17 23:28:47'),
(3, 'La Lucila', 'Barrio La Lucila', '#4A90D9', 1, '2026-06-17 23:28:47'),
(4, 'Munro', 'Barrio Munro', '#2ECC71', 1, '2026-06-17 23:28:47'),
(5, 'Villa Martelli', 'Barrio Villa Martelli', '#8B5CF6', 1, '2026-06-17 23:28:47'),
(6, 'Florida', 'Barrio Florida y Florida Oeste', '#EC4899', 1, '2026-06-17 23:28:47'),
(7, 'Carapachay', 'Barrio Carapachay', '#14B8A6', 1, '2026-06-17 23:28:47');

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_alertas_completa`
--
DROP TABLE IF EXISTS `vista_alertas_completa`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_alertas_completa`  AS SELECT `a`.`id` AS `id`, `a`.`confianza` AS `confianza`, `a`.`foto_url` AS `foto_url`, `a`.`foto_resolucion` AS `foto_resolucion`, `a`.`latitud` AS `latitud`, `a`.`longitud` AS `longitud`, `a`.`direccion` AS `direccion`, `a`.`notas_admin` AS `notas_admin`, `a`.`notas_operador` AS `notas_operador`, `a`.`detectado_en` AS `detectado_en`, `a`.`asignado_en` AS `asignado_en`, `a`.`en_proceso_en` AS `en_proceso_en`, `a`.`resuelto_en` AS `resuelto_en`, timestampdiff(MINUTE,`a`.`detectado_en`,`a`.`asignado_en`) AS `minutos_hasta_asignacion`, timestampdiff(MINUTE,`a`.`detectado_en`,`a`.`resuelto_en`) AS `minutos_hasta_resolucion`, `ea`.`id` AS `estado_id`, `ea`.`nombre` AS `estado`, `ea`.`color_hex` AS `estado_color`, `c`.`id` AS `camara_id`, `c`.`nombre` AS `camara_nombre`, `c`.`ubicacion` AS `camara_ubicacion`, `z`.`id` AS `zona_id`, `z`.`nombre` AS `zona_nombre`, `z`.`color_hex` AS `zona_color`, `u`.`id` AS `operador_id`, concat(`u`.`nombre`,' ',`u`.`apellido`) AS `operador_nombre`, `u`.`email` AS `operador_email`, `u`.`telefono` AS `operador_telefono` FROM ((((`alertas` `a` join `estados_alerta` `ea` on(`a`.`estado_id` = `ea`.`id`)) join `camaras` `c` on(`a`.`camara_id` = `c`.`id`)) left join `zonas` `z` on(`a`.`zona_id` = `z`.`id`)) left join `usuarios` `u` on(`a`.`operador_id` = `u`.`id`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_dashboard_hoy`
--
DROP TABLE IF EXISTS `vista_dashboard_hoy`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_dashboard_hoy`  AS SELECT count(0) AS `total_hoy`, sum(case when `alertas`.`estado_id` = 1 then 1 else 0 end) AS `pendientes_hoy`, sum(case when `alertas`.`estado_id` = 2 then 1 else 0 end) AS `asignadas_hoy`, sum(case when `alertas`.`estado_id` = 3 then 1 else 0 end) AS `en_proceso_hoy`, sum(case when `alertas`.`estado_id` = 4 then 1 else 0 end) AS `resueltas_hoy`, sum(case when `alertas`.`estado_id` = 5 then 1 else 0 end) AS `descartadas_hoy`, round(avg(`alertas`.`confianza`),1) AS `confianza_promedio_hoy`, round(sum(case when `alertas`.`estado_id` = 4 then 1 else 0 end) * 100.0 / nullif(count(0),0),1) AS `porcentaje_resolucion_hoy`, round(avg(case when `alertas`.`resuelto_en` is not null then timestampdiff(MINUTE,`alertas`.`detectado_en`,`alertas`.`resuelto_en`) end),0) AS `minutos_resolucion_promedio_hoy` FROM `alertas` WHERE cast(`alertas`.`detectado_en` as date) = curdate() ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_emails_log`
--
DROP TABLE IF EXISTS `vista_emails_log`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_emails_log`  AS SELECT `el`.`id` AS `id`, `el`.`destinatario` AS `destinatario`, `el`.`asunto` AS `asunto`, `el`.`tipo` AS `tipo`, `el`.`estado` AS `estado`, `el`.`intentos` AS `intentos`, `el`.`error_detalle` AS `error_detalle`, `el`.`creado_en` AS `creado_en`, `el`.`enviado_en` AS `enviado_en`, concat(`u`.`nombre`,' ',`u`.`apellido`) AS `usuario_nombre`, `a`.`direccion` AS `alerta_direccion`, `a`.`detectado_en` AS `alerta_detectado_en` FROM ((`emails_log` `el` left join `usuarios` `u` on(`el`.`usuario_id` = `u`.`id`)) left join `alertas` `a` on(`el`.`alerta_id` = `a`.`id`)) ORDER BY `el`.`creado_en` DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_estadisticas_diarias`
--
DROP TABLE IF EXISTS `vista_estadisticas_diarias`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_estadisticas_diarias`  AS SELECT cast(`alertas`.`detectado_en` as date) AS `fecha`, count(0) AS `total_alertas`, sum(case when `alertas`.`estado_id` = 1 then 1 else 0 end) AS `pendientes`, sum(case when `alertas`.`estado_id` = 2 then 1 else 0 end) AS `asignadas`, sum(case when `alertas`.`estado_id` = 3 then 1 else 0 end) AS `en_proceso`, sum(case when `alertas`.`estado_id` = 4 then 1 else 0 end) AS `resueltas`, sum(case when `alertas`.`estado_id` = 5 then 1 else 0 end) AS `descartadas`, round(avg(`alertas`.`confianza`),2) AS `confianza_promedio`, round(sum(case when `alertas`.`estado_id` = 4 then 1 else 0 end) * 100.0 / nullif(count(0),0),1) AS `porcentaje_resolucion`, round(avg(case when `alertas`.`resuelto_en` is not null then timestampdiff(MINUTE,`alertas`.`detectado_en`,`alertas`.`resuelto_en`) end),0) AS `minutos_resolucion_promedio` FROM `alertas` GROUP BY cast(`alertas`.`detectado_en` as date) ORDER BY cast(`alertas`.`detectado_en` as date) DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_estadisticas_por_zona`
--
DROP TABLE IF EXISTS `vista_estadisticas_por_zona`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_estadisticas_por_zona`  AS SELECT `z`.`id` AS `zona_id`, `z`.`nombre` AS `zona`, `z`.`color_hex` AS `color_hex`, count(`a`.`id`) AS `total_alertas`, sum(case when `a`.`estado_id` = 1 then 1 else 0 end) AS `pendientes`, sum(case when `a`.`estado_id` = 4 then 1 else 0 end) AS `resueltas`, round(avg(`a`.`confianza`),2) AS `confianza_promedio`, max(`a`.`detectado_en`) AS `ultima_alerta` FROM (`zonas` `z` left join `alertas` `a` on(`z`.`id` = `a`.`zona_id`)) GROUP BY `z`.`id`, `z`.`nombre`, `z`.`color_hex` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_operadores`
--
DROP TABLE IF EXISTS `vista_operadores`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_operadores`  AS SELECT `u`.`id` AS `id`, `u`.`nombre` AS `nombre`, `u`.`apellido` AS `apellido`, concat(`u`.`nombre`,' ',`u`.`apellido`) AS `nombre_completo`, `u`.`email` AS `email`, `u`.`telefono` AS `telefono`, `u`.`activo` AS `activo`, `u`.`ultimo_acceso` AS `ultimo_acceso`, `u`.`eliminado_en` AS `eliminado_en`, count(case when `a`.`estado_id` in (2,3) then 1 end) AS `alertas_activas`, count(case when `a`.`estado_id` = 4 and cast(`a`.`resuelto_en` as date) = curdate() then 1 end) AS `resueltas_hoy`, count(`a`.`id`) AS `total_historico` FROM (`usuarios` `u` left join `alertas` `a` on(`a`.`operador_id` = `u`.`id`)) WHERE `u`.`rol_id` = 2 GROUP BY `u`.`id` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alertas`
--
ALTER TABLE `alertas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_alertas_estado` (`estado_id`),
  ADD KEY `idx_alertas_camara` (`camara_id`),
  ADD KEY `idx_alertas_operador` (`operador_id`),
  ADD KEY `idx_alertas_zona` (`zona_id`),
  ADD KEY `idx_alertas_detectado` (`detectado_en`),
  ADD KEY `idx_alertas_coords` (`latitud`,`longitud`),
  ADD KEY `idx_alertas_confianza` (`confianza`);

--
-- Indices de la tabla `camaras`
--
ALTER TABLE `camaras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_camaras_token` (`token_api`),
  ADD KEY `idx_camaras_zona` (`zona_id`),
  ADD KEY `idx_camaras_estado` (`estado`);

--
-- Indices de la tabla `configuracion`
--
ALTER TABLE `configuracion`
  ADD PRIMARY KEY (`clave`),
  ADD KEY `idx_config_grupo` (`grupo`);

--
-- Indices de la tabla `emails_log`
--
ALTER TABLE `emails_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_emails_usuario` (`usuario_id`),
  ADD KEY `idx_emails_alerta` (`alerta_id`),
  ADD KEY `idx_emails_estado` (`estado`),
  ADD KEY `idx_emails_tipo` (`tipo`),
  ADD KEY `idx_emails_creado` (`creado_en`);

--
-- Indices de la tabla `estados_alerta`
--
ALTER TABLE `estados_alerta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_estados_alerta_nombre` (`nombre`);

--
-- Indices de la tabla `fotos_alerta`
--
ALTER TABLE `fotos_alerta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fotos_alerta` (`alerta_id`),
  ADD KEY `idx_fotos_usuario` (`usuario_id`);

--
-- Indices de la tabla `historial_alertas`
--
ALTER TABLE `historial_alertas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_historial_alerta` (`alerta_id`),
  ADD KEY `idx_historial_usuario` (`usuario_id`),
  ADD KEY `fk_historial_estado` (`estado_id`);

--
-- Indices de la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_logs_usuario` (`usuario_id`),
  ADD KEY `idx_logs_accion` (`accion`),
  ADD KEY `idx_logs_entidad` (`entidad`,`entidad_id`),
  ADD KEY `idx_logs_creado` (`creado_en`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_usuario` (`usuario_id`),
  ADD KEY `idx_notif_alerta` (`alerta_id`),
  ADD KEY `idx_notif_leida` (`leida`),
  ADD KEY `idx_notif_tipo` (`tipo`);

--
-- Indices de la tabla `recuperacion_password`
--
ALTER TABLE `recuperacion_password`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_recuperacion_token` (`token`),
  ADD KEY `idx_recuperacion_usuario` (`usuario_id`);

--
-- Indices de la tabla `reportes_programados`
--
ALTER TABLE `reportes_programados`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reportes_usuario` (`usuario_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_roles_nombre` (`nombre`);

--
-- Indices de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sesiones_usuario` (`usuario_id`),
  ADD KEY `idx_sesiones_token` (`token_hash`),
  ADD KEY `idx_sesiones_activa` (`activa`);

--
-- Indices de la tabla `tokens_push`
--
ALTER TABLE `tokens_push`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tokens_push_token` (`token`),
  ADD KEY `idx_tokens_push_usuario` (`usuario_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_usuarios_email` (`email`),
  ADD KEY `idx_usuarios_rol` (`rol_id`),
  ADD KEY `idx_usuarios_activo` (`activo`);

--
-- Indices de la tabla `zonas`
--
ALTER TABLE `zonas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_zonas_nombre` (`nombre`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alertas`
--
ALTER TABLE `alertas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `camaras`
--
ALTER TABLE `camaras`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `emails_log`
--
ALTER TABLE `emails_log`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `estados_alerta`
--
ALTER TABLE `estados_alerta`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `fotos_alerta`
--
ALTER TABLE `fotos_alerta`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `historial_alertas`
--
ALTER TABLE `historial_alertas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `recuperacion_password`
--
ALTER TABLE `recuperacion_password`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reportes_programados`
--
ALTER TABLE `reportes_programados`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tokens_push`
--
ALTER TABLE `tokens_push`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `zonas`
--
ALTER TABLE `zonas`
  MODIFY `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `alertas`
--
ALTER TABLE `alertas`
  ADD CONSTRAINT `fk_alertas_camara` FOREIGN KEY (`camara_id`) REFERENCES `camaras` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_alertas_estado` FOREIGN KEY (`estado_id`) REFERENCES `estados_alerta` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_alertas_operador` FOREIGN KEY (`operador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_alertas_zona` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `camaras`
--
ALTER TABLE `camaras`
  ADD CONSTRAINT `fk_camaras_zona` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `emails_log`
--
ALTER TABLE `emails_log`
  ADD CONSTRAINT `fk_emails_alerta` FOREIGN KEY (`alerta_id`) REFERENCES `alertas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_emails_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `fotos_alerta`
--
ALTER TABLE `fotos_alerta`
  ADD CONSTRAINT `fk_fotos_alerta` FOREIGN KEY (`alerta_id`) REFERENCES `alertas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fotos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `historial_alertas`
--
ALTER TABLE `historial_alertas`
  ADD CONSTRAINT `fk_historial_alerta` FOREIGN KEY (`alerta_id`) REFERENCES `alertas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_historial_estado` FOREIGN KEY (`estado_id`) REFERENCES `estados_alerta` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  ADD CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `fk_notif_alerta` FOREIGN KEY (`alerta_id`) REFERENCES `alertas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `recuperacion_password`
--
ALTER TABLE `recuperacion_password`
  ADD CONSTRAINT `fk_recuperacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `reportes_programados`
--
ALTER TABLE `reportes_programados`
  ADD CONSTRAINT `fk_reportes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD CONSTRAINT `fk_sesiones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `tokens_push`
--
ALTER TABLE `tokens_push`
  ADD CONSTRAINT `fk_tokens_push_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
