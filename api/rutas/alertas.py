# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/alertas.py
Descripción: Endpoint RESTful para la creación, obtención, filtrado y modificación de alertas de basura.
             Contiene la lógica clave para la recepción de fotos y coordenadas del detector (detector.py),
             geolocalización inversa automática, asignación manual de operarios e historial de auditoría.

Dependencias:
  - requests, Flask (Blueprint), flask_jwt_extended
  - api.database (query)
  - api.config (UPLOAD_FOLDER)
  - api.servicios.email_service (Notificaciones por correo)
"""

import os
import time
import requests
import threading
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from werkzeug.utils import secure_filename
from api.database import query
from api.config import UPLOAD_FOLDER
from api.servicios.email_service import send_alerta_nueva, send_alerta_asignada

# Registro del Blueprint de alertas
alertas_bp = Blueprint('alertas', __name__)

@alertas_bp.route('/alertas/deteccion', methods=['POST'])
def receive_detection():
    """
    POST /api/alertas/deteccion
    
    API de uso exclusivo del modelo de Inteligencia Artificial (detector.py) ejecutándose en las cámaras.
    Valida la cabecera 'X-Camera-Token' contra la base de datos de cámaras activas.
    Geolocaliza las coordenadas usando Nominatim (OpenStreetMap) de forma gratuita.
    Guarda la foto de evidencia en el disco e inserta la alerta (ID estado 1 = pendiente) en MySQL,
    disparando correos electrónicos y alertas internas para los administradores del municipio.
    """
    # 1. Validación de seguridad de la cámara por cabecera HTTP
    token = request.headers.get("X-Camera-Token")
    if not token:
        return jsonify({"error": "No autorizado", "mensaje": "Falta la cabecera X-Camera-Token"}), 401

    # Obtiene parámetros del formulario multipart (Multipart Form Data)
    camara_id = request.form.get("camara_id")
    confianza = request.form.get("confianza")
    latitud = request.form.get("latitud")
    longitud = request.form.get("longitud")

    if not all([camara_id, confianza, latitud, longitud]):
        return jsonify({"error": "Campos incompletos", "mensaje": "camara_id, confianza, latitud y longitud son requeridos"}), 400

    try:
        camara_id = int(camara_id)
        confianza = float(confianza)
        latitud = float(latitud)
        longitud = float(longitud)
    except ValueError:
        return jsonify({"error": "Formato inválido", "mensaje": "Campos numéricos inválidos"}), 400

    # La confianza de IA se expresa como flotante de 0.0 a 1.0
    if confianza < 0.0 or confianza > 1.0:
        return jsonify({"error": "Valor inválido", "mensaje": "La confianza debe estar entre 0.0 y 1.0"}), 400

    # Filtro municipal: Descartar inmediatamente detecciones con menos del 85% de confianza
    confianza_porcentaje = confianza * 100.0
    if confianza_porcentaje < 85.0:
        return jsonify({"error": "Confianza insuficiente", "mensaje": "Detección descartada por baja confianza"}), 422

    # 2. Verifica la validez del token de la cámara en MySQL
    camaras_db = query("SELECT id, activa, zona_id FROM camaras WHERE id = %s AND token_api = %s", (camara_id, token))
    if not camaras_db:
        return jsonify({"error": "No autorizado", "mensaje": "Token de cámara o ID de cámara incorrecto"}), 401

    camara = camaras_db[0]
    if not camara['activa']:
        return jsonify({"error": "Cámara inactiva", "mensaje": "La cámara especificada no está activa en el sistema"}), 403

    # 3. Guardado físico del archivo fotográfico
    if 'foto' not in request.files:
        return jsonify({"error": "Falta archivo", "mensaje": "La foto de la detección es requerida"}), 400

    file = request.files['foto']
    if file.filename == '':
        return jsonify({"error": "Falta archivo", "mensaje": "El archivo de foto no tiene nombre"}), 400

    # Sanea el nombre de archivo e impone extensión .jpg
    filename = secure_filename(file.filename)
    if not filename.lower().endswith(('.jpg', '.jpeg')):
        filename = f"deteccion_{int(time.time())}.jpg"

    # Crea el directorio si es la primera ejecución
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # Ruta relativa que el frontend usará para renderizar la foto en las tablas
    foto_url = f"static/fotos/detecciones/{filename}"

    # 4. Geolocalización Inversa (Reverse Geocoding)
    # Traduce coordenadas geográficas (latitud, longitud) a una dirección postal legible
    direccion = None
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={latitud}&lon={longitud}&format=json"
        headers = {"User-Agent": "TrashFlow/1.0 (Vicente Lopez FabLab)"}
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            direccion = data.get("display_name")
    except Exception as e:
        print(f"[Geocoding Warning] Falló reverse geocoding con Nominatim: {e}")

    # 5. Inserción de la Alerta en MySQL
    zona_id = camara['zona_id']
    try:
        # Registra la alerta en la base de datos
        alerta_id = query(
            """
            INSERT INTO alertas (camara_id, zona_id, estado_id, confianza, foto_url, latitud, longitud, direccion, detectado_en, creado_en)
            VALUES (%s, %s, 1, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (camara_id, zona_id, confianza_porcentaje, foto_url, latitud, longitud, direccion)
        )

        # Genera notificación interna para los paneles de administración (usuario_id = 1)
        query(
            """
            INSERT INTO notificaciones (usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en)
            VALUES (1, %s, 'Nueva Alerta Detectada', %s, 'nueva_alerta', 0, NOW())
            """,
            (alerta_id, f"Basura detectada en {direccion or 'Vicente López'} (Confianza: {confianza_porcentaje:.1f}%)")
        )

        # Incrementa contador de estadísticas de la cámara y actualiza la marca temporal
        query(
            """
            UPDATE camaras
            SET total_detecciones = total_detecciones + 1, ultima_conexion = NOW(), estado = 'online'
            WHERE id = %s
            """,
            (camara_id,)
        )

        # Dispara correo electrónico en segundo plano para no demorar la respuesta de la cámara (Non-blocking)
        threading.Thread(target=send_alerta_nueva, args=(alerta_id,)).start()

        return jsonify({
            "ok": True,
            "alerta_id": alerta_id,
            "mensaje": "Alerta creada correctamente",
            "direccion": direccion
        }), 201

    except Exception as e:
        print(f"[Create Alert Error] {e}")
        return jsonify({"error": "Error de base de datos", "mensaje": "No se pudo registrar la alerta"}), 500


