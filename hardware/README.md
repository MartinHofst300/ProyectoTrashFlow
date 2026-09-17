# 📟 TrashFlow — Módulo de Hardware ESP32 (Terminal de Notificaciones en Campo)

Este directorio contiene los firmwares (.ino) para el microcontrolador **ESP32**, diseñado como receptor de alertas en tiempo real para operarios de recolección municipal.

---

## 📁 Archivos Disponibles en esta Carpeta

| Archivo | Servidor Destino | Buzzer | Uso Recomendado |
| :--- | :--- | :---: | :--- |
| **`trashflow_esp32.ino`** | `https://trashflow.site` (Nube) | ✅ **Activo** | **Versión Oficial para la Presentación final.** Emite 6 pitidos en la nueva alerta y 3 pitidos en el primer recordatorio a los 40s. |
| **`trashflow_esp32_silencioso.ino`** | `https://trashflow.site` (Nube) | 🔇 **0 dB (Silencioso)** | **Versión para Pruebas Nocturnas / Desarrollo.** El buzzer está completamente deshabilitado para no hacer ruido mientras la familia duerme. Toda la lógica y pantalla LCD funcionan exactamente igual. |
| **`trashflow_esp32_localhost.ino`** | `http://127.0.0.1:5005` (Local) | ✅ **Activo** | **Versión para Desarrollo Local sin conexión a Internet.** Se comunica con la API de Python corriendo en tu propia PC. |

---

## 🛠️ Todo lo que debés Descargar e Instalar en Arduino IDE

Para poder compilar y subir el código al ESP32 desde cualquier computadora, seguí estos pasos ordenados:

