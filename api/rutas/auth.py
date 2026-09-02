# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/auth.py
Descripción: Define los endpoints de autenticación para administradores y operarios.
             Implementa inicio de sesión (verificación hash bcrypt), cierre de sesión (inactivación
             de token hash en MySQL) y consulta de metadatos de sesión (perfil de usuario).

Dependencias:
  - flask, flask_jwt_extended, bcrypt
  - api.database (Módulo de consultas SQL)
"""

import datetime
import bcrypt
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    decode_token
)
from api.database import query

# Inicialización del Blueprint de autenticación
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    
    Procesa el inicio de sesión.
    1. Busca al usuario en la base de datos MySQL por su email.
    2. Compara el hash bcrypt de la contraseña provista con la almacenada.
    3. Si coincide, genera un token de acceso JWT firmado.
    4. Registra los metadatos de la sesión activa en la tabla 'sesiones' (IP, agente, expiración).
    
    Cuerpo esperado (JSON):
      { "email": "usuario@municipalidad.gov.ar", "password": "mipassword" }
    """
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Faltan campos requeridos", "mensaje": "Email y contraseña son obligatorios"}), 400

    try:
        # Busca el usuario, cruzándolo con su rol municipal correspondiente
        usuarios_db = query(
            """
            SELECT u.id, u.nombre, u.apellido, u.email, u.password_hash, u.activo, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = %s AND u.eliminado_en IS NULL
            """,
            (email,)
        )

        if not usuarios_db:
            return jsonify({"error": "Credenciales inválidas", "mensaje": "Usuario o contraseña incorrectos"}), 401

        usuario = usuarios_db[0]

        # Evita el ingreso si el usuario fue inhabilitado
        if not usuario['activo']:
            return jsonify({"error": "Usuario inactivo", "mensaje": "Tu cuenta de usuario ha sido desactivada"}), 403

        # Valida la contraseña comparando los bytes del texto plano contra el hash bcrypt guardado
        hashed_pw = usuario['password_hash'].encode('utf-8')
        if not bcrypt.checkpw(password.encode('utf-8'), hashed_pw):
            return jsonify({"error": "Credenciales inválidas", "mensaje": "Usuario o contraseña incorrectos"}), 401

        # Registra la fecha de último acceso en la base de datos
        query("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = %s", (usuario['id'],))

        # Genera el token JWT e inyecta el Rol municipal en las propiedades (claims) del token
        rol = usuario['rol']
        token = create_access_token(
            identity=str(usuario['id']),
            additional_claims={"rol": rol}
        )

        # Decodifica el token para registrar la fecha exacta de expiración establecida por JWT
        decoded = decode_token(token)
        jti = decoded['jti'] # Identificador único del JWT
        expira_en = datetime.datetime.fromtimestamp(decoded['exp'])

        # Registra la sesión en la base de datos para control de accesos e invalidación posterior
        ip = request.remote_addr or "127.0.0.1"
        user_agent = request.headers.get('User-Agent', 'Desconocido')[:255]
        
        query(
            """
            INSERT INTO sesiones (usuario_id, token_hash, ip, dispositivo, plataforma, activa, expira_en)
            VALUES (%s, %s, %s, %s, 'web', 1, %s)
            """,
            (usuario['id'], jti, ip, user_agent, expira_en)
        )

        # Obtiene las iniciales del perfil para el avatar
        iniciales = ""
        if usuario.get('nombre'):
            iniciales += usuario['nombre'][0]
        if usuario.get('apellido'):
            iniciales += usuario['apellido'][0]
        iniciales = iniciales.upper() or "AD"

        # Retorna el token y los datos del perfil al cliente
        return jsonify({
            "token": token,
            "role": rol,
            "user": {
                "id": usuario['id'],
                "nombre": f"{usuario['nombre']} {usuario['apellido']}",
                "email": usuario['email'],
                "iniciales": iniciales
            }
        }), 200

    except Exception as e:
        print(f"[Login Error] {e}")
        return jsonify({"error": "Error interno del servidor", "mensaje": "Ocurrió un error al procesar el login"}), 500


@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def me():
    """
    GET /api/auth/me
    
    Retorna la información del usuario autenticado actualmente leyendo el ID desde la firma del JWT.
    """
    try:
        user_id = get_jwt_identity()
        usuarios_db = query(
            """
            SELECT u.id, u.nombre, u.apellido, u.email, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.id = %s AND u.activo = 1 AND u.eliminado_en IS NULL
            """,
            (user_id,)
        )

        if not usuarios_db:
            return jsonify({"error": "No encontrado", "mensaje": "Usuario no encontrado o inactivo"}), 404

        usuario = usuarios_db[0]
        return jsonify({
            "id": usuario['id'],
            "nombre": f"{usuario['nombre']} {usuario['apellido']}",
            "email": usuario['email'],
            "rol": usuario['rol']
        }), 200

    except Exception as e:
        print(f"[Me Error] {e}")
        return jsonify({"error": "Error interno del servidor", "mensaje": "Ocurrió un error al obtener tu perfil"}), 500


@auth_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    POST /api/auth/logout
    
    Invalida de forma lógica la sesión activa del usuario.
    Obtiene el identificador (jti) de las propiedades del token y cambia 'activa = 0' en la base de datos MySQL.
    """
    try:
        jwt_data = get_jwt()
        jti = jwt_data['jti']
        
        # Desactiva la sesión de forma inmediata en MySQL
        query("UPDATE sesiones SET activa = 0 WHERE token_hash = %s", (jti,))
        
        return jsonify({"ok": True, "mensaje": "Sesión cerrada correctamente"}), 200
    except Exception as e:
        print(f"[Logout Error] {e}")
        return jsonify({"error": "Error interno del servidor", "mensaje": "Ocurrió un error al cerrar la sesión"}), 500
