# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: modelo/detector.py
Descripción: Script daemon/servicio encargado de monitorear una cámara en vivo (webcam o stream).
             Carga el modelo entrenado YOLOv8n y procesa los frames.
             Utiliza un contador de 5 frames consecutivos positivos con confianza >= 0.60
             para filtrar falsos positivos antes de emitir una alerta.
             Al detectar una bolsa de basura con alta confianza, guarda el frame de la evidencia y
             envía una petición HTTP POST autenticada con token al backend para crear el reporte en el panel.

Dependencias:
  - os, sys, time (Manejo de rutas del sistema operativo y retardos)
  - cv2 (OpenCV - Captura, procesamiento de frames y dibujo de interfaces visuales)
  - requests (Comunicación HTTP/REST con la API Flask)
  - dotenv (Carga de variables de entorno configuradas en el archivo .env del proyecto)
  - ultralytics (Carga e inferencia del modelo YOLOv8)
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
import requests
from dotenv import load_dotenv
from ultralytics import YOLO

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
UMBRAL_CONFIANZA       = 0.85  # Confianza mínima para considerar una detección válida
CONSECUTIVOS_REQUERIDOS = 5    # Frames positivos consecutivos antes de disparar la alerta
PAUSA_DURACION         = 1800  # 30 minutos de pausa tras una alerta (alineado con cooldown del ESP32)

# Filtros anti-falso-positivo por geometría del bounding box
# Una bolsa legítima en la vía pública ocupa al menos el 0.5% del área total del frame
# Objetos más pequeños son ruido, sombras, o bolsas demasiado lejanas para reportar
MIN_AREA_PORCENTAJE    = 0.005  # 0.5% del frame como mínimo
# Ratio ancho/alto: una bolsa tiene forma roughly cuadrada (0.3 a 3.5)
# Valores extremos (ej: ratio=10) suelen ser bordes de autos, postes, etc.
MIN_ASPECT_RATIO       = 0.25
MAX_ASPECT_RATIO       = 4.0

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


print("[TrashFlow] Iniciando detector YOLOv8n...")

# Carga del modelo YOLOv8n fine-tuned
model_path = os.path.join(BASE_DIR, "bolsas_yolo.pt")
if not os.path.exists(model_path):
    print(f"[TrashFlow] No se encontro el modelo en {model_path}.")
    sys.exit(1)

model = YOLO(model_path)
print(f"[TrashFlow] Clases del modelo: {model.names}")
print(f"[TrashFlow] Cantidad de clases: {len(model.names)}")
print("[TrashFlow] Modelo YOLOv8n cargado correctamente.")

# Verifica la conectividad inicial con el backend REST
api_online = check_api_connection(API_URL)
if api_online:
    print("[TrashFlow] Conectado a la API.")
else:
    print("[TrashFlow] Sin conexion a la API. Funcionando en modo local.")

print("[TrashFlow] Camara activa. Presiona Q para salir.")

# Escaneo de cámaras disponibles
camaras_detectadas = []
for i in range(5):
    temp_cap = cv2.VideoCapture(i)
    if temp_cap.isOpened():
        camaras_detectadas.append(i)
        temp_cap.release()

env_cam_idx = os.getenv("CAMARA_INDICE_CV")
indice_elegido = None

if env_cam_idx is not None:
    try:
        env_cam_idx = int(env_cam_idx)
        if env_cam_idx in camaras_detectadas:
            indice_elegido = env_cam_idx
            print(f"[TrashFlow] Usando camara preconfigurada en .env: [{indice_elegido}]")
        else:
            print(f"[TrashFlow] Advertencia: La camara {env_cam_idx} definida en .env no se encuentra conectada.")
    except ValueError:
        print("[TrashFlow] Advertencia: CAMARA_INDICE_CV en .env no es un numero valido.")

