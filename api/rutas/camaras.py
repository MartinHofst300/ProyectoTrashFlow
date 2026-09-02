# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/camaras.py
Descripción: Administra las rutas del panel web vinculadas a los dispositivos de video (cámaras).
             Proporciona listado, detalle, alta, edición y baja de cámaras.
             También expone el endpoint /heartbeat para que el detector Python
             reporte su estado periódicamente sin necesidad de JWT.

Endpoints panel (JWT admin):
  GET    /api/camaras             — Listar todas las cámaras
  GET    /api/camaras/<id>        — Detalle de una cámara
  POST   /api/camaras             — Crear nueva cámara (genera token_api automáticamente)
  PATCH  /api/camaras/<id>        — Editar campos de una cámara
  DELETE /api/camaras/<id>        — Desactivar cámara (soft disable)

Endpoint detector Python (sin JWT, usa X-Camera-Token):
  POST   /api/camaras/heartbeat   — Actualiza ultima_conexion + estado='online'

Dependencias:
  - Flask, flask_jwt_extended, secrets
  - api.database (query)
"""

import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from api.database import query

# Registro del Blueprint para las cámaras
camaras_bp = Blueprint('camaras', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/camaras — Listar todas las cámaras
# ─────────────────────────────────────────────────────────────────────────────

@camaras_bp.route('/camaras', methods=['GET'])
@jwt_required()
def get_camaras():
    """
    GET /api/camaras

    Retorna la lista estructurada de todas las cámaras municipales registradas.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        camaras = query(
            """
            SELECT c.id, c.nombre, c.descripcion, c.ubicacion, c.latitud, c.longitud,
                   c.ip_stream, c.token_api, c.estado, c.ultima_conexion,
                   (SELECT COUNT(*) FROM alertas a WHERE a.camara_id = c.id) AS total_detecciones,
                   c.activa, c.zona_id
            FROM camaras c
            ORDER BY c.id
            """
        )

        for c in camaras:
            if c['latitud']  is not None: c['latitud']  = float(c['latitud'])
            if c['longitud'] is not None: c['longitud'] = float(c['longitud'])
            if c['ultima_conexion'] is not None:
                c['ultima_conexion'] = c['ultima_conexion'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify(camaras), 200
    except Exception as e:
        print(f"[GET camaras error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron obtener las cámaras"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/camaras/<id> — Detalle de una cámara
# ─────────────────────────────────────────────────────────────────────────────

@camaras_bp.route('/camaras/<int:camara_id>', methods=['GET'])
@jwt_required()
def get_camara_detail(camara_id):
    """
    GET /api/camaras/<camara_id>

    Retorna los datos específicos de configuración de una cámara individual.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        camaras = query(
            """
            SELECT c.id, c.nombre, c.descripcion, c.ubicacion, c.latitud, c.longitud,
                   c.ip_stream, c.token_api, c.estado, c.ultima_conexion,
                   (SELECT COUNT(*) FROM alertas a WHERE a.camara_id = c.id) AS total_detecciones,
                   c.activa, c.zona_id
            FROM camaras c
            WHERE c.id = %s
            """,
            (camara_id,)
        )

        if not camaras:
            return jsonify({"error": "No encontrado", "mensaje": f"Cámara con ID {camara_id} no encontrada"}), 404

        c = camaras[0]
        if c['latitud']  is not None: c['latitud']  = float(c['latitud'])
        if c['longitud'] is not None: c['longitud'] = float(c['longitud'])
        if c['ultima_conexion'] is not None:
            c['ultima_conexion'] = c['ultima_conexion'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify(c), 200
    except Exception as e:
        print(f"[GET camara detail error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener el detalle de la cámara"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/camaras — Crear nueva cámara
# ─────────────────────────────────────────────────────────────────────────────

@camaras_bp.route('/camaras', methods=['POST'])
@jwt_required()
def create_camara():
    """
    POST /api/camaras

    Crea una nueva cámara en el sistema.
    El token_api se genera automáticamente con secrets.token_hex(32).
    El admin debe copiar ese token y configurarlo en el detector Python
    como variable de entorno CAMERA_TOKEN.

    Campos requeridos: nombre, ubicacion, latitud, longitud
    Campos opcionales: descripcion, zona_id, ip_stream
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    nombre    = data.get("nombre")
    ubicacion = data.get("ubicacion")
    latitud   = data.get("latitud")
    longitud  = data.get("longitud")

    if not all([nombre, ubicacion, latitud is not None, longitud is not None]):
        return jsonify({"error": "Campos incompletos",
                        "mensaje": "nombre, ubicacion, latitud y longitud son obligatorios"}), 400

    descripcion = data.get("descripcion")
    zona_id     = data.get("zona_id")
    ip_stream   = data.get("ip_stream")

    if zona_id is not None:
        try:
            zona_id = int(zona_id)
            z = query("SELECT id FROM zonas WHERE id = %s AND activa = 1", (zona_id,))
            if not z:
                return jsonify({"error": "Zona inválida", "mensaje": "La zona no existe o está inactiva"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Formato inválido", "mensaje": "zona_id debe ser un entero"}), 400

    try:
        # Generar token único para autenticar al detector Python
        token_api = secrets.token_hex(32)  # 64 chars hex — suficientemente seguro

        nuevo_id = query(
            """
            INSERT INTO camaras
              (zona_id, nombre, descripcion, ubicacion, latitud, longitud,
               ip_stream, token_api, estado, activa, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'offline', 1, NOW())
            """,
            (zona_id, nombre, descripcion, ubicacion,
             float(latitud), float(longitud), ip_stream, token_api)
        )

        return jsonify({
            "ok": True,
            "id": nuevo_id,
            "nombre": nombre,
            "token_api": token_api  # Devolver al frontend para que el admin lo copie
        }), 201

    except Exception as e:
        print(f"[POST camaras error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo crear la cámara"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/camaras/<id> — Editar una cámara
# ─────────────────────────────────────────────────────────────────────────────

@camaras_bp.route('/camaras/<int:camara_id>', methods=['PATCH'])
@jwt_required()
def update_camara(camara_id):
    """
    PATCH /api/camaras/<camara_id>

    Edición parcial de los datos de configuración de una cámara.
    Permite cambiar nombre, ubicación, coordenadas, zona, ip_stream y estado de mantenimiento.
    No permite cambiar el token_api (se genera una sola vez al crear).
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    existente = query("SELECT id FROM camaras WHERE id = %s AND activa = 1", (camara_id,))
    if not existente:
        return jsonify({"error": "No encontrado", "mensaje": "Cámara no encontrada o inactiva"}), 404

    data = request.get_json() or {}

    set_clauses = []
    params = []

    campos_texto = ['nombre', 'descripcion', 'ubicacion', 'ip_stream']
    for campo in campos_texto:
        if campo in data:
            set_clauses.append(f"{campo} = %s")
            params.append(data[campo])

    if 'latitud' in data:
        try:
            set_clauses.append("latitud = %s")
            params.append(float(data['latitud']))
        except (ValueError, TypeError):
            return jsonify({"error": "Formato inválido", "mensaje": "latitud debe ser número"}), 400

    if 'longitud' in data:
        try:
            set_clauses.append("longitud = %s")
            params.append(float(data['longitud']))
        except (ValueError, TypeError):
            return jsonify({"error": "Formato inválido", "mensaje": "longitud debe ser número"}), 400

    if 'zona_id' in data:
        zona_id = data['zona_id']
        if zona_id is not None:
            try:
                zona_id = int(zona_id)
                z = query("SELECT id FROM zonas WHERE id = %s AND activa = 1", (zona_id,))
                if not z:
                    return jsonify({"error": "Zona inválida", "mensaje": "La zona no existe o está inactiva"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Formato inválido", "mensaje": "zona_id debe ser un entero"}), 400
        set_clauses.append("zona_id = %s")
        params.append(zona_id)

    if 'estado' in data:
        estado = data['estado']
        if estado not in ('online', 'offline', 'mantenimiento'):
            return jsonify({"error": "Estado inválido", "mensaje": "estado debe ser online, offline o mantenimiento"}), 400
        set_clauses.append("estado = %s")
        params.append(estado)

    if not set_clauses:
        return jsonify({"ok": True, "mensaje": "No se enviaron campos para actualizar"}), 200

    params.append(camara_id)
    sql = f"UPDATE camaras SET {', '.join(set_clauses)} WHERE id = %s"

    try:
        query(sql, params)
        return jsonify({"ok": True, "mensaje": "Cámara actualizada"}), 200
    except Exception as e:
        print(f"[PATCH camaras error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo actualizar la cámara"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/camaras/<id> — Desactivar cámara (soft disable)
# ─────────────────────────────────────────────────────────────────────────────

@camaras_bp.route('/camaras/<int:camara_id>', methods=['DELETE'])
@jwt_required()
def delete_camara(camara_id):
    """
    DELETE /api/camaras/<camara_id>

    Desactiva una cámara (activa = 0, estado = 'offline').
    No elimina físicamente el registro para preservar el historial de alertas.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        existente = query("SELECT id FROM camaras WHERE id = %s AND activa = 1", (camara_id,))
        if not existente:
            return jsonify({"error": "No encontrado", "mensaje": "Cámara no encontrada o ya desactivada"}), 404

        # Verificar si tiene alertas activas (pendientes/asignadas)
        alertas_activas = query(
            "SELECT COUNT(*) AS cnt FROM alertas WHERE camara_id = %s AND estado_id IN (1, 2, 3)",
            (camara_id,)
        )
        if alertas_activas and alertas_activas[0]['cnt'] > 0:
            return jsonify({
                "error": "Conflicto",
                "mensaje": f"La cámara tiene {alertas_activas[0]['cnt']} alerta(s) activa(s). Resolvalas antes de desactivarla."
            }), 409

        query(
            "UPDATE camaras SET activa = 0, estado = 'offline' WHERE id = %s",
            (camara_id,)
        )
        return jsonify({"ok": True, "mensaje": "Cámara desactivada correctamente"}), 200

    except Exception as e:
        print(f"[DELETE camaras error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo desactivar la cámara"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/camaras/heartbeat — Reporte de vida del detector (sin JWT)
# ─────────────────────────────────────────────────────────────────────────────

@camaras_bp.route('/camaras/heartbeat', methods=['POST'])
def camara_heartbeat():
    """
    POST /api/camaras/heartbeat

    Endpoint llamado periódicamente por el detector Python (cada ~30 segundos)
    para indicar que la cámara sigue activa, aunque no haya detectado basura.

    Autenticación: header X-Camera-Token con el token_api de la cámara.
    No requiere JWT.

    Actualiza:
      - camaras.ultima_conexion = NOW()
      - camaras.estado = 'online'
    """
    token = request.headers.get('X-Camera-Token')
    if not token:
        return jsonify({"error": "No autorizado", "mensaje": "Falta el header X-Camera-Token"}), 401

    camara = query(
        "SELECT id, nombre FROM camaras WHERE token_api = %s AND activa = 1",
        (token,)
    )
    if not camara:
        return jsonify({"error": "No autorizado", "mensaje": "Token de cámara inválido o cámara inactiva"}), 401

    try:
        query(
            "UPDATE camaras SET ultima_conexion = NOW(), estado = 'online' WHERE token_api = %s",
            (token,)
        )
        return jsonify({"ok": True, "camara_id": camara[0]['id']}), 200
    except Exception as e:
        print(f"[heartbeat error]: {e}")
        return jsonify({"error": "Error interno"}), 500
