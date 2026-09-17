-- ============================================================
-- TrashFlow — Sembrado Completo de Demostración
-- 7 Zonas | 7 Cámaras | 14 Operadores (2 por zona) | 21 Alertas (3 por zona)
-- ============================================================

USE trashflow;

-- 1. Zonas
INSERT INTO `zonas` (`id`, `nombre`, `color_hex`, `activa`) VALUES
(1, 'Centro', '#EF4444', 1),
(2, 'Olivos', '#F5A623', 1),
(3, 'La Lucila', '#3B82F6', 1),
(4, 'Munro', '#10B981', 1),
(5, 'Villa Martelli', '#8B5CF6', 1),
(6, 'Florida', '#EC4899', 1),
(7, 'Carapachay', '#F97316', 1)
ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`), `color_hex`=VALUES(`color_hex`), `activa`=1;

-- 2. Cámaras (1 por cada zona)
INSERT INTO `camaras` (`id`, `zona_id`, `nombre`, `ubicacion`, `latitud`, `longitud`, `token_api`, `estado`, `activa`) VALUES
(1, 1, 'Cámara #1 - Centro', 'Av. Maipú 1500, Centro', -34.5250000, -58.4730000, 'token_camara_1_demo', 'online', 1),
(2, 2, 'Cámara #2 - Olivos', 'Av. del Libertador 2400, Olivos', -34.5100000, -58.4850000, 'token_camara_2_demo', 'online', 1),
(3, 3, 'Cámara #3 - La Lucila', 'Rawson 3500, La Lucila', -34.4980000, -58.4880000, 'token_camara_3_demo', 'online', 1),
(4, 4, 'Cámara #4 - Munro', 'Av. Mitre 2300, Munro', -34.5320000, -58.5250000, 'token_camara_4_demo', 'online', 1),
(5, 5, 'Cámara #5 - Villa Martelli', 'Av. Laprida 3800, Villa Martelli', -34.5550000, -58.5100000, 'token_camara_5_demo', 'online', 1),
(6, 6, 'Cámara #6 - Florida', 'Av. San Martín 2100, Florida', -34.5380000, -58.4900000, 'token_camara_6_demo', 'online', 1),
(7, 7, 'Cámara #7 - Carapachay', 'Av. Independencia 3100, Carapachay', -34.5280000, -58.5450000, 'token_camara_7_demo', 'online', 1)
ON DUPLICATE KEY UPDATE 
  `zona_id`=VALUES(`zona_id`), `nombre`=VALUES(`nombre`), `ubicacion`=VALUES(`ubicacion`),
  `latitud`=VALUES(`latitud`), `longitud`=VALUES(`longitud`), `estado`='online', `activa`=1;

-- 3. 14 Operadores de campo (2 por cada una de las 7 zonas)
-- Pass hash: $2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC
INSERT INTO `usuarios` (`id`, `rol_id`, `zona_id`, `dni`, `nombre`, `apellido`, `email`, `password_hash`, `telefono`, `activo`, `primer_login`, `creado_en`, `eliminado_en`) VALUES
(10, 2, 1, '38291045', 'Ramiro', 'Caballero', 'operador_1_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4589-2211', 1, 0, NOW(), NULL),
(11, 2, 1, '39120344', 'Martín', 'Álvarez', 'operador_1_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4721-3344', 1, 0, NOW(), NULL),
(12, 2, 2, '36441209', 'Marcos', 'Giménez', 'operador_2_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 5566-7788', 1, 0, NOW(), NULL),
(13, 2, 2, '40182933', 'Luciana', 'Benítez', 'operador_2_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4839-2019', 1, 0, NOW(), NULL),
(14, 2, 3, '41238910', 'Fausto', 'Coronel', 'operador_3_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 6729-1029', 1, 0, NOW(), NULL),
(15, 2, 3, '37882910', 'Camila', 'Rossi', 'operador_3_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4920-1928', 1, 0, NOW(), NULL),
(16, 2, 4, '35918234', 'Lucas', 'Fernández', 'operador_4_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 5829-1049', 1, 0, NOW(), NULL),
(17, 2, 4, '38719283', 'Gonzalo', 'Morales', 'operador_4_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4719-2830', 1, 0, NOW(), NULL),
(18, 2, 5, '36192847', 'Diego', 'Navarro', 'operador_5_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 5102-9384', 1, 0, NOW(), NULL),
(19, 2, 5, '42019283', 'Valeria', 'Sosa', 'operador_5_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4819-2049', 1, 0, NOW(), NULL),
(20, 2, 6, '39281049', 'Matías', 'Romero', 'operador_6_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 5928-1039', 1, 0, NOW(), NULL),
(21, 2, 6, '37192840', 'Florencia', 'Castro', 'operador_6_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4729-1048', 1, 0, NOW(), NULL),
(22, 2, 7, '40918273', 'Esteban', 'Paredes', 'operador_7_1@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 6019-2837', 1, 0, NOW(), NULL),
(23, 2, 7, '38471920', 'Julieta', 'Medina', 'operador_7_2@trashflow.local', '$2b$12$k0QiteYQljZm0dJJteUrO.RBe/u3lOtv7BglZSmwiGst50GCznCzC', '+54 11 4820-1938', 1, 0, NOW(), NULL)
ON DUPLICATE KEY UPDATE
  `rol_id`=2, `zona_id`=VALUES(`zona_id`), `dni`=VALUES(`dni`), `nombre`=VALUES(`nombre`),
  `apellido`=VALUES(`apellido`), `telefono`=VALUES(`telefono`), `activo`=1, `eliminado_en`=NULL;

-- 4. Limpieza de alertas previas
DELETE FROM `historial_alertas` WHERE `id` > 0;
DELETE FROM `notificaciones` WHERE `id` > 0;
UPDATE `emails_log` SET `alerta_id` = NULL WHERE `alerta_id` IS NOT NULL;
DELETE FROM `alertas` WHERE `id` > 0;
ALTER TABLE `alertas` AUTO_INCREMENT = 1;

-- 5. 21 Alertas simuladas (3 por zona): 7 Resueltas (verde), 7 Pendientes (rojo), 6 Asignadas/Alertadas (amarillo), 1 Descartada (gris)
-- Fotos reales rotadas sobre static/fotos/detecciones/
INSERT INTO `alertas` (`id`, `camara_id`, `zona_id`, `estado_id`, `operador_id`, `confianza`, `foto_url`, `latitud`, `longitud`, `direccion`, `notas_admin`, `detectado_en`, `asignado_en`, `en_proceso_en`, `resuelto_en`, `creado_en`) VALUES
-- Zona 1: Centro
(1, 1, 1, 4, 10, 88.50, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5245000, -58.4725000, 'Av. Maipú 1250, Centro', 'Resuelta con éxito por cuadrilla', '2026-09-12 11:13:00', '2026-09-12 11:16:00', '2026-09-12 11:21:00', '2026-09-12 11:37:00', '2026-09-12 11:13:00'),
(2, 1, 1, 1, NULL, 87.00, 'static/fotos/detecciones/deteccion_20260825_192319_cam1_conf85.jpg', -34.5215000, -58.4735000, 'Ricardo Gutiérrez 1520, Centro', NULL, '2026-09-16 14:19:00', NULL, NULL, NULL, '2026-09-16 14:19:00'),
(3, 1, 1, 2, 11, 85.20, 'static/fotos/detecciones/deteccion_20260901_182436_cam1_conf86.jpg', -34.5260000, -58.4740000, 'Borges 1930, Centro', 'Operario en ruta hacia el punto', '2026-09-16 15:15:00', '2026-09-16 15:19:00', NULL, NULL, '2026-09-16 15:15:00'),

-- Zona 2: Olivos
(4, 2, 2, 4, 12, 89.20, 'static/fotos/detecciones/deteccion_20260909_132214_cam1_conf89.jpg', -34.5095000, -58.4845000, 'Av. del Libertador 2420, Olivos', 'Resuelta con éxito por cuadrilla', '2026-09-13 11:16:00', '2026-09-13 11:19:00', '2026-09-13 11:24:00', '2026-09-13 11:40:00', '2026-09-13 11:16:00'),
(5, 2, 2, 1, NULL, 88.00, 'static/fotos/detecciones/deteccion_20260909_132609_cam1_conf87.jpg', -34.5110000, -58.4860000, 'Corrientes 450, Olivos', NULL, '2026-09-16 14:23:00', NULL, NULL, NULL, '2026-09-16 14:23:00'),
(6, 2, 2, 2, 13, 86.40, 'static/fotos/detecciones/deteccion_20260909_133546_cam1_conf89.jpg', -34.5080000, -58.4830000, 'Mariano Pelliza 1120, Olivos', 'Operario asignado', '2026-09-16 15:20:00', '2026-09-16 15:24:00', NULL, NULL, '2026-09-16 15:20:00'),

-- Zona 3: La Lucila
(7, 3, 3, 4, 14, 91.00, 'static/fotos/detecciones/deteccion_20260915_224219_cam1_conf86.jpg', -34.4975000, -58.4875000, 'Rawson 3510, La Lucila', 'Resuelta con éxito por cuadrilla', '2026-09-14 11:19:00', '2026-09-14 11:22:00', '2026-09-14 11:27:00', '2026-09-14 11:43:00', '2026-09-14 11:19:00'),
(8, 3, 3, 1, NULL, 89.50, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.4990000, -58.4890000, 'Roma 1240, La Lucila', NULL, '2026-09-16 14:27:00', NULL, NULL, NULL, '2026-09-16 14:27:00'),
(9, 3, 3, 2, 15, 87.10, 'static/fotos/detecciones/deteccion_20260825_192319_cam1_conf85.jpg', -34.4965000, -58.4860000, 'Díaz Vélez 720, La Lucila', 'Operario asignado', '2026-09-16 15:25:00', '2026-09-16 15:29:00', NULL, NULL, '2026-09-16 15:25:00'),

-- Zona 4: Munro
(10, 4, 4, 4, 16, 88.00, 'static/fotos/detecciones/deteccion_20260901_182436_cam1_conf86.jpg', -34.5315000, -58.5245000, 'Av. Mitre 2350, Munro', 'Resuelta con éxito por cuadrilla', '2026-09-15 11:22:00', '2026-09-15 11:25:00', '2026-09-15 11:30:00', '2026-09-15 11:46:00', '2026-09-15 11:22:00'),
(11, 4, 4, 1, NULL, 86.80, 'static/fotos/detecciones/deteccion_20260909_132214_cam1_conf89.jpg', -34.5330000, -58.5260000, 'Vélez Sársfield 4120, Munro', NULL, '2026-09-16 14:31:00', NULL, NULL, NULL, '2026-09-16 14:31:00'),
(12, 4, 4, 2, 17, 85.50, 'static/fotos/detecciones/deteccion_20260909_132609_cam1_conf87.jpg', -34.5305000, -58.5230000, 'Carlos Villate 3850, Munro', 'Operario asignado', '2026-09-16 15:30:00', '2026-09-16 15:34:00', NULL, NULL, '2026-09-16 15:30:00'),

-- Zona 5: Villa Martelli
(13, 5, 5, 4, 18, 90.00, 'static/fotos/detecciones/deteccion_20260909_133546_cam1_conf89.jpg', -34.5545000, -58.5095000, 'Av. Laprida 3820, Villa Martelli', 'Resuelta con éxito por cuadrilla', '2026-09-11 11:25:00', '2026-09-11 11:28:00', '2026-09-11 11:33:00', '2026-09-11 11:49:00', '2026-09-11 11:25:00'),
(14, 5, 5, 1, NULL, 87.20, 'static/fotos/detecciones/deteccion_20260915_224219_cam1_conf86.jpg', -34.5560000, -58.5110000, 'Venezuela 230, Villa Martelli', NULL, '2026-09-16 14:35:00', NULL, NULL, NULL, '2026-09-16 14:35:00'),
(15, 5, 5, 2, 19, 86.00, 'static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg', -34.5535000, -58.5080000, 'General Güemes 1410, Villa Martelli', 'Operario asignado', '2026-09-16 15:35:00', '2026-09-16 15:39:00', NULL, NULL, '2026-09-16 15:35:00'),

-- Zona 6: Florida
(16, 6, 6, 4, 20, 89.00, 'static/fotos/detecciones/deteccion_20260825_192319_cam1_conf85.jpg', -34.5375000, -58.4895000, 'Av. San Martín 2140, Florida', 'Resuelta con éxito por cuadrilla', '2026-09-13 11:28:00', '2026-09-13 11:31:00', '2026-09-13 11:36:00', '2026-09-13 11:52:00', '2026-09-13 11:28:00'),
(17, 6, 6, 1, NULL, 88.30, 'static/fotos/detecciones/deteccion_20260901_182436_cam1_conf86.jpg', -34.5390000, -58.4910000, 'Vergara 1820, Florida', NULL, '2026-09-16 14:39:00', NULL, NULL, NULL, '2026-09-16 14:39:00'),
(18, 6, 6, 2, 21, 87.50, 'static/fotos/detecciones/deteccion_20260909_132214_cam1_conf89.jpg', -34.5365000, -58.4880000, 'Hipólito Yrigoyen 2930, Florida', 'Operario asignado', '2026-09-16 15:40:00', '2026-09-16 15:44:00', NULL, NULL, '2026-09-16 15:40:00'),

-- Zona 7: Carapachay
(19, 7, 7, 4, 22, 92.00, 'static/fotos/detecciones/deteccion_20260909_132609_cam1_conf87.jpg', -34.5275000, -58.5445000, 'Av. Independencia 3120, Carapachay', 'Resuelta con éxito por cuadrilla', '2026-09-15 11:31:00', '2026-09-15 11:34:00', '2026-09-15 11:39:00', '2026-09-15 11:55:00', '2026-09-15 11:31:00'),
(20, 7, 7, 1, NULL, 89.00, 'static/fotos/detecciones/deteccion_20260909_133546_cam1_conf89.jpg', -34.5290000, -58.5460000, 'Drysdale 4850, Carapachay', NULL, '2026-09-16 14:43:00', NULL, NULL, NULL, '2026-09-16 14:43:00');

-- 6. Dispositivo Hardware ESP32 y Notificación activa para pruebas
INSERT INTO `dispositivos_hardware` (`id`, `nombre`, `token_device`, `operador_id`, `activo`, `ultima_conexion`, `creado_en`) VALUES
(1, 'Dispositivo Operario ESP32', 'trashflow_esp32_device_token_demo_2026', 11, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`), `token_device`=VALUES(`token_device`), `operador_id`=VALUES(`operador_id`), `activo`=1;

INSERT INTO `notificaciones` (`id`, `usuario_id`, `alerta_id`, `tipo`, `titulo`, `mensaje`, `leida`, `creado_en`) VALUES
(1, 11, 3, 'alerta_asignada', 'Nueva Alerta Asignada', 'Se detectaron residuos en Borges 1930, Centro', 0, '2026-09-16 15:15:00')
ON DUPLICATE KEY UPDATE `usuario_id`=VALUES(`usuario_id`), `alerta_id`=VALUES(`alerta_id`), `leida`=0;
