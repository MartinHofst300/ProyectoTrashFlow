# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: config.py
Descripción: Configuración centralizada de variables del sistema.
             Lee y parsea las variables secretas y de conexión desde el archivo .env
             usando la biblioteca python-dotenv, proporcionando valores por defecto seguros
             en caso de ausencia para evitar caídas del backend.

Dependencias:
  - python-dotenv
"""

import os
from dotenv import load_dotenv

# Carga las variables definidas en el archivo .env al entorno de ejecución de Python
load_dotenv()

# Clave secreta para la encriptación de cookies y sesiones de Flask
SECRET_KEY = os.getenv("SECRET_KEY", "cambiar_esto_en_produccion")

# Clave criptográfica para firmar los tokens JWT (debe tener al menos 32 caracteres por seguridad)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cambiar_esto_en_produccion")

# Parámetros de conexión para el motor de base de datos MySQL (levantado vía XAMPP)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "trashflow")

# Configuración de carpetas absolutas para el guardado físico de fotos (evidencia de IA)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.getenv(
    "UPLOAD_FOLDER", 
    os.path.join(BASE_DIR, "static", "fotos", "detecciones")
)
