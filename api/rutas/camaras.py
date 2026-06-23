# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/camaras.py
Descripción: Administra las rutas del panel web vinculadas a los dispositivos de video (cámaras).
             Proporciona únicamente el listado y detalle de los dispositivos registrados en el sistema.
             (Se ha removido la funcionalidad de transmisión en vivo / streaming).

Dependencias:
  - Flask, flask_jwt_extended
  - api.database (query)
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from api.database import query

# Registro del Blueprint para las cámaras
camaras_bp = Blueprint('camaras', __name__)



@camaras_bp.route('/camaras', methods=['GET'])
@jwt_required()
def get_camaras():
    """
    GET /api/camaras
    
    Retorna la lista estructurada de todas las cámaras municipales registradas.
    Permite validar ubicaciones, nombres y estados en el frontend.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        camaras = query(
            """
            SELECT id, nombre, descripcion, ubicacion, latitud, longitud, 
                   ip_stream, estado, ultima_conexion, total_detecciones, activa, zona_id 
            FROM camaras
            """
        )
        
        # Convierte tipos decimal y fecha de MySQL a tipos nativos serializables en JSON
        for c in camaras:
            if c['latitud'] is not None:
                c['latitud'] = float(c['latitud'])
            if c['longitud'] is not None:
                c['longitud'] = float(c['longitud'])
            if c['ultima_conexion'] is not None:
                c['ultima_conexion'] = c['ultima_conexion'].strftime('%Y-%m-%d %H:%M:%S')
                
        return jsonify(camaras), 200
    except Exception as e:
        print(f"[GET camaras error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron obtener las cámaras"}), 500


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
            SELECT id, nombre, descripcion, ubicacion, latitud, longitud, 
                   ip_stream, estado, ultima_conexion, total_detecciones, activa, zona_id 
            FROM camaras 
            WHERE id = %s
            """, 
            (camara_id,)
        )
        
        if not camaras:
            return jsonify({"error": "No encontrado", "mensaje": f"Cámara con ID {camara_id} no encontrada"}), 404
            
        c = camaras[0]
        if c['latitud'] is not None:
            c['latitud'] = float(c['latitud'])
        if c['longitud'] is not None:
            c['longitud'] = float(c['longitud'])
        if c['ultima_conexion'] is not None:
            c['ultima_conexion'] = c['ultima_conexion'].strftime('%Y-%m-%d %H:%M:%S')
            
        return jsonify(c), 200
    except Exception as e:
        print(f"[GET camara detail error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener el detalle de la cámara"}), 500



