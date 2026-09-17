import sys
import esptool
import esptool.reset

print("Patching classic_bootloader_reset...")

orig_reset = esptool.reset.classic_bootloader_reset

def patched_reset(port, enter_boot_delay=0.15, reset_delay=0.5, flow_control=True):
    print(f"\n[PATCHED RESET] enter_boot_delay={enter_boot_delay}, reset_delay={reset_delay}, flow_control={flow_control}")
    orig_reset(port, enter_boot_delay=enter_boot_delay, reset_delay=reset_delay, flow_control=flow_control)

esptool.reset.classic_bootloader_reset = patched_reset

try:
    cmd = ["--chip", "esp32", "--port", "COM5", "--baud", "115200", "chip-id"]
    esptool.main(cmd)
except SystemExit as e:
    print("Salida:", e.code)
