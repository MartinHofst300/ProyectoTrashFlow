# IMPORTANTE: Eliminación de Archivos de Evidencia

**No borrar archivos de esta carpeta manualmente ni usando git sin antes tomar las precauciones necesarias.**

## ¿Por qué?
El sistema guarda en la tabla `alertas` de MySQL una referencia a las imágenes almacenadas aquí (`foto_url`). 
Si se borran los archivos físicos (por ejemplo, para liberar espacio en el disco o aligerar el repositorio) sin actualizar la base de datos, las imágenes en el frontend (Dashboard, Mapa, etc.) darán error 404 (imagen rota).

## ¿Cómo limpiar de forma segura?
Si requieres borrar fotos antiguas, sigue estos pasos:
1. Elimina los archivos físicos de esta carpeta.
2. Ejecuta inmediatamente el script `api/limpiar_fotos_huerfanas.py` desde el entorno virtual para sanear la base de datos.
    ```bash
    python -m api.limpiar_fotos_huerfanas
    ```
Este script identificará las filas en la base de datos cuyas fotos ya no existen y les asignará una imagen placeholder (`static/fotos/placeholder_sin_evidencia.jpg`) de forma automática, manteniendo la integridad visual del sistema.
