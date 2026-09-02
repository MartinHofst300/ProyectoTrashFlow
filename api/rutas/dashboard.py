# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/dashboard.py
Descripción: Proporciona las métricas unificadas y datos agregados para la construcción
             del panel principal de administración municipal (dashboard.html).
             Resuelve KPIs de rendimiento diario (variación porcentual con respecto al día de ayer),
             estadísticas históricas agrupadas por día de la semana y distribución por zona municipal.

Dependencias:
  - Flask (Blueprint), flask_jwt_extended
  - api.database (query)
"""

import datetime
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from api.database import query

# Registro del Blueprint del dashboard
dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/hoy', methods=['GET'])
@jwt_required()
def get_dashboard_today():
    """
    GET /api/dashboard/hoy
    
    Genera el consolidado de métricas clave (KPIs) del día actual.
    1. Consulta la vista MySQL 'vista_dashboard_hoy' para obtener el volumen de alertas del día.
    2. Calcula dinámicamente la variación porcentual de incidentes detectados en comparación con el día de ayer.
    3. Retorna la tasa porcentual de resolución de reportes del día.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        # 1. Obtiene métricas acumuladas desde la vista de base de datos
        dashboard_db = query("SELECT * FROM vista_dashboard_hoy")
        row = dashboard_db[0] if dashboard_db else {}

        # Mapea columnas a variables legibles
        alertas_hoy = int(row.get("total_hoy") or 0)
        pendientes = int(row.get("pendientes_hoy") or 0)
        resueltas = int(row.get("resueltas_hoy") or 0)
        tiempo_promedio_min = int(row.get("minutos_resolucion_promedio_hoy") or 0)

        # 2. Calcula variación porcentual respecto al día de ayer
        ayer_db = query(
            "SELECT COUNT(*) as count FROM alertas WHERE DATE(detectado_en) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"
        )
        alertas_ayer = int(ayer_db[0]['count']) if ayer_db else 0

        # Previene división por cero
        if alertas_ayer == 0:
            variacion_porcentual = 100 if alertas_hoy > 0 else 0
        else:
            variacion = ((alertas_hoy - alertas_ayer) / alertas_ayer) * 100.0
            variacion_porcentual = round(variacion)

        # Formatea el texto explicativo de variación para el panel visual (ej: "+12% vs ayer")
        signo = "+" if variacion_porcentual >= 0 else ""
        alertas_hoy_cambio = f"{signo}{variacion_porcentual}% vs ayer"

        # Calcula la tasa de alertas cerradas con éxito sobre el total del día
        resueltas_porcentaje = round((resueltas * 100.0) / (alertas_hoy or 1))

        return jsonify({
            "alertas_hoy": alertas_hoy,
            "alertas_hoy_cambio": alertas_hoy_cambio,
            "pendientes": pendientes,
            "pendientes_subtitulo": "En espera",
            "resueltas": resueltas,
            "resueltas_porcentaje": f"{resueltas_porcentaje}%",
            "tiempo_promedio": tiempo_promedio_min,
            "tiempo_promedio_subtitulo": "Tiempo de resolución"
        }), 200

    except Exception as e:
        print(f"[Dashboard Today Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron obtener las métricas del dashboard"}), 500


@dashboard_bp.route('/estadisticas/semanal', methods=['GET'])
@jwt_required()
def get_weekly_stats():
    """
    GET /api/estadisticas/semanal
    
    Retorna la tendencia temporal de incidentes acumulados.
    Obtiene las métricas diarias agrupando por fecha para los bloques de los últimos 7 y 30 días,
    permitiendo al frontend renderizar gráficos de tendencia lineal (con Chart.js).
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        # Consulta métricas diarias de la última semana
        diario_7 = query(
            """
            SELECT * FROM vista_estadisticas_diarias 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ORDER BY fecha ASC
            """
        )

        # Consulta métricas diarias del último mes
        diario_30 = query(
            """
            SELECT * FROM vista_estadisticas_diarias 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY fecha ASC
            """
        )

        # Formatea objetos date a strings ISO estándar (AAAA-MM-DD) para serialización JSON limpia
        for r in diario_7:
            if 'fecha' in r and r['fecha']:
                r['fecha'] = r['fecha'].strftime('%Y-%m-%d')
        for r in diario_30:
            if 'fecha' in r and r['fecha']:
                r['fecha'] = r['fecha'].strftime('%Y-%m-%d')

        return jsonify({
            "ultimos_7_dias": diario_7,
            "ultimos_30_dias": diario_30
        }), 200

    except Exception as e:
        print(f"[Weekly Stats Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron obtener las estadísticas semanales"}), 500


@dashboard_bp.route('/estadisticas/por-zona', methods=['GET'])
@jwt_required()
def get_zone_stats():
    """
    GET /api/estadisticas/por-zona
    
    Retorna el desglose del volumen de alertas por localidad o barrio (Centro, Olivos, Munro, etc.).
    Sirve para dibujar gráficos de distribución y diagramas geográficos.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        datos_zona = query("SELECT * FROM vista_estadisticas_por_zona ORDER BY total_alertas DESC")

        # Formatea marcas temporales de la última alerta a formato MySQL estándar string
        for r in datos_zona:
            if 'ultima_alerta' in r and r['ultima_alerta']:
                r['ultima_alerta'] = r['ultima_alerta'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify(datos_zona), 200

    except Exception as e:
        print(f"[Zone Stats Error] {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudieron obtener las estadísticas por zona"}), 500


