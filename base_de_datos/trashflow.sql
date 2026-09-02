-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 02-09-2026 a las 19:25:59
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
  `confianza` decimal(5,2) NOT NULL COMMENT 'Porcentaje de confianza del modelo YOLOv8 (0.00-100.00)',
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

--
-- Volcado de datos para la tabla `alertas`
--

INSERT INTO `alertas` (`id`, `camara_id`, `zona_id`, `estado_id`, `operador_id`, `confianza`, `foto_url`, `latitud`, `longitud`, `direccion`, `notas_admin`, `notas_operador`, `foto_resolucion`, `detectado_en`, `asignado_en`, `en_proceso_en`, `resuelto_en`, `creado_en`, `actualizado_en`) VALUES
(21, 1, 1, 2, 4, 87.57, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5250000, -58.4730000, '1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', NULL, NULL, NULL, '2026-06-30 20:37:14', '2026-07-02 23:31:36', NULL, NULL, '2026-06-30 20:37:14', '2026-07-02 23:31:36'),
(22, 1, 1, 2, 5, 88.00, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5218000, -58.4725000, 'Av. Maipú 2300, Centro', NULL, NULL, NULL, '2026-07-02 17:39:52', '2026-07-02 23:52:07', NULL, NULL, '2026-07-02 17:39:52', '2026-07-02 23:52:07'),
(23, 1, 1, 2, 4, 74.00, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5209000, -58.4718000, 'Ricardo Gutiérrez 1500, Centro', NULL, NULL, NULL, '2026-07-02 05:39:52', '2026-07-02 23:59:45', NULL, NULL, '2026-07-02 05:39:52', '2026-07-02 23:59:45'),
(24, 1, 1, 2, 7, 92.00, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5225000, -58.4731000, 'Juan B. Justo 900, Centro', NULL, NULL, NULL, '2026-07-01 18:39:52', '2026-07-03 00:01:01', NULL, NULL, '2026-07-01 18:39:52', '2026-07-03 00:01:01'),
(25, 1, 1, 2, 5, 81.00, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5232000, -58.4739000, 'Borges 1900, Centro', NULL, NULL, NULL, '2026-07-01 11:39:52', '2026-07-02 23:52:39', NULL, NULL, '2026-07-01 11:39:52', '2026-07-02 23:52:39'),
(26, 1, 1, 2, 4, 79.00, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5241000, -58.4746000, 'Av. San Martín 1500, Centro', NULL, NULL, NULL, '2026-07-01 02:39:52', '2026-07-03 00:00:05', NULL, NULL, '2026-07-01 02:39:52', '2026-07-03 00:00:05'),
(27, 1, 1, 1, NULL, 85.03, 'static/fotos/detecciones/deteccion_20260826_154412_cam1_conf85.jpg', -34.5250000, -58.4730000, '1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', NULL, NULL, NULL, '2026-08-26 15:44:17', NULL, NULL, NULL, '2026-08-26 15:44:17', '2026-08-26 15:44:17'),
(28, 1, 1, 2, 7, 86.76, 'static/fotos/detecciones/deteccion_20260826_154956_cam1_conf87.jpg', -34.5250000, -58.4730000, '1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', NULL, NULL, NULL, '2026-08-26 15:50:00', '2026-08-26 15:50:38', NULL, NULL, '2026-08-26 15:50:00', '2026-08-26 15:50:38');

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

--
-- Volcado de datos para la tabla `camaras`
--

INSERT INTO `camaras` (`id`, `zona_id`, `nombre`, `descripcion`, `ubicacion`, `latitud`, `longitud`, `ip_stream`, `token_api`, `estado`, `ultima_conexion`, `total_detecciones`, `activa`, `creado_en`, `actualizado_en`) VALUES
(1, 1, 'Cámara de Prueba Munro', NULL, 'Av. Mitre 2300, Munro', -34.5250000, -58.4730000, 'local', 'token_camara_1_aqui', 'online', '2026-08-26 15:50:00', 3, 1, '2026-06-18 15:09:19', '2026-08-26 15:50:00');

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
-- Estructura de tabla para la tabla `dispositivos_hardware`
--

