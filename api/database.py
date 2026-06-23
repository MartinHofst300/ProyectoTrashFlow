# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: database.py
Descripción: Capa de persistencia de datos (conector base).
             Define funciones utilitarias para establecer conexiones seguras con el motor MySQL
             utilizando PyMySQL. Incluye reintentos ante desconexiones y automatiza la ejecución
             de consultas, retornos de listas de diccionarios, inserciones (autoincrementales)
             y confirmaciones de transacciones (commits / rollbacks).

Dependencias:
  - pymysql
  - api.config (Datos de host, puerto, credenciales de base de datos)
"""

import pymysql
import pymysql.cursors
import time
from api.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

def get_db():
    """
    Establece y retorna una conexión limpia a la base de datos MySQL.
    Implementa reintentos automáticos (3 intentos con delay exponencial)
    para tolerar caídas temporales o latencias altas en el servidor.
    
    @returns {pymysql.Connection} Objeto de conexión de PyMySQL.
    """
    intentos = 3
    delay = 1
    for i in range(intentos):
        try:
            conexion = pymysql.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                charset='utf8mb4',
                # Retorna los registros como diccionarios de Python (ej: {'id': 1, 'nombre': 'Munro'})
                # en lugar de tuplas, facilitando la conversión a JSON para la API.
                cursorclass=pymysql.cursors.DictCursor
            )
            return conexion
        except pymysql.MySQLError as e:
            print(f"[Base de Datos] Intento {i+1} de conexión fallido: {e}")
            if i < intentos - 1:
                time.sleep(delay)
            else:
                raise e

def query(sql, params=None):
    """
    Ejecuta una sentencia SQL en la base de datos de manera segura contra inyecciones SQL
    (usando placeholders de parámetros) y administra el cierre automático de la conexión.
    
    @param {string} sql - La consulta SQL parametrizada con placeholders %s.
    @param {tuple|list} params - Valores de los parámetros que reemplazarán los placeholders %s.
    @returns {list|int} 
      - Una lista de diccionarios para consultas de lectura (SELECT).
      - El ID autoincremental generado para consultas de inserción (INSERT).
      - La cantidad de filas afectadas para actualizaciones (UPDATE) o eliminaciones (DELETE).
    """
    conexion = None
    try:
        conexion = get_db()
        with conexion.cursor() as cursor:
            # Ejecuta la consulta vinculando los parámetros de forma segura
            cursor.execute(sql, params or ())
            
            sql_upper = sql.strip().upper()
            # Si es consulta de lectura, obtiene y retorna todas las filas
            if sql_upper.startswith(("SELECT", "SHOW", "DESCRIBE", "EXPLAIN")):
                resultado = cursor.fetchall()
            else:
                # Si es escritura, confirma físicamente los cambios (commit)
                conexion.commit()
                if sql_upper.startswith("INSERT"):
                    resultado = cursor.lastrowid # Retorna el ID autoincremental generado
                else:
                    resultado = cursor.rowcount  # Retorna filas modificadas (UPDATE/DELETE)
            return resultado
    except Exception as e:
        print(f"[Error SQL] Consulta: {sql} | Error: {e}")
        # Si falla en plena escritura, revierte los cambios para no corromper la BD (rollback)
        if conexion:
            try:
                conexion.rollback()
            except Exception:
                pass
        raise e
    finally:
        # Garantiza el cierre de la conexión al finalizar, evitando fugas de descriptores de sockets (memory leaks)
        if conexion:
            conexion.close()