def map_alert(row):
    """
    Función de mapeo utilitaria. Traduce los nombres de columnas devueltos por
    MySQL en claves legibles e idóneas para los scripts del panel web.
    """
    if not row:
        return {}
    
    fecha_dt = row.get("detectado_en")
    fecha_str = fecha_dt.strftime("%Y-%m-%dT%H:%M:%S") if fecha_dt else None

    return {
        "id": row.get("id"),
        "foto": row.get("foto_url"),
        "zona": row.get("zona_nombre") or "General",
        "direccion": row.get("direccion") or row.get("camara_ubicacion") or "Vicente López",
        "tipo": "Bolsa de residuos",
        "estado": row.get("estado"),
        "fecha": fecha_str,
        "operador": row.get("operador_nombre") or "Sin asignar",
        "confianza": int(row.get("confianza", 0)),
        "latitud": float(row.get("latitud", 0.0)) if row.get("latitud") is not None else None,
        "longitud": float(row.get("longitud", 0.0)) if row.get("longitud") is not None else None,
        "estado_color": row.get("estado_color"),
        "zona_color": row.get("zona_color"),
        "foto_url": row.get("foto_url"),
        "zona_id": row.get("zona_id")
    }

@alertas_bp.route('/alertas', methods=['GET'])
@jwt_required()
def get_alerts():
    """
    GET /api/alertas
    
    Lista y filtra alertas utilizando paginación. Consulta a la vista MySQL estructurada
    'vista_alertas_completa' para evitar realizar joins complejos en cada petición.
    Exclusivo para administradores.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    # Parámetros de filtrado
    zona = request.args.get('zona')
    estado = request.args.get('estado')
    fecha = request.args.get('fecha')
    camara_id = request.args.get('camara_id')
    
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        if page < 1: page = 1
        if per_page < 1: per_page = 10
    except ValueError:
        return jsonify({"error": "Parámetro inválido", "mensaje": "page y per_page deben ser números enteros"}), 400

    where_clauses = []
    params = []

    # Ignora valores por defecto de la interfaz y añade cláusulas WHERE dinámicamente
    if zona and zona != 'Todas las Zonas':
        where_clauses.append("zona_nombre = %s")
        params.append(zona)
        
    if estado and estado != 'Todos los Estados':
        state_map = {
            "pendiente": "pendiente",
            "asignada": "asignada",
            "en proceso": "en_proceso",
            "en_proceso": "en_proceso",
            "resuelta": "resuelta",
            "descartada": "descartada"
        }
        db_estado = state_map.get(estado.lower(), estado.lower())
        where_clauses.append("estado = %s")
        params.append(db_estado)
        
    if fecha:
        where_clauses.append("DATE(detectado_en) = %s")
        params.append(fecha)

    if camara_id:
        where_clauses.append("camara_id = %s")
        params.append(camara_id)

    # Concatena las cláusulas del filtro
    where_str = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    try:
        # Obtiene el recuento total para calcular cantidad de páginas en la UI
        count_sql = f"SELECT COUNT(*) as total FROM vista_alertas_completa{where_str}"
        count_res = query(count_sql, params)
        total_items = count_res[0]['total'] if count_res else 0

        # Obtiene los registros para la página solicitada (LIMIT/OFFSET)
        offset = (page - 1) * per_page
        data_sql = f"SELECT * FROM vista_alertas_completa{where_str} ORDER BY detectado_en DESC LIMIT {int(per_page)} OFFSET {int(offset)}"
        alertas = query(data_sql, params)

        # Mapea las filas MySQL al formato adecuado para JS
        alertas_mapeadas = [map_alert(a) for a in alertas]
        total_paginas = (total_items + per_page - 1) // per_page if total_items > 0 else 1

        return jsonify({
            "alertas": alertas_mapeadas,
            "total": total_items,
            "page": page,
            "per_page": per_page,
            "total_paginas": total_paginas
        }), 200

    except Exception as e:
        print(f"[List Alerts Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener la lista de alertas"}), 500


@alertas_bp.route('/alertas/<int:alerta_id>', methods=['GET'])
@jwt_required()
def get_alert_detail(alerta_id):
    """
    GET /api/alertas/<alerta_id>
    
    Retorna el objeto JSON con el detalle minucioso de una alerta específica.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        alertas = query("SELECT * FROM vista_alertas_completa WHERE id = %s", (alerta_id,))
        if not alertas:
            return jsonify({"error": "No encontrado", "mensaje": f"Alerta con ID {alerta_id} no encontrada"}), 404

        return jsonify(map_alert(alertas[0])), 200
    except Exception as e:
        print(f"[Detail Alert Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener el detalle de la alerta"}), 500


