# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/hardware.py
Descripción: Endpoints exclusivos para los dispositivos de campo (Arduino Nano ESP32).
             Provee un canal liviano de comunicación sin JWT complejo, autenticado
             mediante un token fijo por dispositivo (X-Device-Token).

             Endpoints para el ESP32 (sin JWT):
               GET  /api/hardware/alerta-pendiente      — Polling de alertas
               POST /api/hardware/confirmar/<alerta_id> — Confirmar recepción

             Endpoints para el panel web admin (JWT requerido):
               GET    /api/hardware/dispositivos                       — Listar dispositivos
               POST   /api/hardware/dispositivos                       — Crear dispositivo
               PATCH  /api/hardware/dispositivos/<id>/asignar          — Asignar operario
               DELETE /api/hardware/dispositivos/<id>                  — Desactivar dispositivo

Dependencias:
  - Flask (Blueprint), flask_jwt_extended
  - api.database (query)
"""

import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from api.database import query

# Registro del Blueprint de hardware
hardware_bp = Blueprint('hardware', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Función auxiliar: validar X-Device-Token
# ─────────────────────────────────────────────────────────────────────────────

def _get_device_by_token():
    """
    Valida la cabecera 'X-Device-Token' contra la tabla 'dispositivos_hardware'.
    Actualiza 'ultima_conexion' del dispositivo en cada llamada exitosa.

    @returns tuple (device_row, error_response, error_code)
      - Si el token es válido: (device, None, None)
      - Si hay error:         (None, jsonify_response, http_code)
    """
    token = request.headers.get('X-Device-Token')
    if not token:
        return None, jsonify({
            "error": "No autorizado",
            "mensaje": "Falta la cabecera X-Device-Token"
        }), 401

    devices = query(
        """
        SELECT d.id, d.nombre, d.operador_id,
               u.nombre AS operador_nombre
        FROM dispositivos_hardware d
        LEFT JOIN usuarios u ON d.operador_id = u.id
        WHERE d.token_device = %s AND d.activo = 1
        """,
        (token,)
    )

    if not devices:
        return None, jsonify({
            "error": "No autorizado",
            "mensaje": "Token de dispositivo inválido o dispositivo inactivo"
        }), 401

    device = devices[0]

    if not device['operador_id']:
        return None, jsonify({
            "error": "Sin asignar",
            "mensaje": "Este dispositivo no tiene ningún operario asignado"
        }), 409

    # Actualizar timestamp de última conexión (sin bloquear la respuesta)
    query(
        "UPDATE dispositivos_hardware SET ultima_conexion = NOW() WHERE token_device = %s",
        (token,)
    )

    return device, None, None


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/hardware/alerta-pendiente
# ─────────────────────────────────────────────────────────────────────────────

@hardware_bp.route('/hardware/alerta-pendiente', methods=['GET'])
def get_pending_alert():
    """
    GET /api/hardware/alerta-pendiente

    Endpoint de polling para el ESP32. Se consulta cada ~10 segundos.
    Autenticación: cabecera HTTP 'X-Device-Token'.

    Lógica:
      1. Valida el token del dispositivo y obtiene el operador_id asignado.
      2. Busca la notificación más reciente de tipo 'alerta_asignada' no leída
         para ese operario, junto con los datos de la alerta.
      3. Si la alerta ya fue resuelta/descartada, la marca como leída y no la envía.
      4. Devuelve JSON liviano con la información suficiente para el LCD.

    Cooldown (evita spam):
      Una vez que el ESP32 llama a /confirmar/<id>, la notificación queda
      con leida=1 y NO vuelve a aparecer en este endpoint. El operario
      no recibirá la misma alerta dos veces mientras la tenga confirmada.
    """
    device, err_response, err_code = _get_device_by_token()
    if err_response:
        return err_response, err_code

    operador_id = device['operador_id']

    try:
        notifs = query(
            """
            SELECT
                n.id          AS notif_id,
                n.alerta_id,
                n.titulo,
                n.mensaje,
                n.creado_en,
                a.direccion,
                a.latitud,
                a.longitud,
                a.estado_id,
                a.confianza
            FROM notificaciones n
            JOIN alertas a ON n.alerta_id = a.id
            WHERE n.usuario_id = %s
              AND n.tipo       = 'alerta_asignada'
              AND n.leida      = 0
            ORDER BY n.creado_en DESC
            LIMIT 1
            """,
            (operador_id,)
        )

        if not notifs:
            return jsonify({"alerta": None}), 200

        notif = notifs[0]

        # Si la alerta ya está resuelta o descartada, marcarla como leída
        # y no molestar al operario con ella
        if notif['estado_id'] in (4, 5):
            query(
                "UPDATE notificaciones SET leida = 1, leida_en = NOW() WHERE id = %s",
                (notif['notif_id'],)
            )
            return jsonify({"alerta": None}), 200

        # Formatear dirección para el LCD (máximo ~40 chars útiles)
        # La dirección completa de Nominatim puede ser muy larga;
        # extraemos sólo "Número, Calle, Ciudad" (primeras 2-3 partes)
        direccion_completa = notif['direccion'] or 'Dirección no disponible'
        partes = [p.strip() for p in direccion_completa.split(',')]
        # Tomar las primeras 3 partes significativas
        direccion_corta = ', '.join(partes[:3]) if len(partes) >= 3 else direccion_completa

        fecha_str = None
        if notif['creado_en']:
            fecha_str = notif['creado_en'].strftime('%d/%m %H:%M')

        return jsonify({
            "alerta": {
                "notif_id":         notif['notif_id'],
                "alerta_id":        notif['alerta_id'],
                "titulo":           notif['titulo'],
                "direccion":        direccion_corta,
                "direccion_completa": direccion_completa,
                "latitud":          float(notif['latitud'])  if notif['latitud']  else None,
                "longitud":         float(notif['longitud']) if notif['longitud'] else None,
                "confianza":        int(notif['confianza'])  if notif['confianza'] else None,
                "fecha":            fecha_str
            }
        }), 200

    except Exception as e:
        print(f"[Hardware Polling Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener la alerta"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/hardware/confirmar/<alerta_id>
# ─────────────────────────────────────────────────────────────────────────────

@hardware_bp.route('/hardware/confirmar/<int:alerta_id>', methods=['POST'])
def confirm_alert(alerta_id):
    """
    POST /api/hardware/confirmar/<alerta_id>

    El ESP32 llama a este endpoint inmediatamente después de mostrar la alerta
    en la pantalla LCD y activar el vibrador.

    Efecto:
      - Marca la notificación como leída (leida=1, leida_en=NOW())
      - Activa el cooldown: la misma alerta no volverá a aparecer en el polling
      - También actualiza el estado de la alerta a 'en_proceso' (estado_id=3)
        para que el panel web muestre que el operario está yendo al lugar
    """
    device, err_response, err_code = _get_device_by_token()
    if err_response:
        return err_response, err_code

    operador_id = device['operador_id']

    try:
        # 1. Marcar notificación como leída (inicia el cooldown)
        query(
            """
            UPDATE notificaciones
            SET    leida = 1, leida_en = NOW()
            WHERE  alerta_id  = %s
              AND  usuario_id = %s
              AND  tipo       = 'alerta_asignada'
              AND  leida      = 0
            """,
            (alerta_id, operador_id)
        )

        # 2. Cambiar estado de la alerta a 'en_proceso' (ID=3)
        #    Solo si está en estado 'asignada' (ID=2), para no romper el flujo
        alerta = query(
            "SELECT id, estado_id FROM alertas WHERE id = %s AND operador_id = %s",
            (alerta_id, operador_id)
        )

        if alerta and alerta[0]['estado_id'] == 2:
            query(
                "UPDATE alertas SET estado_id = 3, en_proceso_en = NOW() WHERE id = %s",
                (alerta_id,)
            )
            # Registrar en historial de auditoría
            query(
                """
                INSERT INTO historial_alertas (alerta_id, usuario_id, estado_id, notas, creado_en)
                VALUES (%s, %s, 3, 'Confirmado por dispositivo ESP32 en campo', NOW())
                """,
                (alerta_id, operador_id)
            )

        return jsonify({
            "ok":       True,
            "alerta_id": alerta_id,
            "mensaje":  "Alerta confirmada. El operario está en camino."
        }), 200

    except Exception as e:
        print(f"[Hardware Confirm Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo confirmar la alerta"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — Gestión de dispositivos (JWT requerido, solo admin)
# ─────────────────────────────────────────────────────────────────────────────

@hardware_bp.route('/hardware/dispositivos', methods=['GET'])
@jwt_required()
def list_devices():
    """
    GET /api/hardware/dispositivos

    Lista todos los dispositivos ESP32 registrados con su operario asignado
    y timestamp de última conexión.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        devices = query(
            """
            SELECT
                d.id,
                d.nombre,
                d.token_device,
                d.operador_id,
                d.activo,
                d.ultima_conexion,
                d.creado_en,
                u.nombre   AS operador_nombre,
                u.apellido AS operador_apellido
            FROM dispositivos_hardware d
            LEFT JOIN usuarios u ON d.operador_id = u.id
            ORDER BY d.id ASC
            """
        )

        # Formatear fechas para JSON
        for d in devices:
            if d['ultima_conexion']:
                d['ultima_conexion'] = d['ultima_conexion'].strftime('%Y-%m-%dT%H:%M:%S')
            if d['creado_en']:
                d['creado_en'] = d['creado_en'].strftime('%Y-%m-%dT%H:%M:%S')
            # Ocultar token completo en listado (mostrar solo últimos 8 chars)
            d['token_preview'] = '...' + d['token_device'][-8:]

        return jsonify({"dispositivos": devices, "total": len(devices)}), 200

    except Exception as e:
        print(f"[List Devices Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron listar los dispositivos"}), 500