### 1. Descargar Arduino IDE
* Si aún no lo tenés instalado, descargá la versión oficial **Arduino IDE 2.x** para Windows:
  👉 [Descargar Arduino IDE Oficial](https://www.arduino.cc/en/software)

---

### 2. Instalar el Soporte de Placas ESP32 (Espressif)
Por defecto, Arduino IDE solo viene con soporte para placas Arduino comunes (Uno, Nano, Mega). Para habilitar el ESP32:

1. Abrí **Arduino IDE**.
2. Andá a **Archivo $\rightarrow$ Preferencias** (o presioná `Ctrl + Coma`).
3. En la casilla **"Gestor de URLs Adicionales de Tarjetas"**, pegá el siguiente enlace:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
   *(Si ya tenés otra URL en ese campo, separalas con una coma `,` o hacé clic en el ícono de ventana al lado para agregarlo en una nueva línea).*
4. Hacé clic en **Aceptar (OK)**.
5. En la barra lateral izquierda de Arduino IDE, hacé clic en el ícono del **Gestor de Placas** (Boards Manager, o presioná `Ctrl + Shift + B`).
6. En el buscador escribí: **`esp32`**.
7. Buscá el paquete llamado **`esp32`** cuyo autor sea **Espressif Systems** y hacé clic en **Instalar** (tardará entre 1 y 3 minutos en descargar los compiladores).

---

### 3. Instalar las Librerías Necesarias
En la barra lateral izquierda, hacé clic en el ícono de libros / **Gestor de Librerías** (o presioná `Ctrl + Shift + I`).

Buscá e instalá estas 2 librerías:

1. **`ArduinoJson`**
   * **Autor:** Benoît Blanchon.
   * **Instalación:** Buscá `ArduinoJson` e instalá la versión 6.x (o 7.x, ambas son 100% compatibles).
   * **Función:** Permite deserializar y leer las respuestas JSON que entrega la API de TrashFlow.

2. **`LiquidCrystal I2C`**
   * **Autor:** Frank de Brabander (o Marco Schwartz).
   * **Instalación:** Buscá `LiquidCrystal I2C` e instalala.
   * **Función:** Controla la pantalla LCD 2004 (20 columnas x 4 filas) usando únicamente 2 cables de datos (I2C) a través del chip PCF8574.

> ℹ️ **Nota:** Las librerías de red como `WiFi.h`, `WiFiMulti.h`, `HTTPClient.h`, `WiFiClientSecure.h` y `Wire.h` **ya vienen incluidas de fábrica** dentro del paquete ESP32 de Espressif que instalaste en el Paso 2; no hace falta instalarlas por separado.

---

### 4. Drivers del Chip USB (si la PC no detecta la placa)
Si al conectar el ESP32 con el cable USB no aparece ningún puerto COM en *Herramientas $\rightarrow$ Puerto*:
* La inmensa mayoría de las placas ESP32 DevKit económicas utilizan el chip conversor serial **WCH CH340**.
* Descargá e instalá el driver oficial:
  👉 [Driver WCH CH340 / CH341 para Windows](http://www.wch-ic.com/downloads/CH341SER_EXE.html)
* *(Si tu placa usa el chip cuadrado CP2102 de Silicon Labs, el driver se descarga desde [Silicon Labs CP210x Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)).*

---

## ⚙️ Configuración en Arduino IDE para Subir el Código

Una vez instalados los pasos anteriores, configurá el menú superior de Arduino IDE de esta forma:

1. **Placa:**
   * Andá a **Herramientas $\rightarrow$ Placa $\rightarrow$ esp32 $\rightarrow$ "ESP32 Dev Module"** (o **"DOIT ESP32 DEVKIT V1"**).
   * ⚠️ *Importante:* No elijas placas con la letra "C" o "H" (como ESP32-C6 o C3), ya que esas usan procesadores RISC-V incompatibles. Debe ser **ESP32 Dev Module**.
2. **Puerto:**
   * Andá a **Herramientas $\rightarrow$ Puerto** y seleccioná el puerto asignado (por ejemplo, `COM5`).
3. **Upload Speed:**
   * Andá a **Herramientas $\rightarrow$ Upload Speed $\rightarrow$ 115200** (o 921600 para mayor velocidad si el cable es de buena calidad).

---

## 🔴 El Truco del Botón "BOOT" (Imprescindible en placas CH340)

Debido al circuito de auto-reinicio de las placas con chip CH340 en Windows, la computadora muchas veces no logra mandar a masa el pin de descarga automáticamente:

1. En Arduino IDE, hacé clic en el botón de la flecha **Subir (Upload $\rightarrow$)**.
2. El IDE compilará el sketch. Apenas termine la compilación y en la consola negra empiece a salir:
   ```text
   Connecting........_____.....
   ```
3. **Mantené presionado el botoncito físico `BOOT` (o `IO0`) ubicado en la propia placa ESP32 (al lado del conector USB) durante 1 segundo y soltalo.**
4. Inmediatamente la consola cambiará a:
   ```text
   Writing at 0x00010000... (100%)
   Hash of data verified.
   Leaving... Hard resetting via RTS pin...
   ```
5. ¡Listo! El código ya quedó grabado en la memoria permanente del microcontrolador.

---

## 🔌 Esquema de Conexiones Físicas (Pinout)

```
        ┌───────────────────────────┐
        │        ESP32 DEVKIT       │
        │                           │
        │  [D21] ─────────── SDA ───┼───► Display LCD 2004 (I2C)
        │  [D22] ─────────── SCL ───┼───► Display LCD 2004 (I2C)
        │                           │
        │  [D4]  ───[ 1kΩ ]──► Base ┼───► Transistor NPN (BC547)
        │                           │       │
        │                           │     Colector ───► (-) Buzzer Activo
        │                           │       │
        │  [GND] ───────────────────┼───► Emisor BC547 & GND Display
        │  [5V / VIN] ──────────────┼───► (+) Buzzer Activo & VCC Display
        └───────────────────────────┘
```

* **Display LCD 2004 con módulo I2C (PCF8574):**
  * `SDA` $\rightarrow$ Pin **GPIO 21**
  * `SCL` $\rightarrow$ Pin **GPIO 22**
  * `VCC` $\rightarrow$ Pin **5V** (o VIN)
  * `GND` $\rightarrow$ Pin **GND**
  * *(Si las letras no se ven, regulá el potenciómetro azul detrás del módulo I2C con un destornillador).*

* **Buzzer Activo:**
  * Pin de control: **GPIO 4**.
  * Se conecta a través de una resistencia de 1kΩ a la base de un transistor NPN (BC547 / 2N2222) para proteger la salida del ESP32.

---

## 📡 Redes Wi-Fi Precargadas

Los sketches incluyen soporte `WiFiMulti`, lo que permite que el dispositivo intente conectarse automáticamente a cualquiera de las redes disponibles:

1. **Red Celular / Hotspot:**
   * **SSID:** `Galaxydetincho`
   * **Contraseña:** `12345678`
2. **Red Hogar / Oficina:**
   * **SSID:** `Clarowifi`
   * **Contraseña:** `Hofstetter07`

*(Podés agregar más redes en la función `setup()` usando `wifiMulti.addAP("NombreRed", "Clave");`).*

---

## 🔍 Monitoreo y Pruebas

Para ver el estado del dispositivo en tiempo real desde la computadora:
1. En Arduino IDE, hacé clic en el ícono de la **Lupa (Monitor Serie)** arriba a la derecha.
2. En la esquina inferior derecha de la consola, ajustá la velocidad a **`115200 baud`**.
3. Verás la secuencia completa:
   ```text
   [TrashFlow] Terminal ESP32 de Notificaciones (Producción)
   [WiFi] Escaneando redes configuradas...
   [WiFi] Conectado exitosamente!
   [WiFi] IP:   192.168.x.x
   [HTTP] Polling: https://trashflow.site/api/hardware/alerta-pendiente
   [HTTP 200] Respuesta: { "alerta": null }
   ```
4. Cuando desde la web o la IA se genera una alerta para la zona del operario, verás:
   ```text
   [NUEVA ALERTA] #12 | Carapachay | Independencia 2840 | Confianza: 94%
   [BUZZER] Alarma inicial: 6 pitidos.
   [LCD] Alerta #12 mostrada — ciclo 20s ON / 20s OFF iniciado.
   ```
