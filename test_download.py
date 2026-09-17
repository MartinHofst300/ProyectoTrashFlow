import serial
import time
import subprocess

PORT = 'COM5'

# 1. Conectar y poner en Download Mode
s = serial.Serial(PORT, 115200)
# EN = LOW (reset)
s.dtr = True
s.rts = False
time.sleep(0.15)

# EN = HIGH, IO0 = LOW (Download mode)
s.dtr = False
s.rts = True
time.sleep(0.3)
s.close()

# 2. Ejecutar esptool inmediatamente sin resetear
esptool_path = r"C:\Users\hofst\AppData\Local\Arduino15\packages\esp32\tools\esptool_py\5.3.1\esptool.exe"
cmd = [esptool_path, "--chip", "esp32", "--port", PORT, "--baud", "115200", "--before", "no-reset", "chip-id"]
res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:\n", res.stdout)
print("STDERR:\n", res.stderr)