if indice_elegido is None:
    if len(camaras_detectadas) == 0:
        print("[TrashFlow] No se detectó ninguna cámara conectada")
        sys.exit(1)
    elif len(camaras_detectadas) == 1:
        indice_elegido = camaras_detectadas[0]
        print(f"[TrashFlow] Usando única cámara detectada: [{indice_elegido}]")
    else:
        print("[TrashFlow] Cámaras detectadas:")
        for idx in camaras_detectadas:
            print(f"  [{idx}] Cámara {idx}")
        
        while True:
            try:
                seleccion = input("[TrashFlow] Ingresa el número de cámara a usar: ")
                seleccion = int(seleccion)
                if seleccion in camaras_detectadas:
                    indice_elegido = seleccion
                    break
                else:
                    print("[TrashFlow] Opción inválida. Intenta nuevamente.")
            except ValueError:
                print("[TrashFlow] Por favor, ingresa un número válido.")

# Inicializa la captura de video usando la cámara elegida
cap = cv2.VideoCapture(indice_elegido)
if not cap.isOpened():
    print("[TrashFlow] No se pudo abrir la camara seleccionada.")
    sys.exit(1)

# Variables de estado internas para el bucle principal de procesamiento
last_analysis_time = 0
last_api_check = time.time()
pausa_hasta = 0
estado_monitoreo = "Monitoreando..."
consecutive_positive_frames = 0
list_detecciones = []
cant_bolsas = 0
confianza_promedio = 0.0

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
        list_detecciones = []
        cant_bolsas = 0
        consecutive_positive_frames = 0

    # Ejecuta el análisis del modelo cada 2 segundos (optimiza el consumo de CPU/GPU)
    if not en_pausa and (current_time - last_analysis_time >= 2):
        last_analysis_time = current_time
        estado_monitoreo = "Monitoreando..."

        # Realiza la predicción del frame con los parámetros ajustados:
        # iou=0.3: reduce la agresividad del Non-Maximum Suppression, permitiendo detectar bolsas que se superponen o están muy juntas entre sí
        # conf=0.35: baja el umbral mínimo de confianza de 0.60 a 0.35 para que el modelo no descarte detecciones válidas con confianza media
        # max_det=50: aumenta el límite máximo de detecciones por frame de 300 a 50 objetos visibles simultáneamente (más que suficiente para el caso de uso)
        results = model.predict(frame, verbose=False, iou=0.3, conf=0.35, max_det=50)
        
        # Filtra detecciones por confianza Y por geometría del bounding box
        detecciones_frame = []
        if len(results) > 0 and results[0].boxes is not None:
            h_frame, w_frame, _ = frame.shape
            area_frame = h_frame * w_frame

            for box in results[0].boxes:
                conf = float(box.conf[0])
                if conf < UMBRAL_CONFIANZA:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                ancho = x2 - x1
                alto  = y2 - y1

                # Filtro 1: Tamaño mínimo — descarta objetos muy pequeños/lejanos
                area_box = ancho * alto
                if area_box < (area_frame * MIN_AREA_PORCENTAJE):
                    print(f"  [Filtro Tamaño] Descartado: área {area_box}px² < mínimo {area_frame * MIN_AREA_PORCENTAJE:.0f}px² | conf={conf:.2f}")
                    continue

                # Filtro 2: Aspect ratio — descarta formas muy alargadas (postes, bordes de autos)
                if alto == 0:
                    continue
                ratio = ancho / alto
                if ratio < MIN_ASPECT_RATIO or ratio > MAX_ASPECT_RATIO:
                    print(f"  [Filtro Ratio] Descartado: ratio={ratio:.2f} fuera de [{MIN_ASPECT_RATIO}, {MAX_ASPECT_RATIO}] | conf={conf:.2f}")
                    continue

                detecciones_frame.append({
                    'coords': (x1, y1, x2, y2),
                    'conf': conf
                })

        list_detecciones = detecciones_frame
        cant_bolsas = len(detecciones_frame)

        if cant_bolsas > 0:
            consecutive_positive_frames += 1
            confianza_promedio = sum(d['conf'] for d in detecciones_frame) / cant_bolsas
            print(f"[{time.strftime('%H:%M:%S')}] [{consecutive_positive_frames}/{CONSECUTIVOS_REQUERIDOS}] Bolsa(s): {cant_bolsas} | Conf: {confianza_promedio * 100:.1f}%")
        else:
            consecutive_positive_frames = 0
            confianza_promedio = 0.0
            print(f"[{time.strftime('%H:%M:%S')}] Sin detecciones válidas.")

        # Criterio de Disparo de Alerta:
        # Al alcanzar 5 frames positivos consecutivos
        if consecutive_positive_frames >= CONSECUTIVOS_REQUERIDOS:
            print(f"[{time.strftime('%H:%M:%S')}] Alerta gatillada por {CONSECUTIVOS_REQUERIDOS} frames consecutivos. Guardando foto y enviando alerta...")

            # Crear frame anotado para guardar la foto
            frame_anotado = frame.copy()
            for det in list_detecciones:
                x1, y1, x2, y2 = det['coords']
                conf = det['conf']
                cv2.rectangle(frame_anotado, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame_anotado, f"{conf:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

            # Almacena el frame anotado como archivo JPEG localmente
            ruta_foto = guardar_foto_deteccion(frame_anotado, DETECCIONES_DIR, CAMARA_ID, confianza_promedio)
            nombre_foto = os.path.basename(ruta_foto) if ruta_foto else None

            # Si la conexión está en línea y se guardó la imagen, sube la alerta al servidor Flask
            api_online = check_api_connection(API_URL)
            if api_online and ruta_foto:
                url_post = f"{API_URL.rstrip('/')}/api/alertas/deteccion"
                # Incluye el token exclusivo de la cámara en los encabezados HTTP para autenticación
                headers = {"X-Camera-Token": CAMARA_TOKEN}
                data_payload = {
                    "camara_id": str(CAMARA_ID),
                    "confianza": f"{confianza_promedio:.4f}",
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
                        print(f"[{time.strftime('%H:%M:%S')}] La API no acepto la alerta (Status {response.status_code}). Eliminando foto local...")
                        if os.path.exists(ruta_foto):
                            os.remove(ruta_foto)
                except Exception as ex:
                    print(f"[{time.strftime('%H:%M:%S')}] No se pudo enviar la alerta: {ex}")
                    if ruta_foto and os.path.exists(ruta_foto):
                        os.remove(ruta_foto)
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Sin conexion o sin archivo de foto. Eliminando foto local si existe.")
                if ruta_foto and os.path.exists(ruta_foto):
                    os.remove(ruta_foto)

            # Activa la pausa de enfriamiento para evitar alertas consecutivas en spam
            pausa_hasta = time.time() + PAUSA_DURACION
            print(f"[{time.strftime('%H:%M:%S')}] Pausa activa por {PAUSA_DURACION} segundos.")
            estado_monitoreo = f"Pausa ({PAUSA_DURACION}s)"
            consecutive_positive_frames = 0
            list_detecciones = []
            cant_bolsas = 0

    # --- RENDERIZACIÓN DE LA INTERFAZ DE USUARIO EN PANTALLA ---
    # Crea una copia limpia del frame capturado para superponer la información gráfica
    display_frame = frame.copy()

    # Dibuja las detecciones de la última inferencia en pantalla
    for det in list_detecciones:
        x1, y1, x2, y2 = det['coords']
        conf = det['conf']
        cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        cv2.putText(display_frame, f"{conf:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

    # Color del borde dinámico según el estado actual
    if "Pausa" in estado_monitoreo:
        color_estado = (0, 255, 255)  # Amarillo/Cian para pausa
    else:
        color_estado = (0, 255, 0)    # Verde para monitoreo activo

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

    # Dibuja la cantidad de bolsas detectadas
    cv2.putText(
        display_frame,
        f"Bolsas detectadas: {cant_bolsas}",
        (w - 300, 48),
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