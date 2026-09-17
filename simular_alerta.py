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

            # 1. Si la cámara tenía una alerta activa previa, cerrarla por re-detección
            cursor.execute(
                """
                UPDATE alertas
                SET estado_id = 4, resuelto_en = NOW(),
                    notas_admin = CASE
                        WHEN notas_admin IS NULL OR notas_admin = '' THEN 'Cerrada: re-detectada en simulación tras suspensión'
                        ELSE CONCAT(notas_admin, ' | Cerrada: re-detectada en simulación tras suspensión')
                    END
                WHERE camara_id = %s AND estado_id IN (1, 2, 3)
                """,
                (CAMARA_ID,)
            )

            # 2. Crear la alerta (estado_id=2 = "asignada") con detectado_en actual
            cursor.execute(
                """
                INSERT INTO alertas
                    (camara_id, zona_id, estado_id, operador_id, confianza,
                     foto_url, latitud, longitud, direccion, detectado_en, asignado_en, creado_en)
                VALUES (%s, %s, 2, %s, %s, 'static/fotos/detecciones/deteccion_20260915_224219_cam1_conf86.jpg', %s, %s, %s, NOW(), NOW(), NOW())
                """,
                (CAMARA_ID, ZONA_ID, OPERADOR_ID, confianza, LATITUD, LONGITUD, DIRECCION)
            )
            alerta_id = cursor.lastrowid

            # 3. Actualizar la cámara para que registre la última detección
            cursor.execute(
                """
                UPDATE camaras
                SET total_detecciones = total_detecciones + 1, ultima_conexion = NOW()
                WHERE id = %s
                """,
                (CAMARA_ID,)
            )

            # 4. Crear la notificación que el ESP32 va a leer por polling
            cursor.execute(
                """
                INSERT INTO notificaciones
                    (usuario_id, alerta_id, titulo, mensaje, tipo, leida, creado_en)
                VALUES (%s, %s, %s, %s, 'alerta_asignada', 0, NOW())
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