@alertas_bp.route('/alertas/<int:alerta_id>/estado', methods=['PATCH'])
@jwt_required()
def update_alert_status(alerta_id):
    """
    PATCH /api/alertas/<alerta_id>/estado
    
    Actualiza el estado operativo de una alerta y genera una fila de auditoría en
    'historial_alertas' registrando quién operó el cambio y en qué fecha.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    usuario_id = get_jwt_identity()
    data = request.get_json() or {}
    estado_id = data.get("estado_id")
    notas = data.get("notas", "")

    if estado_id is None:
        return jsonify({"error": "Campos incompletos", "mensaje": "El campo estado_id es obligatorio"}), 400

    try:
        estado_id = int(estado_id)
    except ValueError:
        return jsonify({"error": "Formato inválido", "mensaje": "estado_id debe ser un entero"}), 400

    estados = query("SELECT id FROM estados_alerta WHERE id = %s", (estado_id,))
    if not estados:
        return jsonify({"error": "Estado inválido", "mensaje": f"El estado con ID {estado_id} no existe"}), 400

    try:
        alertas = query("SELECT id, estado_id FROM alertas WHERE id = %s", (alerta_id,))
        if not alertas:
            return jsonify({"error": "No encontrado", "mensaje": "La alerta especificada no existe"}), 404

        # Construcción dinámica de la actualización
        set_clauses = ["estado_id = %s", "notas_admin = %s"]
        params = [estado_id, notas]

        # Estampa fechas correspondientes según el estado al que pasa
        if estado_id == 2:
            set_clauses.append("asignado_en = NOW()")
            operador_id = data.get("operador_id")
            if operador_id is not None:
                set_clauses.append("operador_id = %s")
                params.append(operador_id)
        elif estado_id == 3:
            set_clauses.append("en_proceso_en = NOW()")
        elif estado_id == 4:
            set_clauses.append("resuelto_en = NOW()")

        params.append(alerta_id)
        update_sql = f"UPDATE alertas SET {', '.join(set_clauses)} WHERE id = %s"
        
        query(update_sql, params)

        # Historial de auditoría
        query(
            """
            INSERT INTO historial_alertas (alerta_id, usuario_id, estado_id, notas, creado_en)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (alerta_id, usuario_id, estado_id, notas)
        )

        # Creación de notificaciones internas del sistema según el estado
        if estado_id == 2 and data.get("operador_id") is not None:
            operador_id_val = int(data.get("operador_id"))
            alerta_info = query("SELECT direccion FROM alertas WHERE id = %s", (alerta_id,))
            direccion_alerta = alerta_info[0]['direccion'] if alerta_info else f"ID {alerta_id}"
            query(
                """
                INSERT INTO notificaciones (usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en)
                VALUES (%s, %s, 'Nueva Alerta Asignada', %s, 'alerta_asignada', 0, NOW())
                """,
                (operador_id_val, alerta_id, f"Se te ha asignado la recolección en {direccion_alerta or 'Vicente López'}.")
            )
        elif estado_id == 4:
            alerta_info = query("SELECT direccion FROM alertas WHERE id = %s", (alerta_id,))
            direccion_alerta = alerta_info[0]['direccion'] if alerta_info else f"ID {alerta_id}"
            query(
                """
                INSERT INTO notificaciones (usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en)
                VALUES (1, %s, 'Alerta Resuelta', %s, 'alerta_resuelta', 0, NOW())
                """,
                (alerta_id, f"La alerta en {direccion_alerta or 'Vicente López'} ha sido marcada como resuelta.")
            )

        # Notificación vía Email al operario de recolección asignado
        if estado_id == 2 and data.get("operador_id") is not None:
            threading.Thread(
                target=send_alerta_asignada, 
                args=(alerta_id, data.get("operador_id"))
            ).start()

        return jsonify({
            "ok": True,
            "alerta_id": alerta_id,
            "estado_id": estado_id,
            "mensaje": "Estado de alerta actualizado correctamente"
        }), 200

    except Exception as e:
        print(f"[Update Status Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo actualizar el estado de la alerta"}), 500


