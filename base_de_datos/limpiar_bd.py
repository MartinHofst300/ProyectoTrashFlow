import sys
import os

# Agregar directorio raíz al sys.path para importar api
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import get_db

def main():
    print("[TrashFlow] Iniciando vaciado de base de datos en una sola sesión...")
    conexion = None
    try:
        conexion = get_db()
        with conexion.cursor() as cursor:
            # Desactivar restricciones de clave foránea en esta sesión
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Vaciar tablas
            cursor.execute("TRUNCATE TABLE historial_alertas")
            cursor.execute("TRUNCATE TABLE alertas")
            
            # Reactivar restricciones de clave foránea
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            # Restablecer estadísticas de cámaras
            cursor.execute("UPDATE camaras SET total_detecciones = 0, estado = 'offline', ultima_conexion = NULL")
            
        conexion.commit()
        print("[TrashFlow] Base de datos vaciada y cámaras reiniciadas con éxito.")
    except Exception as e:
        print(f"[TrashFlow] [ERROR] Falló la limpieza de la base de datos: {e}")
        if conexion:
            try:
                conexion.rollback()
            except Exception:
                pass
        sys.exit(1)
    finally:
        if conexion:
            conexion.close()

if __name__ == "__main__":
    main()
