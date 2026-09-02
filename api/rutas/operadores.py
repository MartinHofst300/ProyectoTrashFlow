# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/rutas/operadores.py
Descripción: Endpoint RESTful para el módulo de administración de operarios.
             Implementa un CRUD seguro: obtención de listados, altas, ediciones
             parciales y baja lógica (soft delete) previniendo que se borren
             operarios con tareas activas pendientes.

             Los operarios de campo NO tienen cuenta de acceso web.
             Se identifican por DNI y fecha de nacimiento. El sistema genera
             un email interno (operario_{id}@trashflow.local) para mantener
             el índice UNIQUE de la tabla sin exponer datos al exterior.

Dependencias:
  - bcrypt, Flask (Blueprint), flask_jwt_extended
  - api.database (query)
"""

import bcrypt
import secrets
import string
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from api.database import query

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
        
        # Serialización de campos datetime y date para JSON
        for o in operadores:
            if o.get('ultimo_acceso') is not None:
                o['ultimo_acceso'] = o['ultimo_acceso'].strftime('%Y-%m-%d %H:%M:%S')
            if o.get('dispositivo_ultima_conexion') is not None:
                o['dispositivo_ultima_conexion'] = o['dispositivo_ultima_conexion'].strftime('%Y-%m-%d %H:%M:%S')
            if o.get('fecha_nacimiento') is not None:
                o['fecha_nacimiento'] = o['fecha_nacimiento'].strftime('%Y-%m-%d')

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
        if op.get('dispositivo_ultima_conexion') is not None:
            op['dispositivo_ultima_conexion'] = op['dispositivo_ultima_conexion'].strftime('%Y-%m-%d %H:%M:%S')
        if op.get('fecha_nacimiento') is not None:
            op['fecha_nacimiento'] = op['fecha_nacimiento'].strftime('%Y-%m-%d')

        return jsonify(op), 200
    except Exception as e:
        print(f"[GET operador detail error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo obtener el detalle del operador"}), 500


@operadores_bp.route('/operadores', methods=['POST'])
@jwt_required()
def create_operador():
    """
    POST /api/operadores

    Crea un nuevo operario de campo (rol_id = 2).
    Los operarios NO tienen cuenta de acceso web — se identifican por DNI y
    fecha de nacimiento. El sistema genera un email interno del tipo
    operario_{id}@trashflow.local para satisfacer el UNIQUE de la tabla.

    Campos requeridos: nombre, apellido
    Campos opcionales: dni, fecha_nacimiento, telefono, zona_id

    Aplica hashing con sal pesada (bcrypt 12 rondas) para la contraseña
    interna (no expuesta al operario).
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}
    nombre          = data.get("nombre")
    apellido        = data.get("apellido")
    dni             = data.get("dni")             # Opcional
    fecha_nacimiento = data.get("fecha_nacimiento")  # Opcional, formato YYYY-MM-DD
    telefono        = data.get("telefono")
    zona_id         = data.get("zona_id")

    if not all([nombre, apellido]):
        return jsonify({"error": "Campos incompletos", "mensaje": "Nombre y apellido son obligatorios"}), 400

    # Validar formato de fecha de nacimiento si se proporcionó
    if fecha_nacimiento is not None:
        try:
            from datetime import datetime
            datetime.strptime(fecha_nacimiento, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Formato inválido", "mensaje": "fecha_nacimiento debe tener formato YYYY-MM-DD"}), 400

    # Validar DNI duplicado si se proporcionó
    if dni is not None and dni.strip():
        dup_dni = query("SELECT id FROM usuarios WHERE dni = %s AND eliminado_en IS NULL", (dni.strip(),))
        if dup_dni:
            return jsonify({"error": "DNI duplicado", "mensaje": "Ya existe un operador registrado con ese DNI"}), 409

    # Validar zona si se proporcionó
    if zona_id is not None:
        try:
            zona_id = int(zona_id)
            zona_valida = query("SELECT id FROM zonas WHERE id = %s AND activa = 1", (zona_id,))
            if not zona_valida:
                return jsonify({"error": "Zona inválida", "mensaje": "La zona especificada no existe o está inactiva"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Formato inválido", "mensaje": "zona_id debe ser un entero"}), 400

    try:
        # Genera una contraseña interna aleatoria (el operario la usa para la PWA)
        import secrets, string
        alphabet = string.ascii_letters + string.digits
        password_interna = ''.join(secrets.choice(alphabet) for _ in range(16))
        salt = bcrypt.gensalt(12)
        password_hash = bcrypt.hashpw(password_interna.encode('utf-8'), salt).decode('utf-8')

        # Inserta el operario sin email real (el email se asigna en el UPDATE posterior)
        nuevo_id = query(
            """
            INSERT INTO usuarios
              (rol_id, zona_id, nombre, apellido, dni, fecha_nacimiento,
               email, password_hash, telefono, activo, primer_login, creado_en)
            VALUES (2, %s, %s, %s, %s, %s, NULL, %s, %s, 1, 0, NOW())
            """,
            (zona_id, nombre, apellido,
             dni.strip() if dni else None,
             fecha_nacimiento,
             password_hash, telefono)
        )

        # Asignar email interno usando el ID generado
        email_interno = f"operario_{nuevo_id}@trashflow.local"
        query(
            "UPDATE usuarios SET email = %s WHERE id = %s",
            (email_interno, nuevo_id)
        )

        return jsonify({
            "ok": True,
            "id": nuevo_id,
            "nombre_completo": f"{nombre} {apellido}"
        }), 201

    except Exception as e:
        print(f"[POST operadores error]: {e}")
        return jsonify({"error": "Error interno", "mensaje": "No se pudo registrar al operador"}), 500


@operadores_bp.route('/operadores/<int:operador_id>', methods=['PATCH'])
@jwt_required()
def update_operador(operador_id):
    """
    PATCH /api/operadores/<operador_id>

    Edición selectiva del operario. Construye dinámicamente la consulta SQL
    con los campos que estén presentes en el JSON de la request.

    Campos editables: nombre, apellido, dni, fecha_nacimiento, telefono, zona_id
    """
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado", "mensaje": "Se requieren privilegios de administrador"}), 403

    data = request.get_json() or {}

    existente = query("SELECT id FROM usuarios WHERE id = %s AND rol_id = 2 AND eliminado_en IS NULL", (operador_id,))
    if not existente:
        return jsonify({"error": "No encontrado", "mensaje": "El operador especificado no existe o fue eliminado"}), 404

    nombre           = data.get("nombre")
    apellido         = data.get("apellido")
    dni              = data.get("dni")
    fecha_nacimiento = data.get("fecha_nacimiento")
    telefono         = data.get("telefono")
    zona_id          = data.get("zona_id")

    set_clauses = []
    params = []

    if nombre is not None:
        set_clauses.append("nombre = %s")
        params.append(nombre.strip())
    if apellido is not None:
        set_clauses.append("apellido = %s")
        params.append(apellido.strip())
    if dni is not None:
        # Permitir limpiar el DNI enviando cadena vacía
        dni_val = dni.strip() if dni.strip() else None
        if dni_val:
            dup = query("SELECT id FROM usuarios WHERE dni = %s AND id != %s AND eliminado_en IS NULL", (dni_val, operador_id))
            if dup:
                return jsonify({"error": "DNI duplicado", "mensaje": "Ya existe otro operador con ese DNI"}), 409
        set_clauses.append("dni = %s")
        params.append(dni_val)
    if fecha_nacimiento is not None:
        if fecha_nacimiento.strip():
            try:
                from datetime import datetime
                datetime.strptime(fecha_nacimiento.strip(), '%Y-%m-%d')
            except ValueError:
                return jsonify({"error": "Formato inválido", "mensaje": "fecha_nacimiento debe tener formato YYYY-MM-DD"}), 400
            set_clauses.append("fecha_nacimiento = %s")
            params.append(fecha_nacimiento.strip())
        else:
            set_clauses.append("fecha_nacimiento = NULL")
    if telefono is not None:
        set_clauses.append("telefono = %s")
        params.append(telefono.strip() if telefono.strip() else None)
    if zona_id is not None:
        try:
            zona_id = int(zona_id)
            zona_valida = query("SELECT id FROM zonas WHERE id = %s AND activa = 1", (zona_id,))
            if not zona_valida:
                return jsonify({"error": "Zona inválida", "mensaje": "La zona especificada no existe o está inactiva"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Formato inválido", "mensaje": "zona_id debe ser un entero"}), 400
        set_clauses.append("zona_id = %s")
        params.append(zona_id)

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
