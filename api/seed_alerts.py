# -*- coding: utf-8 -*-
"""
TrashFlow — Seeder de Alertas de Prueba
Descripción: Inserta 5 alertas de prueba en el Centro de Vicente López
             para demostración e inspección de UI en la Expo.
"""

import pymysql
import sys
from datetime import datetime, timedelta

# Configuración de base de datos
DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "trashflow"

def seed():
    print("Iniciando carga de datos de prueba (seed)...")
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Error al conectar a la base de datos: {e}")
        print("Asegúrese de tener MySQL corriendo (XAMPP) y la base de datos 'trashflow' creada.")
        sys.exit(1)

    try:
        with conn.cursor() as cursor:
            # 1. Obtener una cámara válida para asociar las alertas
            cursor.execute("SELECT id FROM camaras WHERE zona_id = 1 LIMIT 1")
            camara = cursor.fetchone()
            if not camara:
                # Si no hay cámara en Centro, buscamos cualquiera
                cursor.execute("SELECT id FROM camaras LIMIT 1")
                camara = cursor.fetchone()
                
            if not camara:
                print("No se encontró ninguna cámara en la base de datos. Creando una cámara de prueba...")
                cursor.execute("""
                    INSERT INTO camaras (nombre, ubicacion, latitud, longitud, estado, activa, zona_id, creado_en)
                    VALUES ('Cámara Centro 1', 'Av. Maipú y Gutiérrez', -34.522, -58.472, 'online', 1, 1, NOW())
                """)
                conn.commit()
                camara_id = cursor.lastrowid
            else:
                camara_id = camara['id']

            print(f"Usando Cámara ID: {camara_id} para las alertas de prueba.")

            # 2. Definir las 5 alertas en la zona Centro (zona_id = 1)
            # Lat/Long realistas de Centro Vicente López: -34.520 a -34.525, -58.470 a -58.475
            alertas_data = [
                {
                    "direccion": "Av. Maipú 2300, Centro",
                    "latitud": -34.5218,
                    "longitud": -58.4725,
                    "confianza": 88,
                    "horas_atras": 6
                },
                {
                    "direccion": "Ricardo Gutiérrez 1500, Centro",
                    "latitud": -34.5209,
                    "longitud": -58.4718,
                    "confianza": 74,
                    "horas_atras": 18
                },
                {
                    "direccion": "Juan B. Justo 900, Centro",
                    "latitud": -34.5225,
                    "longitud": -58.4731,
                    "confianza": 92,
                    "horas_atras": 29
                },
                {
                    "direccion": "Borges 1900, Centro",
                    "latitud": -34.5232,
                    "longitud": -58.4739,
                    "confianza": 81,
                    "horas_atras": 36
                },
                {
                    "direccion": "Av. San Martín 1500, Centro",
                    "latitud": -34.5241,
                    "longitud": -58.4746,
                    "confianza": 79,
                    "horas_atras": 45
                }
            ]

            foto_placeholder = "static/fotos/detecciones/deteccion_20260630_203708_cam1_conf88.jpg"
            inserted_ids = []

            for i, data in enumerate(alertas_data):
                # Calcular timestamp distribuido
                detectado_en = datetime.now() - timedelta(hours=data["horas_atras"])
                detectado_str = detectado_en.strftime('%Y-%m-%d %H:%M:%S')

                cursor.execute("""
                    INSERT INTO alertas (camara_id, zona_id, estado_id, confianza, foto_url, latitud, longitud, direccion, detectado_en, creado_en)
                    VALUES (%s, 1, 1, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    camara_id, 
                    data["confianza"], 
                    foto_placeholder, 
                    data["latitud"], 
                    data["longitud"], 
                    data["direccion"], 
                    detectado_str,
                    detectado_str
                ))
                conn.commit()
                alert_id = cursor.lastrowid
                inserted_ids.append(alert_id)
                print(f"Alerta {i+1} insertada: ID {alert_id} en '{data['direccion']}' ({detectado_str})")

            # 3. Crear notificaciones internas para que el panel las reciba
            for alert_id, data in zip(inserted_ids, alertas_data):
                cursor.execute("""
                    INSERT INTO notificaciones (usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en)
                    VALUES (1, %s, 'Nueva Alerta Detectada', %s, 'nueva_alerta', 0, NOW())
                """, (
                    alert_id, 
                    f"Basura detectada en {data['direccion']} (Confianza: {data['confianza']}%)"
                ))
            conn.commit()
            print("Notificaciones correspondientes creadas.")
            print("Seeding completado exitosamente.")

    except Exception as e:
        print(f"Error al ejecutar consultas SQL: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed()
