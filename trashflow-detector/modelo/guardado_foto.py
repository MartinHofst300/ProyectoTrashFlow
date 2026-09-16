# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: modelo/guardado_foto.py
Descripción: Proporciona utilidades para guardar los frames de video capturados
             por las cámaras de monitoreo cuando el modelo CNN detecta una bolsa.
             Genera nombres estructurados de archivos que incluyen marcas de fecha,
             hora, identificador de dispositivo y la confianza estimada del modelo.

Dependencias:
  - os (Manejo de directorios en disco)
  - time (Lectura y formateo de la hora local del sistema)
  - cv2 (OpenCV - Codificación y escritura de archivos de imagen a disco)
"""

import os
import time
import cv2


def guardar_foto_deteccion(frame, directorio, camara_id, confianza):
    """
    Guarda el frame capturado en el directorio de detecciones con un nombre estructurado
    que incluye la fecha, hora, ID de cámara y porcentaje de confianza.

    Formato del nombre:
      deteccion_AAAAMMDD_HHMMSS_cam{id}_conf{porcentaje}.jpg

    Parámetros:
      frame: Matriz NumPy con el cuadro de imagen a guardar
      directorio: Ruta absoluta de destino en el disco
      camara_id: ID numérico de la cámara de origen
      confianza: Fracción de probabilidad (0.0 a 1.0) estimada por el modelo

    Retorna:
      La ruta completa del archivo guardado, o None si ocurre algún fallo de escritura.
    """
    # Asegura la existencia del directorio de destino en el disco
    os.makedirs(directorio, exist_ok=True)

    # Formatea la fecha y hora del sistema local para el nombre
    fecha = time.strftime("%Y%m%d")
    hora = time.strftime("%H%M%S")
    confianza_pct = int(round(confianza * 100))

    # Construye el nombre estructurado del archivo
    nombre_archivo = f"deteccion_{fecha}_{hora}_cam{camara_id}_conf{confianza_pct}.jpg"
    ruta_completa = os.path.join(directorio, nombre_archivo)

    # Escribe la imagen en el almacenamiento local en formato JPEG
    exito = cv2.imwrite(ruta_completa, frame)
    if not exito:
        print(f"[TrashFlow] No se pudo guardar la imagen en: {ruta_completa}")
        return None

    return ruta_completa