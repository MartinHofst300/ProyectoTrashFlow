# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/operadores.py
Descripción: Endpoint RESTful para el módulo de administración de operarios.
             Implementa un CRUD seguro: obtención de listados, altas (hasheado con bcrypt de 12 rondas),
             ediciones parciales y baja lógica (soft delete) previniendo que se borren operarios
             con tareas activas pendientes.

Dependencias:
  - bcrypt, Flask (Blueprint), flask_jwt_extended
  - api.database (query)
  - api.servicios.email_service (Notificación de credenciales al crear cuenta)
"""

import bcrypt
import threading
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from api.database import query
from api.servicios.email_service import send_credenciales_operador

# Registro del Blueprint para operadores
operadores_bp = Blueprint('operadores', __name__)

@operadores_bp.route('/operadores', methods=['GET'])
@jwt_required()
def get_operadores():
    """
    GET /api/operadores
    
    Retorna la lista de todos los operarios de recolección activos.
    Consulta a la vista MySQL 'vista_operadores' filtrando los que no posean fecha de eliminación (eliminado_en IS NULL).
    Exclusivo para administradores.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        operadores = query(
            "SELECT * FROM vista_operadores WHERE eliminado_en IS NULL ORDER BY nombre"
        )
        
        # Formatea marcas temporales de último acceso para su correcta serialización JSON
        for o in operadores:
            if o.get('ultimo_acceso') is not None:
                o['ultimo_acceso'] = o['ultimo_acceso'].strftime('%Y-%m-%d %H:%M:%S')
                
        return jsonify(operadores), 200
    except Exception as e:
        print(f"[GET operadores error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener la lista de operadores"}), 500


@operadores_bp.route('/operadores/<int:operador_id>', methods=['GET'])
@jwt_required()
def get_operador_detail(operador_id):
    """
    GET /api/operadores/<operador_id>
    
    Retorna el perfil individual completo de un operador por su ID.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        ops = query(
            "SELECT * FROM vista_operadores WHERE id = %s AND eliminado_en IS NULL",
            (operador_id,)
        )
        if not ops:
            return jsonify({"error": "No encontrado", "mensaje": "El operador especificado no existe o fue eliminado"}), 404
            
        op = ops[0]
        if op.get('ultimo_acceso') is not None:
            op['ultimo_acceso'] = op['ultimo_acceso'].strftime('%Y-%m-%d %H:%M:%S')
            
        return jsonify(op), 200
    except Exception as e:
        print(f"[GET operador detail error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener el detalle del operador"}), 500


@operadores_bp.route('/operadores', methods=['POST'])
@jwt_required()
def create_operador():
    """
    POST /api/operadores
    
    Crea una nueva cuenta de operador (rol_id = 2).
    Aplica hashing con sal pesada (bcrypt con 12 rondas de complejidad) para proteger la contraseña.
    Al crearse exitosamente, envía un correo automático al operario con su contraseña provisoria
    en un hilo paralelo para evitar colgar la respuesta del servidor.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    nombre = data.get("nombre")
    apellido = data.get("apellido")
    email = data.get("email")
    password = data.get("password")
    telefono = data.get("telefono")

    if not all([nombre, apellido, email, password]):
        return jsonify({"error": "Campos incompletos", "mensaje": "Nombre, apellido, email y contraseña son obligatorios"}), 400

    try:
        # Previene emails repetidos en el padrón municipal
        existente = query("SELECT id FROM usuarios WHERE email = %s AND eliminado_en IS NULL", (email,))
        if existente:
            return jsonify({"error": "Email duplicado", "mensaje": "Ya existe un operador registrado con este email"}), 409

        # Hashea la contraseña con una sal de complejidad 12 (estándar seguro)
        salt = bcrypt.gensalt(12)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

        # Inserta el operario en MySQL
        nuevo_id = query(
            """
            INSERT INTO usuarios (rol_id, nombre, apellido, email, password_hash, telefono, activo, primer_login, creado_en)
            VALUES (2, %s, %s, %s, %s, %s, 1, 1, NOW())
            """,
            (nombre, apellido, email, password_hash, telefono)
        )

        nombre_completo = f"{nombre} {apellido}"
        
        # Envía las credenciales al correo del operador (non-blocking thread)
        operador_data = {
            "id": nuevo_id,
            "nombre": nombre,
            "apellido": apellido,
            "email": email
        }
        threading.Thread(target=send_credenciales_operador, args=(operador_data, password)).start()

        return jsonify({
            "ok": True,
            "id": nuevo_id,
            "nombre_completo": nombre_completo
        }), 201

    except Exception as e:
        print(f"[POST operadores error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo registrar al operador"}), 500