@dashboard_bp.route('/sistema/estado', methods=['GET'])
def get_system_status():
    """
    GET /api/sistema/estado

    Endpoint público (sin JWT) que muestra el estado general del sistema en tiempo real.
    Útil para la presentación: permite mostrar que el backend, la BD y los componentes
    están operativos sin necesidad de iniciar sesión.

    Retorna:
      - Estado de la conexión a MySQL
      - Cantidad de cámaras activas
      - Cantidad de operarios activos con su zona
      - Alertas pendientes en este momento
      - Dispositivos hardware registrados y su última conexión
      - Timestamp del servidor
    """
    estado = {
        "sistema": "online",
        "timestamp": datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        "base_de_datos": "error",
        "camaras_activas": 0,
        "operarios_activos": 0,
        "alertas_pendientes": 0,
        "alertas_en_proceso": 0,
        "dispositivos_hardware": []
    }

    try:
        # Estado de la BD
        test_db = query("SELECT 1 AS ok")
        estado["base_de_datos"] = "online" if test_db else "error"

        # Cámaras activas
        camaras = query("SELECT COUNT(*) AS total FROM camaras WHERE activa = 1 AND estado = 'online'")
        estado["camaras_activas"] = int(camaras[0]['total']) if camaras else 0

        # Operarios activos
        operarios = query(
            """
            SELECT u.id, CONCAT(u.nombre, ' ', u.apellido) AS nombre, z.nombre AS zona
            FROM usuarios u
            LEFT JOIN zonas z ON u.zona_id = z.id
            WHERE u.rol_id = 2 AND u.activo = 1 AND u.eliminado_en IS NULL
            """
        )
        estado["operarios_activos"] = len(operarios)
        estado["operarios"] = [{
            "id": o['id'],
            "nombre": o['nombre'],
            "zona": o['zona'] or 'Sin zona'
        } for o in operarios]

        # Alertas actuales
        alertas_count = query(
            """
            SELECT
                SUM(CASE WHEN estado_id = 1 THEN 1 ELSE 0 END) AS pendientes,
                SUM(CASE WHEN estado_id IN (2,3) THEN 1 ELSE 0 END) AS en_proceso
            FROM alertas
            WHERE DATE(detectado_en) >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            """
        )
        if alertas_count:
            estado["alertas_pendientes"]  = int(alertas_count[0]['pendientes']  or 0)
            estado["alertas_en_proceso"]  = int(alertas_count[0]['en_proceso']  or 0)

        # Dispositivos hardware
        dispositivos = query(
            """
            SELECT d.id, d.nombre, d.activo, d.ultima_conexion,
                   CONCAT(u.nombre, ' ', u.apellido) AS operario_asignado
            FROM dispositivos_hardware d
            LEFT JOIN usuarios u ON d.operador_id = u.id
            """
        )
        estado["dispositivos_hardware"] = [{
            "id":               d['id'],
            "nombre":           d['nombre'],
            "activo":           bool(d['activo']),
            "operario":         d['operario_asignado'] or 'Sin asignar',
            "ultima_conexion":  d['ultima_conexion'].strftime('%Y-%m-%dT%H:%M:%S') if d['ultima_conexion'] else None
        } for d in dispositivos]

    except Exception as e:
        print(f"[System Status Error] {e}")
        estado["base_de_datos"] = "error"
        estado["error_detalle"] = str(e)

    return jsonify(estado), 200
