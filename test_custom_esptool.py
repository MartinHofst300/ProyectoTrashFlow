import sys
import time
import esptool

print("Versión de esptool:", esptool.__version__)

# Monkey-patch default_reset en ESPLoader
orig_default_reset = esptool.loader.ESPLoader.default_reset

def custom_default_reset(self):
    print("\n[CUSTOM RESET] Iniciando secuencia con retardo extendido para capacitor EN...")
    self._setDTR(False)  # IO0 = HIGH
    self._setRTS(True)   # EN = LOW (reset)
    time.sleep(0.2)
    self._setDTR(True)   # IO0 = LOW (Download mode)
    self._setRTS(False)  # EN = HIGH (wake up)
    # En lugar de 50ms, esperamos 400ms para que el capacitor de EN suba completamente!
    time.sleep(0.5)
    self._setDTR(False)  # IO0 = HIGH
    print("[CUSTOM RESET] Chip reiniciado con IO0 en LOW exitosamente!\n")

esptool.loader.ESPLoader.default_reset = custom_default_reset

# Probar conexión
try:
    cmd = ["--chip", "esp32", "--port", "COM5", "--baud", "115200", "chip_id"]
    esptool.main(cmd)
except SystemExit as e:
    print("Código de salida:", e.code)