@operadores_bp.route('/operadores/<int:operador_id>', methods=['PATCH'])
@jwt_required()
def update_operador(operador_id):
    """
    PATCH /api/operadores/<operador_id>
    
    Edición selectiva de los datos del operario (ej: corregir el teléfono o actualizar contraseña).
    Construye dinámicamente la consulta de actualización basándose en los campos enviados en el JSON.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    
    existente = query("SELECT id FROM usuarios WHERE id = %s AND rol_id = 2 AND eliminado_en IS NULL", (operador_id,))
    if not existente:
        return jsonify({"error": "No encontrado", "mensaje": "El operador especificado no existe o fue eliminado"}), 404
        
    nombre = data.get("nombre")
    apellido = data.get("apellido")
    email = data.get("email")
    telefono = data.get("telefono")
    password = data.get("password")
    
    set_clauses = []
    params = []
    
    if nombre is not None:
        set_clauses.append("nombre = %s")
        params.append(nombre)
    if apellido is not None:
        set_clauses.append("apellido = %s")
        params.append(apellido)
    if email is not None:
        # Previene colisión de emails con otras cuentas
        dup = query("SELECT id FROM usuarios WHERE email = %s AND id != %s AND eliminado_en IS NULL", (email, operador_id))
        if dup:
            return jsonify({"error": "Email duplicado", "mensaje": "Ya existe otro operador registrado con este email"}), 409
        set_clauses.append("email = %s")
        params.append(email)
    if telefono is not None:
        set_clauses.append("telefono = %s")
        params.append(telefono)
    if password is not None and password.strip() != "":
        # Si se ingresa una contraseña, se hashea antes de guardarla
        salt = bcrypt.gensalt(12)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        set_clauses.append("password_hash = %s")
        params.append(password_hash)
        
    if not set_clauses:
        return jsonify({"ok": True, "mensaje": "No se enviaron campos para actualizar"}), 200
        
    params.append(operador_id)
    update_sql = f"UPDATE usuarios SET {', '.join(set_clauses)} WHERE id = %s AND rol_id = 2 AND eliminado_en IS NULL"
    
    try:
        query(update_sql, params)
        return jsonify({"ok": True, "mensaje": "Operador actualizado"}), 200
    except Exception as e:
        print(f"[PATCH operadores error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo actualizar el operador"}), 500


@operadores_bp.route('/operadores/<int:operador_id>', methods=['DELETE'])
@jwt_required()
def delete_operador(operador_id):
    """
    DELETE /api/operadores/<operador_id>
    
    Eliminación lógica (Soft Delete) del operario.
    Establece 'eliminado_en = NOW()' y 'activo = 0' en lugar de destruir físicamente la fila,
    preservando el historial de alertas que este operario resolvió en el pasado.
    Evita la baja (retornando un 409) si posee alertas pendientes asignadas en este momento.
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    try:
        existente = query("SELECT id FROM usuarios WHERE id = %s AND rol_id = 2 AND eliminado_en IS NULL", (operador_id,))
        if not existente:
            return jsonify({"error": "No encontrado", "mensaje": "El operador especificado no existe o ya fue eliminado"}), 404

        # Regla de Negocio: No se puede borrar si tiene tareas de recolección activas (estados 2 o 3)
        active_alerts_db = query("SELECT alertas_activas FROM vista_operadores WHERE id = %s AND eliminado_en IS NULL", (operador_id,))
        if active_alerts_db and active_alerts_db[0]['alertas_activas'] > 0:
            return jsonify({
                "error": "Conflicto",
                "mensaje": "El operador tiene alertas activas asignadas. Reasignalas antes de dar de baja."
            }), 409

        # Ejecuta la baja lógica
        query(
            "UPDATE usuarios SET eliminado_en = NOW(), activo = 0 WHERE id = %s AND rol_id = 2",
            (operador_id,)
        )
        return jsonify({"ok": True, "mensaje": "Operador dado de baja correctamente"}), 200

    except Exception as e:
        print(f"[DELETE operadores error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo dar de baja al operador"}), 500


@operadores_bp.route('/operadores/<int:operador_id>/estado', methods=['PATCH'])
@jwt_required()
def toggle_operador_estado(operador_id):
    """
    PATCH /api/operadores/<operador_id>/estado
    
    Habilita o deshabilita la cuenta de un operario (para suspensión temporal de servicios).
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    activo = data.get("activo")
    
    if activo is None or activo not in [0, 1, True, False]:
        return jsonify({"error": "Campo inválido", "mensaje": "El campo activo es requerido y debe ser 0, 1, True o False"}), 400

    activo_int = 1 if activo else 0

    try:
        existente = query("SELECT id FROM usuarios WHERE id = %s AND rol_id = 2 AND eliminado_en IS NULL", (operador_id,))
        if not existente:
            return jsonify({"error": "No encontrado", "mensaje": "El operador especificado no existe o fue eliminado"}), 404

        query(
            "UPDATE usuarios SET activo = %s WHERE id = %s AND rol_id = 2 AND eliminado_en IS NULL",
            (activo_int, operador_id)
        )

        return jsonify({"ok": True}), 200

    except Exception as e:
        print(f"[PATCH operadores estado error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo actualizar el estado de activación"}), 500
