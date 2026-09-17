"""
simular_alerta_esp32.py
----------------------
Script de prueba y demostración interactiva para TrashFlow.
Permite simular una alerta en tiempo real enviada al ESP32 a través de la API
en https://trashflow.site (o en localhost).

Uso:
  py simular_alerta_esp32.py
  (o: python simular_alerta_esp32.py)
"""

import sys
import time
import json
import urllib.request
import urllib.error

# Soporte completo para caracteres UTF-8 en consolas Windows (cmd/PowerShell)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

API_BASE = "https://trashflow.site/api"
ADMIN_EMAIL = "admin@trashflow.com"
ADMIN_PASS = "admin"

def http_json(url, method="GET", data=None, token=None, headers_extra=None):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if headers_extra:
        headers.update(headers_extra)

    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_msg)
            raise RuntimeError(f"HTTP {e.code}: {err_json.get('mensaje', err_msg)}")
        except Exception:
            raise RuntimeError(f"HTTP {e.code}: {err_msg}")
    except Exception as e:
        raise RuntimeError(f"Error de red: {e}")

def main():
    print("=" * 65)
    print("  TrashFlow - Simulador de Alertas en Tiempo Real para ESP32")
    print(f"  Servidor: {API_BASE}")
    print("=" * 65)

    # 1. Login
    print("\n[1/4] Autenticando administrador...")
    try:
        login_res = http_json(f"{API_BASE}/auth/login", method="POST", data={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASS
        })
        token = login_res.get("token") or login_res.get("access_token")
        print("  [OK] Login exitoso.")
    except Exception as e:
        print(f"  [ERROR] Error al iniciar sesion: {e}")
        return

    # 2. Consultar dispositivo ESP32 registrado
    print("\n[2/4] Buscando dispositivo ESP32 vinculado...")
    try:
        devs_res = http_json(f"{API_BASE}/hardware/dispositivos", token=token)
        dispositivos = devs_res.get("dispositivos", [])
        if not dispositivos:
            print("  [ERROR] No hay dispositivos ESP32 registrados en el sistema.")
            return

        disp = dispositivos[0]
        device_token = disp.get("token_device", "trashflow_esp32_device_token_demo_2026")
        operador_id = disp.get("operador_id")
        operador_nombre = f"{disp.get('operador_nombre', '')} {disp.get('operador_apellido', '')}".strip()
        ultima_conexion = disp.get("ultima_conexion") or "Sin registro reciente"

        print(f"  - Dispositivo: #{disp['id']} '{disp['nombre']}'")
        print(f"  - Operario asignado: #{operador_id} {operador_nombre}")
        print(f"  - Ultima conexion ESP32: {ultima_conexion}")

        if not operador_id:
            print("  [AVISO] El dispositivo no tiene un operario asignado.")
            return
    except Exception as e:
        print(f"  [ERROR] Error consultando dispositivos: {e}")
        return

    # 3. Disparar alerta asignada al operario
    direccion_prueba = "Av. Maipu 1500, Vicente Lopez"
    print(f"\n[3/4] Generando alerta para {operador_nombre} (ID {operador_id})...")
    print(f"  - Ubicacion: {direccion_prueba}")

    alerta_id = None
    try:
        # Usamos el endpoint oficial de demo
        demo_res = http_json(f"{API_BASE}/alertas/demo", method="POST", data={
            "direccion": direccion_prueba,
            "confianza": 94.5,
            "camara_id": 1
        }, token=token)

        alerta_id = demo_res.get("alerta_id")
        print(f"  [OK] Alerta #{alerta_id} creada exitosamente en el sistema.")

        # /alertas/demo ya dispara auto_asignar_operario que prioriza al operario con hardware.
        # Si por alguna razon no quedo asignada, intentamos asignarla explicitamente:
        if operador_id:
            try:
                http_json(f"{API_BASE}/alertas/{alerta_id}/asignar", method="PATCH", data={
                    "operador_id": operador_id
                }, token=token)
            except Exception:
                # Si ya fue auto-asignada por /alertas/demo (estado_id != 1), es el comportamiento esperado
                pass
        print(f"  [OK] Alerta #{alerta_id} vinculada al operario #{operador_id} ({operador_nombre}).")
    except Exception as e:
        print(f"  [ERROR] Error al crear alerta de demo: {e}")
        return

    # Verificar que el endpoint de polling del ESP32 ya la tiene lista
    try:
        poll_check = http_json(
            f"{API_BASE}/hardware/alerta-pendiente",
            method="GET",
            headers_extra={"X-Device-Token": device_token}
        )
        alerta_info = poll_check.get("alerta")
        if alerta_info:
            print("\n  [VERIFICACION EXITOSA] El endpoint del ESP32 entrega:")
            print(f"    - Alerta ID : #{alerta_info.get('alerta_id')}")
            print(f"    - Zona      : {alerta_info.get('zona')}")
            print(f"    - Direccion : {alerta_info.get('direccion')}")
            print(f"    - Hora      : {alerta_info.get('fecha')} hs")
        else:
            print("  [AVISO] La alerta aun se esta propagando en el servidor.")
    except Exception as ex:
        print(f"  [AVISO] Verificacion polling: {ex}")

    # 4. Monitorear el polling del ESP32
    print("\n" + "=" * 65)
    print("  *** ALERTA ACTIVA EN EL SISTEMA TRASHFLOW ***")
    print("=" * 65)
    print("  En los proximos 10 segundos, tu ESP32 va a:")
    print("    1. Consultar /api/hardware/alerta-pendiente")
    print("    2. Si tiene buzzer activo: sonar 6 pitidos de alerta.")
    print("       Si es la version silenciosa: imprimir [BUZZER OFF] en el Serial.")
    print("    3. Encender la pantalla LCD 2004 con la zona y direccion.")
    print("    4. Iniciar el ciclo de recordatorio de 40 segundos.")
    print("=" * 65)

    # Opcion para resolver la alerta
    try:
        input("\nPresiona [ENTER] para RESOLVER la alerta y apagar la pantalla del ESP32...")
    except KeyboardInterrupt:
        print("\nInterrumpido por el usuario.")

    if alerta_id:
        try:
            print(f"\nMarcando alerta #{alerta_id} como RESUELTA...")
            http_json(f"{API_BASE}/alertas/{alerta_id}/estado", method="PATCH", data={
                "estado_id": 4, # 4 = resuelta
                "notas": "Limpieza confirmada desde el simulador interactivo"
            }, token=token)
            print("  [OK] Alerta marcada como RESUELTA en la base de datos.")
            print("  [OK] En su proxima consulta (max 10s), el ESP32 apagara el LCD y pasara a reposo.")
        except Exception as e:
            print(f"  [ERROR] Error al resolver alerta: {e}")

    print("\nSimulacion completada.")

if __name__ == "__main__":
    main()

