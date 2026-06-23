# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: modelo/detector.py
Descripción: Script daemon/servicio encargado de monitorear una cámara en vivo (webcam o stream).
             Carga el modelo entrenado (.keras) y procesa los frames recursivamente a través de la CNN.
             Utiliza un búfer de suavizado temporal (cola de 10 muestras) y una validación de desviación
             estándar para filtrar falsos positivos de imágenes estáticas antes de emitir una alerta.
             Al detectar una bolsa de basura con alta confianza, guarda el frame de la evidencia y
             envía una petición HTTP POST autenticada con token al backend para crear el reporte en el panel.

Dependencias:
  - os, sys, time (Manejo de rutas del sistema operativo y retardos)
  - cv2 (OpenCV - Captura, procesamiento de frames y dibujo de interfaces visuales)
  - numpy (Cálculo matemático, manipulación de vectores e histogramas de imágenes)
  - requests (Comunicación HTTP/REST con la API Flask)
  - dotenv (Carga de variables de entorno configuradas en el archivo .env del proyecto)
  - tensorflow, keras (Carga y predicción del modelo convolucional de clasificación de imágenes)
  - collections.deque (Búfer de cola FIFO de tamaño fijo para suavizado de confianza)
  - modelo.guardado_foto (Función local para almacenamiento de archivos físicos de evidencia)

