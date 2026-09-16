# -*- coding: utf-8 -*-
"""
TrashFlow — Script de Reentrenamiento del Modelo YOLOv8n
=========================================================

Parte desde bolsas_yolo.pt (ya entrenado 50 epochs sobre otro de 100 epochs)
y agrega 50 epochs más con augmentations mejoradas para subir el recall.

Tiempo estimado en CPU: ~12 horas (50 epochs x ~14 min/epoch)
Guardar resultado en:   runs/detect/train-v2/weights/best.pt

Uso:
    cd c:\\xampp\\htdocs\\dashboard\\TrashFlow-PRESENTACION
    python modelo/entrenar.py
"""

import os
from ultralytics import YOLO

# ── Rutas ──────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

# Partir desde el modelo YA entrenado (50 epochs encima de 100)
MODELO_BASE = os.path.join(BASE_DIR, "bolsas_yolo.pt")
DATASET     = os.path.join(BASE_DIR, "dataset", "data.yaml")

print("=" * 60)
print("  TrashFlow — Reentrenamiento YOLOv8n")
print("=" * 60)
print(f"  Modelo base  : {MODELO_BASE}")
print(f"  Dataset      : {DATASET}")
print(f"  Epochs       : 50 adicionales")
print(f"  Tiempo aprox : ~12 horas en CPU")
print("=" * 60)
print()

# ── Cargar el modelo existente ─────────────────────────────────────────────────
model = YOLO(MODELO_BASE)   # continúa desde los pesos actuales, NO desde cero

# ── Entrenamiento ──────────────────────────────────────────────────────────────
model.train(
    data    = DATASET,
    epochs  = 50,          # 50 epochs más (cada una ~14 min en CPU)
    patience= 15,          # para si 15 epochs seguidas no mejoran el mAP50
    batch   = 16,          # igual que el entrenamiento anterior
    imgsz   = 640,
    device  = "cpu",       # cambiar a "0" si tenés GPU NVIDIA
    workers = 0,

    # Tasa de aprendizaje baja porque el modelo ya está casi convergeado
    lr0  = 0.002,          # arrancar suave (era 0.005 antes)
    lrf  = 0.01,

    # ── Augmentations mejoradas ────────────────────────────────────────────────
    # Las que ya tenía:
    hsv_h    = 0.015,      # variación de tono (bolsas de distintos colores)
    hsv_s    = 0.85,       # saturación (bolsas mojadas o sucias)
    hsv_v    = 0.45,       # brillo (día/tarde/noche)
    fliplr   = 0.5,        # espejo horizontal
    scale    = 0.6,        # zoom in/out
    translate= 0.1,        # desplazamiento

    # Las que se agregan ahora:
    degrees   = 15.0,      # rotación ±15° (bolsas caídas de costado)
    flipud    = 0.2,       # volteo vertical (bolsas sobre objetos altos)
    mixup     = 0.10,      # mezcla suave de 2 imágenes (mejora generalización)
    copy_paste= 0.30,      # ⭐ CLAVE: copia bolsas y las pega en otros fondos
                           #    le enseña a detectar bolsas en contextos nuevos
    mosaic    = 1.0,       # combinar 4 imágenes en 1 (ya estaba activo)

    # ── Salida ────────────────────────────────────────────────────────────────
    name      = "train-v2",
    project   = os.path.join(PROJECT_DIR, "runs", "detect"),
    exist_ok  = True,
    plots     = True,      # genera gráficas de pérdida y métricas
)

print()
print("=" * 60)
print("  Entrenamiento completado")
print(f"  Nuevo modelo: runs/detect/train-v2/weights/best.pt")
print()
print("  Para aplicarlo, ejecutar:")
print("  copy runs\\detect\\train-v2\\weights\\best.pt modelo\\bolsas_yolo.pt")
print("=" * 60)