CREATE TABLE `dispositivos_hardware` (
  `id` int(10) UNSIGNED NOT NULL COMMENT 'ID = Número del dispositivo (Dispositivo #1, #2...)',
  `nombre` varchar(100) NOT NULL COMMENT 'Ej: Dispositivo Campo #1',
  `token_device` varchar(255) NOT NULL COMMENT 'Token fijo hardcodeado en el sketch del ESP32',
  `operador_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'Operario asignado a este dispositivo (NULL = sin asignar)',
  `activo` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 = dado de baja / roto',
  `ultima_conexion` datetime DEFAULT NULL COMMENT 'Última vez que el ESP32 consultó la API',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dispositivos ESP32 de campo. id = número de dispositivo.';

--
-- Volcado de datos para la tabla `dispositivos_hardware`
--

INSERT INTO `dispositivos_hardware` (`id`, `nombre`, `token_device`, `operador_id`, `activo`, `ultima_conexion`, `creado_en`) VALUES
(1, 'Dispositivo Campo #1', 'trashflow_esp32_device_token_demo_2026', 4, 1, NULL, '2026-09-01 14:27:22');

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

--
-- Volcado de datos para la tabla `emails_log`
--

INSERT INTO `emails_log` (`id`, `usuario_id`, `alerta_id`, `destinatario`, `asunto`, `tipo`, `estado`, `intentos`, `ultimo_intento`, `error_detalle`, `creado_en`, `enviado_en`) VALUES
(1, 5, NULL, 'marcos.gimenez@trashflow.com', '[TrashFlow] Tus credenciales de acceso', 'credenciales_operador', 'fallido', 1, '2026-06-18 16:57:13', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. af79cd13be357-920a0e4c8f4sm11413185a.8 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-18 16:57:13', NULL),
(2, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 853, Martín J. Haedo, Vicente López, Partido de Vicente López, Buenos Aires, B1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-18 16:57:18', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 6a1803df08f44-8de628fb106sm977396d6.38 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-18 16:57:18', NULL),
(3, 5, NULL, 'marcos.gimenez@trashflow.com', '[TrashFlow] Alerta asignada — 853, Martín J. Haedo, Vicente López, Partido de Vicente López, Buenos Aires, B1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-06-18 16:57:20', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 6a1803df08f44-8de5eb0bb1fsm1260236d6.17 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-18 16:57:20', NULL),
(4, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-18 17:05:38', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. af79cd13be357-920a515df4dsm9798785a.45 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-18 17:05:38', NULL),
(5, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-21 22:33:25', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. af79cd13be357-921db06174dsm773491385a.33 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-21 22:33:25', NULL),
(6, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-21 22:36:11', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. af79cd13be357-921d843cacfsm755186385a.19 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-21 22:36:11', NULL),
(7, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 15:30:56', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. af79cd13be357-925fd3923edsm49855485a.8 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 15:30:56', NULL),
(8, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 15:44:02', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. af79cd13be357-926000c1c39sm47291785a.26 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 15:44:02', NULL),
(9, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 15:47:05', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 71dfb90a1353d-5bbfba739d2sm7571958e0c.15 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 15:47:05', NULL),
(10, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 15:52:43', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 6a1803df08f44-8df7f0180d3sm102557946d6.3 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 15:52:43', NULL),
(11, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 15:58:42', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 6a1803df08f44-8df7f018011sm106110056d6.5 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 15:58:42', NULL),
(12, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 16:04:47', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. ada2fe7eead31-72b9f7b1e4esm6981834137.0 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 16:04:47', NULL),
(13, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 22:30:48', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a92af1059eb24-139add5824csm9417507c88.10 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 22:30:48', NULL),
(14, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 22:39:54', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 71dfb90a1353d-5bbfba739d2sm8192699e0c.15 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 22:39:54', NULL),
(15, 4, NULL, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-06-22 23:00:25', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30c1ba1f0a9sm13116171eec.2 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:00:25', NULL),
(16, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 23:02:47', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30c1ba635d8sm14101456eec.10 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:02:47', NULL),
(17, 4, NULL, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-06-22 23:27:58', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a92af1059eb24-139add6d76dsm10252319c88.12 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:27:58', NULL),
(18, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 23:32:53', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30c1b4f7d81sm12735037eec.0 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:32:53', NULL),
(19, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 23:36:25', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 71dfb90a1353d-5bbfb81ed48sm8011455e0c.5 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:36:25', NULL),
(20, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 23:39:11', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30c1ba91120sm13093931eec.13 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:39:11', NULL),
(21, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 23:41:34', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30c1be4b24esm12725320eec.27 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:41:34', NULL),
(22, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-22 23:44:39', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a92af1059eb24-139adcaad8fsm9482566c88.1 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-22 23:44:39', NULL),
(23, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-23 01:04:07', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. ada2fe7eead31-72b9f7b1e4esm7655075137.0 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-23 01:04:07', NULL),
(24, 4, NULL, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-06-23 01:04:32', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a1e0cc1a2514c-9671a7ea5a8sm5699372241.11 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-23 01:04:32', NULL),
(25, 4, NULL, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-06-23 01:05:44', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. ada2fe7eead31-72b9f7b1e4esm7656703137.0 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-23 01:05:44', NULL),
(26, NULL, NULL, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-29 22:20:09', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. ada2fe7eead31-73a81c973dcsm374139137.2 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-29 22:20:09', NULL),
(27, NULL, 21, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-06-30 20:37:16', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a92af1059eb24-13b2abcd5edsm16848461c88.15 - gsmtp\', \'trashflow@gmail.com\')', '2026-06-30 20:37:16', NULL),
(28, 4, 21, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-07-02 23:31:38', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30f0bc3ea61sm15326698eec.30 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-02 23:31:38', NULL),
(29, 5, 22, 'marcos.gimenez@trashflow.com', '[TrashFlow] Alerta asignada — Av. Maipú 2300, Centro', 'alerta_asignada', 'fallido', 1, '2026-07-02 23:52:09', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30f0b86ef6asm16128435eec.13 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-02 23:52:09', NULL),
(30, 5, 25, 'marcos.gimenez@trashflow.com', '[TrashFlow] Alerta asignada — Borges 1900, Centro', 'alerta_asignada', 'fallido', 1, '2026-07-02 23:52:42', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30f1cbfc285sm6066069eec.5 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-02 23:52:42', NULL),
(31, 6, NULL, 'awdadaw@gmail.com', '[TrashFlow] Tus credenciales de acceso', 'credenciales_operador', 'fallido', 1, '2026-07-02 23:53:26', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30f0bbd221bsm15213057eec.22 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-02 23:53:26', NULL),
(32, 4, 23, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — Ricardo Gutiérrez 1500, Centro', 'alerta_asignada', 'fallido', 1, '2026-07-02 23:59:47', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a92af1059eb24-13b3c85d4fesm13468163c88.11 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-02 23:59:47', NULL),
(33, 4, 26, 'ramiro.lautaro.caballero.t1vl@gmail.com', '[TrashFlow] Alerta asignada — Av. San Martín 1500, Centro', 'alerta_asignada', 'fallido', 1, '2026-07-03 00:00:06', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30f0bc27ae7sm14109637eec.26 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-03 00:00:06', NULL),
(34, 7, NULL, '31313@gmail.com', '[TrashFlow] Tus credenciales de acceso', 'credenciales_operador', 'fallido', 1, '2026-07-03 00:00:51', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a92af1059eb24-13b41c364d5sm8799239c88.14 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-03 00:00:51', NULL),
(35, 7, 24, '31313@gmail.com', '[TrashFlow] Alerta asignada — Juan B. Justo 900, Centro', 'alerta_asignada', 'fallido', 1, '2026-07-03 00:01:03', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. 5a478bee46e88-30f0bbd2350sm15919669eec.23 - gsmtp\', \'trashflow@gmail.com\')', '2026-07-03 00:01:03', NULL),
(36, NULL, 27, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-08-26 15:44:19', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a1e0cc1a2514c-97cbde09650sm2665144241.0 - gsmtp\', \'trashflow@gmail.com\')', '2026-08-26 15:44:19', NULL),
(37, NULL, 28, 'admin@trashflow.com', '[TrashFlow] Nueva alerta detectada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'nueva_alerta', 'fallido', 1, '2026-08-26 15:50:02', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a1e0cc1a2514c-97cbe34c7c8sm2466603241.11 - gsmtp\', \'trashflow@gmail.com\')', '2026-08-26 15:50:02', NULL),
(38, 7, 28, '31313@gmail.com', '[TrashFlow] Alerta asignada — 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina', 'alerta_asignada', 'fallido', 1, '2026-08-26 15:50:41', '(530, b\'5.7.0 Authentication Required. For more information, go to\\n5.7.0  https://support.google.com/accounts/troubleshooter/2402620. a1e0cc1a2514c-97ccc0f4963sm744468241.12 - gsmtp\', \'trashflow@gmail.com\')', '2026-08-26 15:50:41', NULL);

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

--
-- Volcado de datos para la tabla `historial_alertas`
--

INSERT INTO `historial_alertas` (`id`, `alerta_id`, `usuario_id`, `estado_id`, `notas`, `creado_en`) VALUES
(6, 21, 1, 2, 'Operador asignado desde panel', '2026-07-02 23:31:36'),
(7, 22, 1, 2, 'Operador asignado desde panel', '2026-07-02 23:52:07'),
(8, 25, 1, 2, 'Operador asignado desde panel', '2026-07-02 23:52:39'),
(9, 23, 1, 2, 'Operador asignado desde panel', '2026-07-02 23:59:46'),
(10, 26, 1, 2, 'Operador asignado desde panel', '2026-07-03 00:00:05'),
(11, 24, 1, 2, 'Operador asignado desde panel', '2026-07-03 00:01:01'),
(12, 28, 1, 2, 'Operador asignado desde panel', '2026-08-26 15:50:38');

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

--
-- Volcado de datos para la tabla `notificaciones`
--

INSERT INTO `notificaciones` (`id`, `usuario_id`, `alerta_id`, `titulo`, `mensaje`, `tipo`, `leida`, `leida_en`, `creado_en`) VALUES
(1, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 89.2%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 15:30:53'),
(2, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 87.0%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 15:44:00'),
(3, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 94.6%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 15:47:03'),
(4, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 97.5%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 15:52:41'),
(5, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 96.2%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 15:58:40'),
(6, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 89.8%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 16:04:46'),
(7, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 89.1%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 22:30:46'),
(8, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 89.3%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 22:39:53'),
(9, 4, NULL, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina.', 'alerta_asignada', 0, NULL, '2026-06-22 23:00:24'),
(10, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 90.4%)', 'nueva_alerta', 1, '2026-06-22 23:18:30', '2026-06-22 23:02:46'),
(11, 4, NULL, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina.', 'alerta_asignada', 0, NULL, '2026-06-22 23:27:56'),
(12, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 97.3%)', 'nueva_alerta', 1, '2026-06-23 00:41:09', '2026-06-22 23:32:51'),
(13, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 95.1%)', 'nueva_alerta', 1, '2026-06-23 00:41:09', '2026-06-22 23:36:23'),
(14, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 89.7%)', 'nueva_alerta', 1, '2026-06-23 00:41:09', '2026-06-22 23:39:10'),
(15, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 93.0%)', 'nueva_alerta', 1, '2026-06-23 00:41:09', '2026-06-22 23:41:32'),
(16, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 89.4%)', 'nueva_alerta', 1, '2026-06-23 00:41:09', '2026-06-22 23:44:38'),
(17, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 96.3%)', 'nueva_alerta', 1, '2026-06-23 01:11:26', '2026-06-23 01:04:05'),
(18, 4, NULL, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina.', 'alerta_asignada', 0, NULL, '2026-06-23 01:04:30'),
(19, 4, NULL, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina.', 'alerta_asignada', 0, NULL, '2026-06-23 01:05:42'),
(20, 1, NULL, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 92.1%)', 'nueva_alerta', 1, '2026-06-29 22:20:43', '2026-06-29 22:20:07'),
(21, 1, 21, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 87.6%)', 'nueva_alerta', 1, '2026-07-02 22:46:54', '2026-06-30 20:37:14'),
(22, 4, 21, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina.', 'alerta_asignada', 0, NULL, '2026-07-02 23:31:36'),
(23, 1, 22, 'Nueva Alerta Detectada', 'Basura detectada en Av. Maipú 2300, Centro (Confianza: 88%)', 'nueva_alerta', 1, '2026-07-02 23:43:18', '2026-07-02 23:39:52'),
(24, 1, 23, 'Nueva Alerta Detectada', 'Basura detectada en Ricardo Gutiérrez 1500, Centro (Confianza: 74%)', 'nueva_alerta', 1, '2026-07-02 23:43:18', '2026-07-02 23:39:52'),
(25, 1, 24, 'Nueva Alerta Detectada', 'Basura detectada en Juan B. Justo 900, Centro (Confianza: 92%)', 'nueva_alerta', 1, '2026-07-02 23:43:18', '2026-07-02 23:39:52'),
(26, 1, 25, 'Nueva Alerta Detectada', 'Basura detectada en Borges 1900, Centro (Confianza: 81%)', 'nueva_alerta', 1, '2026-07-02 23:43:18', '2026-07-02 23:39:52'),
(27, 1, 26, 'Nueva Alerta Detectada', 'Basura detectada en Av. San Martín 1500, Centro (Confianza: 79%)', 'nueva_alerta', 1, '2026-07-02 23:43:18', '2026-07-02 23:39:52'),
(28, 5, 22, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en Av. Maipú 2300, Centro.', 'alerta_asignada', 0, NULL, '2026-07-02 23:52:08'),
(29, 5, 25, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en Borges 1900, Centro.', 'alerta_asignada', 0, NULL, '2026-07-02 23:52:40'),
(30, 4, 23, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en Ricardo Gutiérrez 1500, Centro.', 'alerta_asignada', 0, NULL, '2026-07-02 23:59:46'),
(31, 4, 26, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en Av. San Martín 1500, Centro.', 'alerta_asignada', 0, NULL, '2026-07-03 00:00:05'),
(32, 7, 24, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en Juan B. Justo 900, Centro.', 'alerta_asignada', 0, NULL, '2026-07-03 00:01:01'),
(33, 1, 27, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 85.0%)', 'nueva_alerta', 0, NULL, '2026-08-26 15:44:17'),
(34, 1, 28, 'Nueva Alerta Detectada', 'Basura detectada en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina (Confianza: 86.8%)', 'nueva_alerta', 0, NULL, '2026-08-26 15:50:00'),
(35, 7, 28, 'Nueva Alerta Asignada', 'Se te ha asignado la recolección en 1022, Miguel de Azcuénaga, Vicente López, Partido de Vicente López, Buenos Aires, 1638, Argentina.', 'alerta_asignada', 0, NULL, '2026-08-26 15:50:38');

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

--
-- Volcado de datos para la tabla `sesiones`
--

INSERT INTO `sesiones` (`id`, `usuario_id`, `token_hash`, `ip`, `dispositivo`, `plataforma`, `activa`, `expira_en`, `creado_en`) VALUES
(1, 1, 'ab962bf8-2fd7-43ee-8250-077c53185bdd', '127.0.0.1', 'python-requests/2.34.2', 'web', 1, '2026-06-18 15:52:01', '2026-06-18 15:37:01'),
(2, 1, '78c61b1e-c253-4939-a71a-a137984f1a92', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36', 'web', 1, '2026-06-18 15:52:36', '2026-06-18 15:37:36'),
(3, 1, 'd22fef88-4204-4ae6-b162-7010eb9f2208', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-18 16:09:28', '2026-06-18 15:54:29'),
(4, 1, '5b99569a-9803-4c1a-88e7-147c54f353bf', '127.0.0.1', 'python-requests/2.34.2', 'web', 1, '2026-06-18 16:26:59', '2026-06-18 16:11:59'),
(5, 1, '65bf82c3-b1c6-4c16-9b2e-8fc1e351f3cf', '127.0.0.1', 'python-requests/2.34.2', 'web', 1, '2026-06-18 16:27:13', '2026-06-18 16:12:13'),
(6, 1, '614c4fd0-b1f2-4a05-825a-81e3559c642f', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-18 16:28:48', '2026-06-18 16:13:48'),
(7, 1, 'c269c1c1-e7d7-49b6-b458-4fef6a9765c5', '127.0.0.1', 'python-requests/2.34.2', 'web', 1, '2026-06-18 16:48:16', '2026-06-18 16:33:16'),
(8, 1, '925a8bc7-1f80-4480-a638-9bf965731baf', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-18 16:52:04', '2026-06-18 16:37:04'),
(9, 1, '892ba3b3-2c6a-4e4b-9da8-33492d42bb2f', '127.0.0.1', 'python-requests/2.34.2', 'web', 1, '2026-06-18 17:12:09', '2026-06-18 16:57:09'),
(10, 1, '84864a01-e20f-4af0-a9ce-c3988b4e5191', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-18 17:13:17', '2026-06-18 16:58:17'),
(11, 1, '7e46e47b-af05-4570-9406-32c798deb458', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36', 'web', 1, '2026-06-21 22:42:04', '2026-06-21 22:27:04'),
(12, 1, '90d2f094-1725-4383-945a-8f8dac3a46f9', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-21 23:00:41', '2026-06-21 22:45:41'),
(13, 1, 'b2b42e01-ad04-494e-8ee6-dbb8366a6bc5', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36', 'web', 1, '2026-06-22 14:14:34', '2026-06-22 13:59:34'),
(14, 1, '14514a36-efd5-4c3d-9add-33317cf9c416', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-22 23:12:39', '2026-06-22 22:57:39'),
(15, 1, '5ad0800d-a63d-44ef-acb2-eeab683bca3a', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-06-22 23:29:05', '2026-06-22 23:14:05'),
(16, 1, '55c55d9a-9d06-406b-926b-294a96a86902', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-06-22 23:34:09', '2026-06-22 23:19:09'),
(17, 1, '732efa5d-ff61-45c1-9a50-0dd1548b1cd9', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-22 23:42:37', '2026-06-22 23:27:38'),
(18, 1, '8c9e6d43-7d0f-43eb-a81f-9568a219f2c5', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-22 23:59:26', '2026-06-22 23:44:26'),
(19, 1, 'e71b4aa6-d219-40a1-bc2f-987b0da64ff8', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-23 00:24:41', '2026-06-23 00:09:41'),
(20, 1, 'b34a7c88-35a6-4104-b47d-b93af075da28', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-06-23 00:56:01', '2026-06-23 00:41:01'),
(21, 1, 'e459b825-0ba6-4eba-9f59-0b012f16da70', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-06-23 01:07:10', '2026-06-23 00:52:10'),
(22, 1, '8e1e7b73-2eff-4d5c-952c-e73f807b817e', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-06-23 01:18:40', '2026-06-23 01:03:40'),
(23, 1, '284aa312-a665-41de-b007-678e69fae224', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-29 15:05:09', '2026-06-29 14:50:09'),
(24, 1, 'be8496ee-cd20-46bf-86bc-b0c734c8a52c', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-29 22:26:08', '2026-06-29 22:11:08'),
(25, 1, '0ba7db79-5eef-4c45-b8e2-4aba7689bf3f', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-29 23:48:11', '2026-06-29 23:33:11'),
(26, 1, 'e36a7341-e76c-4c94-8cac-91d12b816869', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-30 20:31:19', '2026-06-30 20:16:19'),
(27, 1, '0abdd551-e7ba-4c75-a26e-011dfdf75594', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-06-30 20:36:49', '2026-06-30 20:21:49'),
(28, 1, '4ff6b6f7-dbb6-4636-94dc-dd26608825ad', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-06-30 20:43:26', '2026-06-30 20:28:26'),
(29, 1, '336b3c21-b8d1-4139-a9a6-cd07eb19555e', '127.0.0.1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; es-ES) WindowsPowerShell/5.1.26100.8655', 'web', 1, '2026-06-30 22:33:59', '2026-06-30 22:19:00'),
(30, 1, '7be47f9d-ab42-4f6c-93eb-b5d0ea8c2f3d', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-07-02 22:45:50', '2026-07-02 22:30:50'),
(31, 1, 'b517694c-c3c9-4b96-ba27-371adc4e11fb', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-07-02 23:01:25', '2026-07-02 22:46:25'),
(32, 1, 'f262e0e1-3362-4241-ac0f-dd2330c1c2ad', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-07-02 23:12:20', '2026-07-02 22:57:21'),
(33, 1, '10f2ac0f-2827-424e-af8d-ac39e33c33b2', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-07-02 23:24:48', '2026-07-02 23:09:48'),
(34, 1, 'b933b96a-4452-45ad-9738-35d5f15cd3c3', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 1, '2026-07-02 23:41:44', '2026-07-02 23:26:44'),
(35, 1, '461f4105-c98d-445f-a0f7-63b3d88d307a', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-07-02 23:57:57', '2026-07-02 23:42:57'),
(36, 1, 'bf4e1c58-fbeb-421f-aab2-529d650b316f', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-07-03 00:05:43', '2026-07-02 23:50:44'),
(37, 1, 'e0535720-ddc5-46cf-96e0-7aee8f13d162', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-07-03 00:06:21', '2026-07-02 23:51:21'),
(38, 1, 'f0bc6199-c19b-4950-8d7b-93be25cafc2b', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 'web', 0, '2026-07-03 00:13:50', '2026-07-02 23:58:51'),
(39, 1, '494f387e-0d14-4560-8dfc-603e17b2b7bb', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', 1, '2026-08-10 22:01:07', '2026-08-10 21:46:07'),
(40, 1, '39584d25-d666-4428-9fd3-3e924d8b5b12', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', 1, '2026-08-26 15:10:20', '2026-08-26 14:55:20'),
(41, 1, '82b4513f-7331-42e6-865e-79faf9de83e9', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', 0, '2026-08-26 15:40:00', '2026-08-26 15:25:00'),
(42, 1, 'b41126f6-5f99-40ec-bad2-948d55aa5014', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', 0, '2026-08-26 16:03:38', '2026-08-26 15:48:38'),
(43, 1, '8ed995b3-f1ac-473a-8037-8ea7b7284cd6', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 1, '2026-09-01 14:54:20', '2026-09-01 14:39:20');

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
  `zona_id` smallint(5) UNSIGNED DEFAULT NULL COMMENT 'Zona de Vicente López en la que trabaja el operario',
  `dni` varchar(20) DEFAULT NULL COMMENT 'DNI del operario de campo',
  `fecha_nacimiento` date DEFAULT NULL COMMENT 'Fecha de nacimiento del operario',
  `nombre` varchar(80) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
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

INSERT INTO `usuarios` (`id`, `rol_id`, `zona_id`, `dni`, `fecha_nacimiento`, `nombre`, `apellido`, `email`, `password_hash`, `telefono`, `avatar_url`, `activo`, `primer_login`, `ultimo_acceso`, `creado_en`, `actualizado_en`, `eliminado_en`) VALUES
(1, 1, NULL, NULL, NULL, 'Administrador', 'TrashFlow', 'admin@trashflow.com', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', NULL, NULL, 1, 0, '2026-09-01 14:39:20', '2026-06-17 23:28:47', '2026-09-01 14:39:20', NULL),
(2, 2, 1, NULL, NULL, 'Test', 'Operador', 'testop@trashflow.com', '$2b$12$83XtUucKSCy0ffzp46pl6eEgUHeYv4/6nSrHTvq/nSPNsRg4oSsgW', '12345678', NULL, 1, 1, NULL, '2026-06-18 16:12:22', '2026-09-01 14:27:30', NULL),
(3, 2, NULL, NULL, NULL, 'Carlos Alberto', 'Gomez', 'carlos.gomez@trashflow.com', '$2b$12$QhKTm.ADQKcewLbE5xduXuFH9Z4YEoPfIBE/SSxqVLHAuFvHDWdP2', '+5491144445555', NULL, 0, 1, NULL, '2026-06-18 16:33:18', '2026-06-18 16:33:36', '2026-06-18 16:33:36'),
(4, 2, 1, NULL, NULL, 'ramiro', 'caballero', 'ramiro.lautaro.caballero.t1vl@gmail.com', '$2b$12$y6pvFexl3GMzYaNFDr3I3.TPDp9DeIp8S.mWQdZBun0cJnXCX2wVW', '1134224433', NULL, 1, 1, NULL, '2026-06-18 16:39:59', '2026-09-01 14:27:30', NULL),
(5, 2, 2, NULL, NULL, 'Marcos', 'Gimenez', 'marcos.gimenez@trashflow.com', '$2b$12$y0YInU6RU9.cMirP148TIOJcUNO706WyI2x6qI33P1UgLcyRH1XNW', '+5491199998888', NULL, 1, 1, NULL, '2026-06-18 16:57:11', '2026-09-01 14:39:59', NULL),
(6, 2, 2, NULL, NULL, 'ramon', 'juan', 'awdadaw@gmail.com', '$2b$12$lJ0s/iZ6J.Rca1t7.FhbPe5S6x50Ig0xOp8YXUEY70aT2p38.k0Be', '+54 112233-4455', NULL, 1, 1, NULL, '2026-07-02 23:53:25', '2026-09-01 14:43:21', NULL),
(7, 2, 3, NULL, NULL, 'fausto', 'coronel', '31313@gmail.com', '$2b$12$TEps.5yrc8tuz70B0daBp.nCRQs8lSkpY360PLuteLvM59n7auNSq', '+54 223344-55', NULL, 1, 1, NULL, '2026-07-03 00:00:49', '2026-09-01 14:40:10', NULL);

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
,`dni` varchar(20)
,`fecha_nacimiento` date
,`telefono` varchar(20)
,`activo` tinyint(1)
,`primer_login` tinyint(1)
,`ultimo_acceso` datetime
,`eliminado_en` datetime
,`zona_id` smallint(5) unsigned
,`zona_nombre` varchar(100)
,`zona_color` varchar(7)
,`dispositivo_id` int(10) unsigned
,`dispositivo_nombre` varchar(100)
,`dispositivo_ultima_conexion` datetime
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

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_operadores`  AS SELECT `u`.`id` AS `id`, `u`.`nombre` AS `nombre`, `u`.`apellido` AS `apellido`, concat(`u`.`nombre`,' ',`u`.`apellido`) AS `nombre_completo`, `u`.`dni` AS `dni`, `u`.`fecha_nacimiento` AS `fecha_nacimiento`, `u`.`telefono` AS `telefono`, `u`.`activo` AS `activo`, `u`.`primer_login` AS `primer_login`, `u`.`ultimo_acceso` AS `ultimo_acceso`, `u`.`eliminado_en` AS `eliminado_en`, `u`.`zona_id` AS `zona_id`, `z`.`nombre` AS `zona_nombre`, `z`.`color_hex` AS `zona_color`, `d`.`id` AS `dispositivo_id`, `d`.`nombre` AS `dispositivo_nombre`, `d`.`ultima_conexion` AS `dispositivo_ultima_conexion`, count(case when `a`.`estado_id` in (2,3) then 1 end) AS `alertas_activas`, count(case when `a`.`estado_id` = 4 and cast(`a`.`resuelto_en` as date) = curdate() then 1 end) AS `resueltas_hoy`, count(`a`.`id`) AS `total_historico` FROM (((`usuarios` `u` left join `zonas` `z` on(`u`.`zona_id` = `z`.`id`)) left join `dispositivos_hardware` `d` on(`d`.`operador_id` = `u`.`id` and `d`.`activo` = 1)) left join `alertas` `a` on(`a`.`operador_id` = `u`.`id`)) WHERE `u`.`rol_id` = 2 GROUP BY `u`.`id`, `u`.`nombre`, `u`.`apellido`, `u`.`dni`, `u`.`fecha_nacimiento`, `u`.`telefono`, `u`.`activo`, `u`.`primer_login`, `u`.`ultimo_acceso`, `u`.`eliminado_en`, `u`.`zona_id`, `z`.`nombre`, `z`.`color_hex`, `d`.`id`, `d`.`nombre`, `d`.`ultima_conexion` ;

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
-- Indices de la tabla `dispositivos_hardware`
--
ALTER TABLE `dispositivos_hardware`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token_device` (`token_device`),
  ADD UNIQUE KEY `uq_token_device` (`token_device`),
  ADD KEY `fk_dispositivo_operador` (`operador_id`);

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
  ADD KEY `idx_usuarios_activo` (`activo`),
  ADD KEY `fk_usuarios_zona` (`zona_id`),
  ADD KEY `idx_usuarios_dni` (`dni`);

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT de la tabla `camaras`
--
ALTER TABLE `camaras`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `dispositivos_hardware`
--
ALTER TABLE `dispositivos_hardware`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID = Número del dispositivo (Dispositivo #1, #2...)', AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `emails_log`
--
ALTER TABLE `emails_log`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT de la tabla `tokens_push`
--
ALTER TABLE `tokens_push`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
-- Filtros para la tabla `dispositivos_hardware`
--
ALTER TABLE `dispositivos_hardware`
  ADD CONSTRAINT `fk_dispositivo_operador` FOREIGN KEY (`operador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_usuarios_zona` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
