# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: modelo/main.py
Descripción: Script de entrenamiento para el modelo de Inteligencia Artificial (Red Neuronal Convolucional - CNN).
             Se encarga de cargar las imágenes del dataset local divididas en categorías ("bolsa" y "sin_bolsa"),
             preprocesarlas (conversión a escala de grises, redimensionamiento a 64x64, normalización de píxeles),
             compilar y entrenar la red convolucional utilizando TensorFlow/Keras, guardar el archivo del modelo
             pesado (.keras) y realizar una prueba interactiva en tiempo real utilizando la cámara web.

Dependencias:
  - os, sys (Manejo del sistema operativo y rutas)
  - tensorflow, keras (Construcción, compilación y entrenamiento de la red neuronal)
  - numpy (Procesamiento numérico y manipulación de matrices de imágenes)
  - cv2 (OpenCV - Procesamiento de imágenes y stream de video en vivo)

Entrada:
  - Archivos de imágenes en 'modelo/entrenamiento/bolsa/' y 'modelo/entrenamiento/sin_bolsa/'

Salida:
  - Modelo entrenado en 'modelo/modelo_bolsas.keras'
  - Ventana interactiva de OpenCV mostrando la detección en tiempo real.
"""

import os
import tensorflow as tf
import keras
import numpy as np
import cv2

# Obtiene la ruta del directorio actual donde está este script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Definición de las categorías/clases para la clasificación
cat = ["bolsa", "sin_bolsa"]
imgs = []
labels = []

print("[TrashFlow] Cargando dataset de entrenamiento...")

# Ciclo para recorrer las carpetas de las clases y cargar las imágenes
for label_idx, cat_name in enumerate(cat):
    folder_path = os.path.join(BASE_DIR, "entrenamiento", cat_name)
    if not os.path.exists(folder_path):
        print(f"[TrashFlow] La carpeta {folder_path} no existe.")
        continue

    # Lista todos los archivos del directorio de la categoría
    archivos = os.listdir(folder_path)
    # Filtra solo archivos que tengan extensiones válidas de imágenes
    archivos_imagen = [f for f in archivos if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    loaded_count = 0
    for archivo in archivos_imagen:
        img_path = os.path.join(folder_path, archivo)
        # Lee la imagen en escala de grises (simplifica los canales de entrada para el modelo)
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        # Redimensiona la imagen a 64x64 píxeles para asegurar uniformidad en la entrada
        img = cv2.resize(img, (64, 64))
        imgs.append(img)
        labels.append(label_idx) # Asocia la imagen con su índice de clase (0 = bolsa, 1 = sin_bolsa)
        loaded_count += 1

    print(f"[TrashFlow] Clase '{cat_name}' (indice {label_idx}): {loaded_count} imagenes cargadas.")

# Convierte las listas de Python a arreglos de NumPy para que TensorFlow pueda procesarlas
imgs = np.array(imgs)
labels = np.array(labels)

# Finaliza la ejecución si no se encontró ninguna imagen en los directorios
if len(imgs) == 0:
    print("[TrashFlow] No se pudieron cargar imagenes. Finalizando...")
    exit(1)

# Redimensiona el arreglo de imágenes para añadir el canal de color (1 para escala de grises)
# El formato de entrada requerido por Conv2D es: (cantidad_muestras, alto, ancho, canales)
imgs = imgs.reshape(-1, 64, 64, 1)
# Normaliza el valor de los píxeles al rango [0, 1] dividiendo por 255.0
imgs = imgs / 255.0

print(f"[TrashFlow] Total de imagenes para entrenamiento: {len(imgs)}")

# Definición de la arquitectura secuencial de la Red Neuronal Convolucional (CNN)
model = keras.Sequential([
    # Capa de entrada que define la forma de las imágenes (64x64, 1 canal de color)
    keras.layers.Input(shape=(64, 64, 1)),
    
    # Primera capa convolucional con 32 filtros y kernel de 3x3, con función de activación ReLU
    keras.layers.Conv2D(32, (3, 3), activation="relu"),
    # Reducción de dimensiones por Max Pooling de 2x2
    keras.layers.MaxPooling2D(2, 2),
    
    # Segunda capa convolucional con 64 filtros para extraer características de mayor nivel
    keras.layers.Conv2D(64, (3, 3), activation="relu"),
    keras.layers.MaxPooling2D(2, 2),
    
    # Dropout del 50% para reducir el sobreajuste (overfitting) durante el entrenamiento
    keras.layers.Dropout(0.5),
    # Aplaneamiento de la matriz tridimensional a un vector unidimensional
    keras.layers.Flatten(),
    
    # Capa densa (completamente conectada) con 100 neuronas
    keras.layers.Dense(units=100, activation="relu"),
    # Capa de salida con activación Softmax para obtener la distribución de probabilidad (2 clases)
    keras.layers.Dense(2, activation="softmax")
])

# Compilación del modelo definiendo el optimizador, la función de pérdida y la métrica de precisión
model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

print("[TrashFlow] Iniciando entrenamiento del modelo CNN...")
# Inicia el entrenamiento con 100 épocas y un 10% del dataset reservado para validación
model.fit(
    imgs,
    labels,
    epochs=100,
    validation_split=0.1
)

# Guarda el modelo entrenado en formato Keras nativo
model_save_path = os.path.join(BASE_DIR, "modelo_bolsas.keras")
model.save(model_save_path)
print(f"[TrashFlow] Entrenamiento finalizado. Modelo guardado en: {model_save_path}")

print("[TrashFlow] Iniciando prueba de camara en vivo (presiona ESC para salir)...")
# Inicializa la captura de video usando la cámara web (índice 0)
camara = cv2.VideoCapture(0)

while True:
    ret, frame = camara.read()
    if not ret:
        print("[TrashFlow] No se pudo leer el stream de la camara.")
        break

    # Procesa la imagen capturada por la cámara de la misma manera que el dataset de entrenamiento
    gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gris = cv2.resize(gris, (64, 64))
    
    # Prepara el vector para pasarlo al modelo
    test = np.asarray(gris)
    test = np.array([test])
    test = test.reshape(-1, 64, 64, 1)
    test = test / 255.0

    # Realiza la predicción de la clase de la imagen
    result = model.predict(test, verbose=0)
    
    # Extrae las probabilidades individuales devueltas por Softmax
    prob_bolsa = float(result[0][0])
    prob_sin_bolsa = float(result[0][1])

    # Si la probabilidad de bolsa supera el 75%, se clasifica como BOLSA DETECTADA
    if prob_bolsa >= 0.75:
        color = (0, 255, 0) # Verde para detección positiva
        estado = "BOLSA DETECTADA"
        confianza_mostrar = prob_bolsa * 100.0
    else:
        color = (0, 0, 255) # Rojo si no hay bolsa
        estado = "SIN BOLSA"
        confianza_mostrar = prob_sin_bolsa * 100.0

    # Dibuja un rectángulo indicador en el frame
    h, w, _ = frame.shape
    cv2.rectangle(frame, (15, 15), (w - 15, h - 15), color, 4)

    # Dibuja el texto del estado detectado
    cv2.putText(
        frame,
        f"{estado}",
        (30, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        color,
        3
    )

    # Muestra la ventana interactiva
    cv2.imshow("Prueba Modelo TrashFlow", frame)

    # Escucha la tecla ESC (código ASCII 27) para salir del bucle
    if cv2.waitKey(1) & 0xFF == 27:
        break

# Libera el dispositivo de captura y destruye las ventanas abiertas
camara.release()
cv2.destroyAllWindows()