@alertas_bp.route('/alertas/<int:alerta_id>/asignar', methods=['PATCH'])
@jwt_required()
def assign_alert_operator(alerta_id):
    """
    PATCH /api/alertas/<alerta_id>/asignar
    
    Asigna un operador de campo (recolector) a un reporte de residuos.
    Cambia automáticamente el estado a 'asignada' y notifica al operador.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    usuario_id = get_jwt_identity()
    data = request.get_json() or {}
    operador_id = data.get("operador_id")

    if operador_id is None:
        return jsonify({"error": "Campos incompletos", "mensaje": "El campo operador_id es obligatorio"}), 400

    try:
        operador_id = int(operador_id)
    except ValueError:
        return jsonify({"error": "Formato inválido", "mensaje": "operador_id debe ser un entero"}), 400

    try:
        # 1. Comprueba existencia de la alerta y que esté en estado 'pendiente'
        alerta = query("SELECT id, estado_id FROM alertas WHERE id = %s", (alerta_id,))
        if not alerta:
            return jsonify({"error": "No encontrado", "mensaje": f"Alerta con ID {alerta_id} no encontrada"}), 404
        
        if alerta[0]['estado_id'] != 1:
            return jsonify({"error": "Conflicto", "mensaje": "Solo se pueden asignar alertas pendientes"}), 409

        # 2. Comprueba existencia y disponibilidad del operador
        operador = query(
            "SELECT id FROM usuarios WHERE id = %s AND rol_id = 2 AND activo = 1 AND eliminado_en IS NULL",
            (operador_id,)
        )
        if not operador:
            return jsonify({"error": "No encontrado", "mensaje": "Operador no encontrado o inactivo"}), 404

        # 3. Asigna operador y actualiza estado a 2 (asignada)
        query(
            "UPDATE alertas SET operador_id = %s, estado_id = 2, asignado_en = NOW() WHERE id = %s",
            (operador_id, alerta_id)
        )

        # 4. Registra auditoría
        query(
            """
            INSERT INTO historial_alertas (alerta_id, usuario_id, estado_id, notas, creado_en)
            VALUES (%s, %s, 2, 'Operador asignado desde panel', NOW())
            """,
            (alerta_id, usuario_id)
        )

        # Genera notificación interna para la app del operario
        alerta_info = query("SELECT direccion FROM alertas WHERE id = %s", (alerta_id,))
        direccion_alerta = alerta_info[0]['direccion'] if alerta_info else f"ID {alerta_id}"
        query(
            """
            INSERT INTO notificaciones (usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en)
            VALUES (%s, %s, 'Nueva Alerta Asignada', %s, 'alerta_asignada', 0, NOW())
            """,
            (operador_id, alerta_id, f"Se te ha asignado la recolección en {direccion_alerta or 'Vicente López'}.")
        )

        # Envía notificación de asignación por correo electrónico (hilo paralelo)
        threading.Thread(target=send_alerta_asignada, args=(alerta_id, operador_id)).start()

        return jsonify({"ok": True, "mensaje": "Operador asignado correctamente"}), 200

    except Exception as e:
        print(f"[Assign Operator Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo asignar el operador a la alerta"}), 500
