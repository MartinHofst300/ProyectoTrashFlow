# ──────────────────────────────────────────────────────────────────────────────
# TrashFlow — Snippet: Heartbeat del detector Python
# ──────────────────────────────────────────────────────────────────────────────
#
# Agregá este código en tu detector.py para que la cámara aparezca
# "En Línea" en el panel aunque no haya detectado basura recientemente.
#
# El heartbeat se envía cada 30 segundos en un hilo separado.
# El panel web considera la cámara Online si el último heartbeat fue ≤ 90s.
#
# INSTALACIÓN:
#   1. Copiá el token_api de la cámara desde el panel (aparece al crear la cámara)
#   2. Guardalo en tu archivo .env:
#        CAMERA_TOKEN=tu_token_aqui
#        API_BASE_URL=http://localhost:5000
#   3. Copiá las funciones _heartbeat_loop() e init_heartbeat() en tu detector.py
#   4. Llamá a init_heartbeat() antes del bucle principal de detección
# ──────────────────────────────────────────────────────────────────────────────

import os
import threading
import time
import requests

# Leer desde variables de entorno o .env
CAMERA_TOKEN = os.getenv("CAMERA_TOKEN", "")
API_BASE_URL  = os.getenv("API_BASE_URL",  "http://localhost:5000")
HEARTBEAT_INTERVAL = 30  # segundos


def _heartbeat_loop():
    """
    Función de hilo interno: llama al endpoint de heartbeat cada 30 segundos.
    Si el servidor no responde, lo registra en consola sin interrumpir la detección.
    """
    url = f"{API_BASE_URL}/api/camaras/heartbeat"
    headers = {"X-Camera-Token": CAMERA_TOKEN}

    while True:
        try:
            resp = requests.post(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                print(f"[heartbeat] OK — cámara marcada online ({time.strftime('%H:%M:%S')})")
            else:
                print(f"[heartbeat] Respuesta inesperada: {resp.status_code} — {resp.text[:100]}")
        except requests.exceptions.ConnectionError:
            print(f"[heartbeat] No se pudo conectar a {API_BASE_URL}")
        except requests.exceptions.Timeout:
            print("[heartbeat] Timeout al intentar conectar con la API")
        except Exception as e:
            print(f"[heartbeat] Error inesperado: {e}")

        time.sleep(HEARTBEAT_INTERVAL)


def init_heartbeat():
    """
    Inicia el hilo de heartbeat en background.
    Llamar una sola vez antes del bucle de detección principal.

    Ejemplo de uso en detector.py:
        if __name__ == "__main__":
            init_heartbeat()          # ← agregar esta línea
            while True:
                frame = camara.read()
                detecciones = modelo.predict(frame)
                ...
    """
    if not CAMERA_TOKEN:
        print("[heartbeat] ⚠️  CAMERA_TOKEN no configurado. Heartbeat desactivado.")
        return

    t = threading.Thread(target=_heartbeat_loop, daemon=True)
    t.start()
    print(f"[heartbeat] Hilo iniciado — reportando a {API_BASE_URL} cada {HEARTBEAT_INTERVAL}s")
