import serial
import time
import subprocess

PORT = 'COM5'

def enter_bootloader():
    print(f"[1] Abriendo puerto {PORT}...")
    ser = serial.Serial(PORT, 115200)
    
    print("[2] Forzando reset con IO0 en LOW extendido...")
    # 1. Bajar EN (resetear) y preparar IO0
    ser.setDTR(False)  # DTR pin = HIGH
    ser.setRTS(True)   # RTS pin = LOW -> Q1 pulls EN to GND
    time.sleep(0.15)
    
    # 2. Bajar IO0 mientras EN sigue abajo
    ser.setDTR(True)   # DTR pin = LOW -> Q2 pulls IO0 to GND
    ser.setRTS(True)
    time.sleep(0.1)
    
    # 3. Soltar EN pero MANTENER IO0 en LOW
    ser.setRTS(False)  # RTS pin = HIGH -> EN sube a 3.3V
    # Esperar 250ms a que el capacitor de EN se cargue y el chip despierte
    time.sleep(0.35)
    
    # 4. Ahora soltar IO0
    ser.setDTR(False)  # IO0 sube a 3.3V
    time.sleep(0.1)
    
    ser.close()
    print("[3] Secuencia completada. Probando conexión...")

if __name__ == '__main__':
    enter_bootloader()
    
    esptool_path = r"C:\Users\hofst\AppData\Local\Arduino15\packages\esp32\tools\esptool_py\5.3.1\esptool.exe"
    cmd = [esptool_path, "--chip", "esp32", "--port", PORT, "--baud", "115200", "--before", "no-reset", "chip-id"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:\n", res.stdout)
    print("STDERR:\n", res.stderr)