Variables de Entorno (.env requeridas):
  - CAMARA_ID: Identificador numérico único de la cámara asignada
  - CAMARA_TOKEN: Token secreto asignado a la cámara para autenticación en la API
  - CAMARA_LATITUD, CAMARA_LONGITUD: Coordenadas GPS del dispositivo
  - API_URL: URL base del backend Flask (ej: http://localhost:5000)
"""

import os
import sys
import time
import cv2
import numpy as np
import requests
from dotenv import load_dotenv
import tensorflow as tf
from tensorflow import keras
from collections import deque

# Importa el servicio local para almacenar las imágenes de las detecciones
from guardado_foto import guardar_foto_deteccion

# Configuración de las rutas absolutas para referenciar archivos del proyecto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

# Carga las variables de entorno desde el archivo .env ubicado en la raíz del proyecto
env_path = os.path.join(PROJECT_DIR, ".env")
load_dotenv(env_path)

# Asignación de variables de configuración basadas en el archivo .env o valores por defecto
CAMARA_ID = int(os.getenv("CAMARA_ID", 1))
CAMARA_TOKEN = os.getenv("CAMARA_TOKEN", "token_camara_1_aqui")
CAMARA_LATITUD = float(os.getenv("CAMARA_LATITUD", -34.5250000))
CAMARA_LONGITUD = float(os.getenv("CAMARA_LONGITUD", -58.4730000))
API_URL = os.getenv("API_URL", "http://localhost:5000")

# Umbrales operativos de detección
UMBRAL_CONFIANZA = 0.88 # 88% de confianza mínima por frame para considerarlo alerta potencial
PAUSA_DURACION = 120    # Segundos de pausa (enfriamiento) después de notificar para no saturar con alertas repetidas

# Crea el directorio de almacenamiento de fotos si no existe
DETECCIONES_DIR = os.path.join(PROJECT_DIR, "api", "static", "fotos", "detecciones")
os.makedirs(DETECCIONES_DIR, exist_ok=True)


def check_api_connection(url):
    """
    Realiza un ping HTTP rápido al endpoint de la API Flask para verificar su estado de conexión.
    Retorna True si responde correctamente, de lo contrario False.
    """
    try:
        requests.get(f"{url.rstrip('/')}/api/alertas", timeout=2)
        return True
    except requests.RequestException:
        return False


print("[TrashFlow] Iniciando detector...")

# Carga del modelo convolucional (.keras) previamente entrenado
model_path = os.path.join(BASE_DIR, "modelo_bolsas.keras")
if not os.path.exists(model_path):
    print("[TrashFlow] No se encontro el modelo. Corra primero main.py para entrenar.")
    sys.exit(1)

model = keras.models.load_model(model_path)
print("[TrashFlow] Modelo cargado correctamente.")

# Verifica la conectividad inicial con el backend REST
api_online = check_api_connection(API_URL)
if api_online:
    print("[TrashFlow] Conectado a la API.")
else:
    print("[TrashFlow] Sin conexion a la API. Funcionando en modo local.")

print("[TrashFlow] Camara activa. Presiona Q para salir.")

# Inicializa la captura de video usando la cámara por defecto
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("[TrashFlow] No se pudo abrir la camara.")
    sys.exit(1)

# Variables de estado internas para el bucle principal de procesamiento
last_analysis_time = 0
last_api_check = time.time()
pausa_hasta = 0
estado_monitoreo = "Monitoreando..."
buffer_confianzas = deque(maxlen=10) # Cola FIFO para promedio móvil de las últimas 10 predicciones
prob_bolsa = 0.0

while True:
    # Captura un frame del flujo de video de la cámara
    ret, frame = cap.read()
    if not ret:
        print("[TrashFlow] Error al leer la camara.")
        time.sleep(0.5)
        continue

    current_time = time.time()

    # Si la API estaba desconectada, intenta reconectar periódicamente cada 30 segundos
    if not api_online and (current_time - last_api_check >= 30):
        last_api_check = current_time
        api_online = check_api_connection(API_URL)
        if api_online:
            print(f"[{time.strftime('%H:%M:%S')}] Conexion con la API reestablecida.")

    # Control de la pausa de enfriamiento tras una alerta
    en_pausa = False
    pausa_restante = 0
    if current_time < pausa_hasta:
        en_pausa = True
        pausa_restante = int(pausa_hasta - current_time)
        estado_monitoreo = f"Pausa ({pausa_restante}s)"

    # Ejecuta el análisis del modelo cada 2 segundos (optimiza el consumo de CPU/GPU)
    if not en_pausa and (current_time - last_analysis_time >= 2):
        last_analysis_time = current_time
        estado_monitoreo = "Monitoreando..."

        # Preprocesamiento idéntico al del entrenamiento: escala de grises, 64x64 y normalización
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (64, 64))
        normalized = resized.astype("float32") / 255.0
        input_data = np.expand_dims(normalized, axis=(0, -1))

        # Realiza la predicción del frame
        result = model.predict(input_data, verbose=0)
        prob_bolsa = float(result[0][0])

        # Agrega el resultado actual a la cola de suavizado temporal
        buffer_confianzas.append(prob_bolsa)

        # Calcula el promedio de las probabilidades acumuladas
        avg_curr = sum(buffer_confianzas) / len(buffer_confianzas)
        # Cuenta cuántos de los frames analizados superan individualmente el umbral de confianza
        count_above = sum(1 for c in buffer_confianzas if c >= UMBRAL_CONFIANZA)

        # Filtro de Variabilidad Temporal: Evita falsas detecciones si la imagen está completamente estática
        # (por ejemplo, si se bloquea la cámara o hay patrones fijos en el fondo)
        variabilidad_valida = True
        if len(buffer_confianzas) == 10:
            desvio_std = float(np.std(buffer_confianzas))
            # Si el desvío estándar de las probabilidades es extremadamente bajo (<0.04),
            # significa que el valor predicho no cambia en absoluto, indicando estática
            if desvio_std < 0.04:
                variabilidad_valida = False
            print(f"[{time.strftime('%H:%M:%S')}] Analisis: {prob_bolsa * 100:.0f}% bolsa | Confirmaciones: {count_above}/10")
        else:
            print(f"[{time.strftime('%H:%M:%S')}] Calentando ({len(buffer_confianzas)}/10)...")

        # Criterio de Disparo de Alerta:
        # 1. Cola de suavizado completa (10 frames analizados)
        # 2. Al menos 8 de las 10 frames deben clasificar positivamente para bolsa
        # 3. Debe existir suficiente variabilidad en las probabilidades (no estática)
        if len(buffer_confianzas) == 10 and count_above >= 8 and variabilidad_valida:
            print(f"[{time.strftime('%H:%M:%S')}] Bolsa detectada. Guardando foto y enviando alerta...")

            # Almacena el frame como archivo JPEG localmente
            ruta_foto = guardar_foto_deteccion(frame, DETECCIONES_DIR, CAMARA_ID, avg_curr)
            nombre_foto = os.path.basename(ruta_foto) if ruta_foto else None

            # Si la conexión está en línea y se guardó la imagen, sube la alerta al servidor Flask
            api_online = check_api_connection(API_URL)
            if api_online and ruta_foto:
                url_post = f"{API_URL.rstrip('/')}/api/alertas/deteccion"
                # Incluye el token exclusivo de la cámara en los encabezados HTTP para autenticación
                headers = {"X-Camera-Token": CAMARA_TOKEN}
                data_payload = {
                    "camara_id": str(CAMARA_ID),
                    "confianza": f"{avg_curr:.4f}",
                    "latitud": f"{CAMARA_LATITUD:.7f}",
                    "longitud": f"{CAMARA_LONGITUD:.7f}"
                }

                try:
                    # Lee y sube el archivo en formato multipart/form-data
                    with open(ruta_foto, 'rb') as img_file:
                        files_payload = {'foto': (nombre_foto, img_file, 'image/jpeg')}
                        response = requests.post(url_post, headers=headers, data=data_payload, files=files_payload, timeout=10)

                    if response.status_code in (200, 201):
                        resp_json = response.json()
                        alerta_id = resp_json.get("alerta_id")
                        print(f"[{time.strftime('%H:%M:%S')}] Alerta registrada (ID: {alerta_id})")
                    else:
                        print(f"[{time.strftime('%H:%M:%S')}] La API no acepto la alerta. Foto guardada localmente.")
                except Exception as ex:
                    print(f"[{time.strftime('%H:%M:%S')}] No se pudo enviar la alerta: {ex}")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Sin conexion. Foto guardada localmente.")

            # Activa la pausa de enfriamiento para evitar alertas consecutivas en spam
            pausa_hasta = time.time() + PAUSA_DURACION
            print(f"[{time.strftime('%H:%M:%S')}] Pausa activa por {PAUSA_DURACION} segundos.")
            estado_monitoreo = f"Pausa ({PAUSA_DURACION}s)"
            buffer_confianzas.clear() # Limpia el búfer para iniciar una nueva secuencia limpia tras la pausa

        elif len(buffer_confianzas) == 10 and count_above >= 8 and not variabilidad_valida:
            print(f"[{time.strftime('%H:%M:%S')}] Posible bolsa, pero imagen sin movimiento. Ignorando.")

    # --- RENDERIZACIÓN DE LA INTERFAZ DE USUARIO EN PANTALLA ---
    # Crea una copia limpia del frame capturado para superponer la información gráfica
    display_frame = frame.copy()

    # Color del borde dinámico según el estado actual
    if "Pausa" in estado_monitoreo:
        color_estado = (255, 255, 0) # Cian/Amarillo para pausa
    else:
        color_estado = (0, 255, 0) # Verde para monitoreo activo

    h, w, _ = display_frame.shape

    # Dibuja el marco decorativo y el fondo superior para los textos
    cv2.rectangle(display_frame, (10, 10), (w - 10, h - 10), color_estado, 3)
    cv2.rectangle(display_frame, (15, 15), (w - 15, 65), (0, 0, 0), -1)

    # Dibuja el estado del monitoreo
    cv2.putText(
        display_frame,
        estado_monitoreo,
        (30, 48),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )



    # Dibuja el instructivo de salida
    cv2.putText(
        display_frame,
        "Q para salir",
        (30, h - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (160, 160, 160),
        1
    )

    # Muestra la ventana interactiva
    cv2.imshow("TrashFlow", display_frame)

    # Escucha si se presiona la tecla Q para detener el monitoreo
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Libera los recursos de la cámara
cap.release()
cv2.destroyAllWindows()
print("[TrashFlow] Detector cerrado.")