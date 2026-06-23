# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: app.py
Descripción: Punto de entrada (entrypoint) principal del servidor backend de la API REST.
             Inicializa la aplicación de Flask, configura el intercambio de recursos de
             origen cruzado (CORS), administra el ciclo de vida de los tokens JWT para la
             seguridad de las rutas, registra todos los Blueprints (módulos de rutas) y maneja
             los errores HTTP globales en formato JSON para que el frontend pueda procesarlos.

Dependencias:
  - flask, flask-cors, flask-jwt-extended
  - api.config (SECRET_KEY, JWT_SECRET_KEY, UPLOAD_FOLDER)
  - api.rutas.* (Módulos de rutas para alertas, auth, camaras, operadores, etc.)
  - api.database (Módulo de conexión MySQL)
"""

import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Asegurar que el directorio raíz de TrashFlow esté en el sys.path
# para resolver correctamente las importaciones locales de 'api'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.config import SECRET_KEY, JWT_SECRET_KEY, UPLOAD_FOLDER
from api.rutas.alertas import alertas_bp
from api.rutas.auth import auth_bp
from api.rutas.camaras import camaras_bp
from api.rutas.dashboard import dashboard_bp
from api.rutas.operadores import operadores_bp
from api.rutas.notificaciones import notificaciones_bp

# Creación de la instancia del servidor Flask
app = Flask(__name__)

# Configuración de variables del entorno de Flask
app.config['SECRET_KEY'] = SECRET_KEY
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Habilitar CORS para permitir solicitudes del panel web y aplicaciones PWA locales
CORS(app, origins=["http://localhost", "http://127.0.0.1"])

# Inicializar el gestor de tokens JWT (JSON Web Tokens)
jwt = JWTManager(app)

# Registro de Blueprints con el prefijo "/api" para estructurar los endpoints
app.register_blueprint(alertas_bp, url_prefix="/api")
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(camaras_bp, url_prefix="/api")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(operadores_bp, url_prefix="/api")
app.register_blueprint(notificaciones_bp, url_prefix="/api")

# --- ADMINISTRACIÓN DE SEGURIDAD JWT ---

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Función callback de Flask-JWT-Extended para verificar si un token ha sido revocado.
    Se ejecuta automáticamente en cada llamada autenticada. Busca el identificador único
    del token (jti) en la tabla 'sesiones' de MySQL para comprobar si está 'activa'.
    """
    jti = jwt_payload["jti"]
    try:
        from api.database import query
        res = query("SELECT activa FROM sesiones WHERE token_hash = %s", (jti,))
        if res:
            # Retorna True si activa = 0 (lo que significa que el token fue revocado/logout)
            return not res[0]['activa']
        return False
    except Exception as e:
        print(f"[JWT Blacklist Warning] Error al verificar revocación en BD: {e}")
        return True # Por seguridad, si hay fallos en BD revocamos el acceso

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """
    Manejador callback para peticiones que envían un token revocado (ej: después de cerrar sesión).
    """
    return jsonify({
        "error": "Token revocado",
        "mensaje": "La sesión ha expirado o ha sido cerrada"
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """
    Manejador callback para peticiones que envían un token JWT que ya superó su tiempo de expiración.
    """
    return jsonify({
        "error": "Token expirado",
        "mensaje": "El token de acceso ha expirado, por favor inicia sesión de nuevo"
    }), 401

@jwt.unauthorized_loader
def unauthorized_callback(error_string):
    """
    Manejador callback para peticiones en endpoints protegidos que no envían ningún token de autorización.
    """
    return jsonify({
        "error": "No autorizado",
        "mensaje": "Falta el token de autorización"
    }), 401

# --- MANEJADORES DE ERRORES HTTP GLOBALES ---

@app.errorhandler(400)
def bad_request(e):
    """Manejo de error 400: Parámetros inválidos o cuerpo mal formateado"""
    return jsonify({"error": "Solicitud incorrecta", "mensaje": str(e.description or e)}), 400

@app.errorhandler(404)
def not_found(e):
    """Manejo de error 404: Endpoints o recursos inexistentes"""
    return jsonify({"error": "No encontrado", "mensaje": "La ruta o el recurso solicitado no existe"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    """Manejo de error 405: Métodos HTTP prohibidos en la ruta (ej: POST en lugar de GET)"""
    return jsonify({"error": "Método no permitido", "mensaje": "El método HTTP no está permitido para esta ruta"}), 405

@app.errorhandler(500)
def internal_error(e):
    """Manejo de error 500: Errores no capturados en el código Python de Flask"""
    return jsonify({"error": "Error interno del servidor", "mensaje": "Ocurrió un error inesperado en el servidor"}), 500

# Arranque del servidor de desarrollo local
if __name__ == "__main__":
    # Corre por defecto en el puerto 5000 con recarga automática activada (debug=True)
    app.run(debug=True, port=5000)
