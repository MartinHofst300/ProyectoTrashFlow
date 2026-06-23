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
