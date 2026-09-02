# -*- coding: utf-8 -*-
"""
Script de limpieza única para la base de datos de TrashFlow.
Corrige registros de alertas donde el archivo fotográfico ya no existe en el disco.
"""

import os
from api.database import query
from api.config import BASE_DIR

PLACEHOLDER = "static/fotos/placeholder_sin_evidencia.jpg"

def main():
    print("Iniciando verificación de fotos huérfanas en la tabla alertas...")
    
    # Obtener todas las alertas
    alertas = query("SELECT id, foto_url FROM alertas")
    if not alertas:
        print("No se encontraron alertas en la base de datos.")
        return
        
    total_revisadas = len(alertas)
    corregidas = []
    
    for alerta in alertas:
        foto_url = alerta.get("foto_url")
        if not foto_url or foto_url == PLACEHOLDER:
            continue
            
        foto_path = os.path.join(BASE_DIR, foto_url)
        if not os.path.exists(foto_path):
            alerta_id = alerta["id"]
            # Archivo no existe, actualizar BD
            query("UPDATE alertas SET foto_url = %s WHERE id = %s", (PLACEHOLDER, alerta_id))
            corregidas.append(alerta_id)
            
    # Resumen
    print("=========================================")
    print(f"Total de alertas revisadas: {total_revisadas}")
    print(f"Total de alertas corregidas: {len(corregidas)}")
    if corregidas:
        print(f"IDs corregidos: {', '.join(map(str, corregidas))}")
    print("=========================================")
    print("Limpieza completada.")

if __name__ == "__main__":
    main()
