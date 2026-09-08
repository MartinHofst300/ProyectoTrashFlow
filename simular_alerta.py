# -*- coding: utf-8 -*-
"""
TrashFlow — Simulador de alertas
Inserta una alerta de prueba + su notificación directo en la base de datos,
sin necesidad de correr el modelo YOLOv8n ni tener la cámara conectada.

Uso: correr este script cada vez que quieras simular una nueva detección
     mientras probás el dispositivo ESP32.

Requiere: pymysql (ya debería estar instalado en tu entorno 'basuraia')
"""

import pymysql
import random

# ── Ajustá esto si tu .env real tiene otros datos ──────────────────────────
DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "trashflow"

# ── Datos de la alerta simulada ─────────────────────────────────────────────
CAMARA_ID = 1        # Cámara de Prueba Munro (ya existe en la BD)
ZONA_ID = 1
OPERADOR_ID = 4      # Mismo operario asignado al Dispositivo Campo #1
LATITUD = -34.5250000
LONGITUD = -58.4730000
DIRECCION = "Av. Mitre 2300, Munro, Vicente Lopez"


def simular_alerta():
    conexion = pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER,
        password=DB_PASSWORD, database=DB_NAME, charset='utf8mb4'
    )
    try:
        with conexion.cursor() as cursor:
            confianza = round(random.uniform(85.0, 98.0), 2)

            # 1. Crear la alerta (estado_id=2 = "asignada")
            cursor.execute(
                """
                INSERT INTO alertas
                    (camara_id, zona_id, estado_id, operador_id, confianza,
                     foto_url, latitud, longitud, direccion, asignado_en)
                VALUES (%s, %s, 2, %s, %s, 'test.jpg', %s, %s, %s, NOW())
                """,
                (CAMARA_ID, ZONA_ID, OPERADOR_ID, confianza, LATITUD, LONGITUD, DIRECCION)
            )
            alerta_id = cursor.lastrowid

            # 2. Crear la notificación que el ESP32 va a leer por polling
            cursor.execute(
                """
                INSERT INTO notificaciones
                    (usuario_id, alerta_id, titulo, mensaje, tipo, leida)
                VALUES (%s, %s, %s, %s, 'alerta_asignada', 0)
                """,
                (
                    OPERADOR_ID,
                    alerta_id,
                    "Nueva Alerta Asignada",
                    f"Se te ha asignado la recoleccion en {DIRECCION}",
                )
            )

        conexion.commit()
        print(f"✅ Alerta simulada creada: ID #{alerta_id} — Confianza {confianza}%")
        print("   El ESP32 debería mostrarla en los próximos 10 segundos (polling).")

    finally:
        conexion.close()


if __name__ == "__main__":
    simular_alerta()