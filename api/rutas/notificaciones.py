# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/notificaciones.py
Descripción: Administra las notificaciones internas enviadas a los administradores y operarios.
             Proporciona endpoints para recuperar las últimas notificaciones, marcar una única
             notificación como leída (PATCH) o marcar todas en lote (PATCH /leer-todas).

Dependencias:
  - Flask (Blueprint), flask_jwt_extended
  - api.database (query)
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.database import query

# Registro del Blueprint para notificaciones
notificaciones_bp = Blueprint('notificaciones', __name__)

@notificaciones_bp.route('/notificaciones', methods=['GET'])
@jwt_required()
def get_notifications():
    """
    GET /api/notificaciones
    
    Retorna una lista con las últimas 20 notificaciones asociadas al usuario autenticado.
    Filtra los resultados por el ID del usuario extraído del JWT.
    """
    user_id = get_jwt_identity()
    try:
        notifications = query(
            """
            SELECT id, usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en 
            FROM notificaciones 
            WHERE usuario_id = %s 
            ORDER BY creado_en DESC 
            LIMIT 20
            """,
            (user_id,)
        )
        
        # Formatea marcas temporales a formato ISO legible por JavaScript
        for n in notifications:
            if n['creado_en'] is not None:
                n['creado_en'] = n['creado_en'].strftime('%Y-%m-%dT%H:%M:%S')
                
        return jsonify(notifications), 200
    except Exception as e:
        print(f"[GET notifications error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron obtener las notificaciones"}), 500

@notificaciones_bp.route('/notificaciones/<int:notif_id>/leer', methods=['PATCH'])
@jwt_required()
def mark_as_read(notif_id):
    """
    PATCH /api/notificaciones/<notif_id>/leer
    
    Marca un mensaje de notificación específico como leído, guardando la fecha y hora de lectura.
    """
    user_id = get_jwt_identity()
    try:
        # Verifica que la notificación exista y pertenezca al usuario solicitante
        notif = query("SELECT id FROM notificaciones WHERE id = %s AND usuario_id = %s", (notif_id, user_id))
        if not notif:
            return jsonify({"error": "No encontrado", "mensaje": "Notificación no encontrada"}), 404
            
        # Modifica el estado en MySQL
        query("UPDATE notificaciones SET leida = 1, leida_en = NOW() WHERE id = %s", (notif_id,))
        return jsonify({"ok": True, "mensaje": "Notificación marcada como leída"}), 200
    except Exception as e:
        print(f"[PATCH read error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo actualizar la notificación"}), 500

@notificaciones_bp.route('/notificaciones/leer-todas', methods=['PATCH'])
@jwt_required()
def mark_all_as_read():
    """
    PATCH /api/notificaciones/leer-todas
    
    Marca todas las notificaciones actualmente no leídas del usuario logueado como leídas en un solo paso.
    """
    user_id = get_jwt_identity()
    try:
        query("UPDATE notificaciones SET leida = 1, leida_en = NOW() WHERE usuario_id = %s AND leida = 0", (user_id,))
        return jsonify({"ok": True, "mensaje": "Todas las notificaciones marcadas como leídas"}), 200
    except Exception as e:
        print(f"[PATCH read all error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron actualizar las notificaciones"}), 500