@hardware_bp.route('/hardware/dispositivos', methods=['POST'])
@jwt_required()
def create_device():
    """
    POST /api/hardware/dispositivos

    Crea un nuevo dispositivo ESP32. Genera automáticamente un token único
    seguro que debe ser copiado al sketch del Arduino.

    Body JSON: { "nombre": "Dispositivo Campo #2" }
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()

    if not nombre:
        return jsonify({"error": "Campos incompletos", "mensaje": "El campo 'nombre' es obligatorio"}), 400

    try:
        # Generar token único y seguro criptográficamente
        token = f"trashflow_esp32_{secrets.token_hex(20)}"

        device_id = query(
            "INSERT INTO dispositivos_hardware (nombre, token_device) VALUES (%s, %s)",
            (nombre, token)
        )

        return jsonify({
            "ok":           True,
            "id":           device_id,
            "nombre":       nombre,
            "token_device": token,   # Mostrar completo solo al crear
            "mensaje":      f"Dispositivo #{device_id} creado. Copiar el token al sketch del ESP32."
        }), 201

    except Exception as e:
        print(f"[Create Device Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo crear el dispositivo"}), 500


@hardware_bp.route('/hardware/dispositivos/<int:device_id>/asignar', methods=['PATCH'])
@jwt_required()
def assign_device(device_id):
    """
    PATCH /api/hardware/dispositivos/<device_id>/asignar

    Asigna (o desasigna) un operario a un dispositivo ESP32.
    Si Ramiro usa el Dispositivo #1 y se rompe, basta con llamar
    a este endpoint para asignar el Dispositivo #2 a Ramiro.

    Body JSON: { "operador_id": 4 }   ← asignar
               { "operador_id": null } ← desasignar
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    operador_id = data.get('operador_id')  # Puede ser None para desasignar

    try:
        # Verificar que el dispositivo existe
        device = query("SELECT id, nombre FROM dispositivos_hardware WHERE id = %s", (device_id,))
        if not device:
            return jsonify({"error": "No encontrado", "mensaje": f"Dispositivo #{device_id} no encontrado"}), 404

        if operador_id is not None:
            operador_id = int(operador_id)
            # Verificar que el operario existe, tiene rol=2 y está activo
            operador = query(
                """
                SELECT id, nombre, apellido FROM usuarios
                WHERE id = %s AND rol_id = 2 AND activo = 1 AND eliminado_en IS NULL
                """,
                (operador_id,)
            )
            if not operador:
                return jsonify({"error": "No encontrado", "mensaje": "Operario no encontrado o inactivo"}), 404

            query(
                "UPDATE dispositivos_hardware SET operador_id = %s WHERE id = %s",
                (operador_id, device_id)
            )
            op = operador[0]
            return jsonify({
                "ok":      True,
                "mensaje": f"Dispositivo '{device[0]['nombre']}' asignado a {op['nombre']} {op['apellido']}"
            }), 200

        else:
            # Desasignar
            query(
                "UPDATE dispositivos_hardware SET operador_id = NULL WHERE id = %s",
                (device_id,)
            )
            return jsonify({
                "ok":      True,
                "mensaje": f"Dispositivo '{device[0]['nombre']}' desasignado correctamente"
            }), 200

    except Exception as e:
        print(f"[Assign Device Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo asignar el dispositivo"}), 500


@hardware_bp.route('/hardware/dispositivos/<int:device_id>', methods=['DELETE'])
@jwt_required()
def deactivate_device(device_id):
    """
    DELETE /api/hardware/dispositivos/<device_id>

    Desactiva un dispositivo (baja lógica). No lo elimina de la BD
    para conservar el historial. Un dispositivo desactivado no puede
    autenticarse con su token.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        device = query("SELECT id, nombre FROM dispositivos_hardware WHERE id = %s", (device_id,))
        if not device:
            return jsonify({"error": "No encontrado", "mensaje": f"Dispositivo #{device_id} no encontrado"}), 404

        query(
            "UPDATE dispositivos_hardware SET activo = 0, operador_id = NULL WHERE id = %s",
            (device_id,)
        )
        return jsonify({
            "ok":      True,
            "mensaje": f"Dispositivo '{device[0]['nombre']}' desactivado correctamente"
        }), 200

    except Exception as e:
        print(f"[Deactivate Device Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo desactivar el dispositivo"}), 500
