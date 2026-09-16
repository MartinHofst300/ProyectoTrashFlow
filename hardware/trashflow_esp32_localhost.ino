/*
 * ============================================================
 * TrashFlow — Sketch para Arduino Nano ESP32
 * Sistema de Notificación de Residuos en Campo
 *
 * *** VERSIÓN LOCALHOST / DESARROLLO LOCAL ***
 *
 * Diferencias respecto a trashflow_esp32.ino (producción):
 *   - SERVER_URL apunta a la IP local de tu PC (no a trashflow.site)
 *   - Usa HTTP plano (puerto 5005) — NO necesita WiFiClientSecure
 *   - Usa HTTPClient con WiFiClient normal (más simple en red local)
 *   - La red WiFi debe ser la misma LAN donde corre la PC con Flask
 *
 * ANTES DE CARGAR AL ESP32:
 *   1. Averiguar la IP de tu PC: cmd → ipconfig → "Dirección IPv4"
 *      Ejemplo: 192.168.1.105
 *   2. Reemplazar SERVER_IP abajo con esa IP
 *   3. Asegurarse que Flask corre: python app.py  (puerto 5005)
 *   4. Si el firewall bloquea el puerto 5005:
 *      Panel de control → Firewall → Regla de entrada → TCP puerto 5005
 *   5. El ESP32 y la PC deben estar en la misma red WiFi
 *
 * Hardware requerido:
 *   - Arduino Nano ESP32 (o ESP32 genérico)
 *   - Display LCD 2004 (20 col x 4 filas) con módulo I2C (PCF8574)
 *       SDA → GPIO 21 (D21)
 *       SCL → GPIO 22 (D22)
 *       VCC → 3.3V  |  GND → GND
 *   - Buzzer activo alimentado a 5V (VIN) con transistor BC547 en GPIO 4 (D4):
 *       GPIO 4 → Resistencia 1.2kΩ → Base BC547
 *       Colector → Terminal negativo (-) del Buzzer
 *       Emisor → GND
 *       Terminal positivo (+) del Buzzer → Pin VIN (5V)
 *
 * Librerías (instalar desde Library Manager del IDE Arduino):
 *   - ArduinoJson       (Benoit Blanchon, versión 6.x)
 *   - LiquidCrystal_I2C (Frank de Brabander)
 *
 * Librerías incluidas en el core ESP32 (no requieren instalación):
 *   - WiFi.h
 *   - HTTPClient.h
 *   - WiFiClient.h  ← HTTP plano, NO necesita WiFiClientSecure
 *   - Wire.h
 * ============================================================
 */

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClient.h>   // HTTP plano (localhost no usa HTTPS)
#include <WiFiMulti.h>
#include <Wire.h>

// ============================================================
//  *** CONFIGURAR ANTES DE CARGAR AL ESP32 ***
// ============================================================

WiFiMulti wifiMulti;

// ─── IP LOCAL DE TU PC ─────────────────────────────────────
// Obtenerla con: cmd → ipconfig → buscar "Dirección IPv4"
// Debe ser la IP de la máquina donde corre Flask (puerto 5005).
//
const char* SERVER_IP   = "192.168.1.105"; // ← CAMBIAR por tu IP local
const int   SERVER_PORT = 5005;            // Puerto Flask del proyecto raíz
//
// URL resultante: http://192.168.1.105:5005
// ────────────────────────────────────────────────────────────

// Token de autenticación del dispositivo
// ¡DEBE COINCIDIR con el campo token_device en dispositivos_hardware!
const char* DEVICE_TOKEN = "trashflow_esp32_device_token_demo_2026";

// ─── MODO DE PRUEBA ────────────────────────────────────────
#define BUZZER_HABILITADO true

// ============================================================
//  PINES Y CONSTANTES
// ============================================================

#define PIN_BUZZER 4   // GPIO 4 (D4) — Buzzer activo con BC547
#define PIN_SDA 21     // GPIO 21 (D21) — SDA del LCD I2C
#define PIN_SCL 22     // GPIO 22 (D22) — SCL del LCD I2C
#define LCD_ADDR 0x27  // Dirección I2C del LCD (probar 0x3F si no enciende)
#define LCD_COLS 20
#define LCD_FILAS 4

const unsigned long INTERVALO_POLLING_MS = 10000; // Polling cada 10s
const unsigned long PANTALLA_ON_MS       = 20000; // LCD encendido 20s
const unsigned long PANTALLA_OFF_MS      = 20000; // LCD apagado  20s
const int           HTTP_TIMEOUT_MS      =  8000; // Timeout HTTP

// ============================================================
//  OBJETOS GLOBALES
// ============================================================

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_FILAS);

unsigned long ultimaConsulta          = 0;
unsigned long tiempoEncendidoDesde    = 0;
unsigned long tiempoApagadoDesde      = 0;
int  alertaActivaId                   = -1;
bool hayAlertaActiva                  = false;
bool pantallaEncendida                = false;
bool recordatorioBuzzerEmitido        = false;

String zonaActual      = "";
String direccionActual = "";
String horaActual      = "";

// URL base construida en setup()
String SERVER_URL_BASE = "";

// ============================================================
//  PROTOTIPOS DE FUNCIONES
// ============================================================

void pantallaArranque();
void pantallaSinAlertas();
void pantallaWiFiError();
void pantallaErrorRed();
void pantallaErrorServidor(int codigo);
void pantallaDispositivoSinAsignar();
void dibujarPantallaAlerta(bool esRecordatorio);
void dibujarPantallaAlerta();
void mostrarAlerta(int alertaId, String zona, String direccion, String hora);
void consultarAlerta();
void confirmarAlerta(int alertaId);
void sonarBuzzer(int veces, int duracionMs);
void conectarWiFi();

// ============================================================
//  SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[TrashFlow] Iniciando ESP32 — MODO LOCAL (localhost)");

  // Construir URL base: http://<IP>:<PUERTO>
  SERVER_URL_BASE = String("http://") + SERVER_IP + ":" + String(SERVER_PORT);
  Serial.println("[Config] API URL: " + SERVER_URL_BASE);
  Serial.println("[Config] Token:   " + String(DEVICE_TOKEN));

#if BUZZER_HABILITADO
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
#endif

  Wire.begin(PIN_SDA, PIN_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  pantallaArranque();

  // ─── REDES WI-FI ──────────────────────────────────────────
  // IMPORTANTE: el ESP32 y la PC deben estar en la MISMA red WiFi.
  wifiMulti.addAP("Clarowifi", "Hofstetter07"); // Red principal
  // wifiMulti.addAP("OtraRed", "otraContraseña"); // Agregar más si se necesita

  conectarWiFi();
}

// ============================================================
//  LOOP PRINCIPAL
// ============================================================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Conexión perdida. Reconectando...");
    pantallaWiFiError();
    conectarWiFi();
    return;
  }

  unsigned long ahora = millis();

  // ── Ciclo de parpadeo 20s ON / 20s OFF ──────────────────
  if (hayAlertaActiva) {
    if (pantallaEncendida && (ahora - tiempoEncendidoDesde >= PANTALLA_ON_MS)) {
      Serial.println("[LCD] Ciclo ON cumplido — pantalla apagada 20s.");
      pantallaEncendida  = false;
      tiempoApagadoDesde = ahora;
      pantallaSinAlertas();

    } else if (!pantallaEncendida && (ahora - tiempoApagadoDesde >= PANTALLA_OFF_MS)) {
      Serial.println("[LCD] Ciclo OFF cumplido — re-encendiendo (recordatorio).");
      pantallaEncendida    = true;
      tiempoEncendidoDesde = ahora;
      dibujarPantallaAlerta(true);

      if (!recordatorioBuzzerEmitido) {
        sonarBuzzer(2, 200);
        recordatorioBuzzerEmitido = true;
      }
    }
  }

  // ── Polling HTTP cada 10 segundos ───────────────────────
  if (ahora - ultimaConsulta >= INTERVALO_POLLING_MS) {
    ultimaConsulta = ahora;
    consultarAlerta();
  }
}

// ============================================================
//  FUNCIONES DE RED — HTTP PLANO (sin SSL)
// ============================================================

/**
 * GET /api/hardware/alerta-pendiente
 *
 * Usa WiFiClient (HTTP) en lugar de WiFiClientSecure (HTTPS).
 * Flask local no tiene certificado SSL — HTTP plano es suficiente.
 */
void consultarAlerta() {
  WiFiClient client;
  HTTPClient http;

  String url = SERVER_URL_BASE + "/api/hardware/alerta-pendiente";
  Serial.println("[HTTP] GET " + url);

  http.begin(client, url);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("[HTTP] 200 OK: " + payload);

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (error) {
      Serial.println("[JSON] Error al parsear: " + String(error.c_str()));
      http.end();
      return;
    }

    if (!doc["alerta"].isNull()) {
      int    alertaId  = doc["alerta"]["alerta_id"];
      String zona      = doc["alerta"]["zona"].as<String>();
      String direccion = doc["alerta"]["direccion"].as<String>();
      String fecha     = doc["alerta"]["fecha"].as<String>();

      String hora = fecha;
      int espacio = fecha.indexOf(' ');
      if (espacio >= 0 && espacio + 1 < (int)fecha.length()) {
        hora = fecha.substring(espacio + 1);
      }

      Serial.println("[ALERTA] ID=" + String(alertaId) +
                     " Zona=" + zona + " Dir=" + direccion + " Hora=" + hora);

      if (alertaId != alertaActivaId) {
        alertaActivaId  = alertaId;
        hayAlertaActiva = true;
        mostrarAlerta(alertaId, zona, direccion, hora);
        confirmarAlerta(alertaId);
      }

    } else {
      if (!hayAlertaActiva) pantallaSinAlertas();
      Serial.println("[INFO] Sin alertas pendientes.");
    }

  } else if (httpCode == 409) {
    Serial.println("[HTTP] 409 — Dispositivo sin operario asignado");
    pantallaDispositivoSinAsignar();

  } else if (httpCode > 0) {
    Serial.println("[HTTP] Error código: " + String(httpCode));
    pantallaErrorServidor(httpCode);

  } else {
    // En modo local: posibles causas → Flask no está corriendo,
    // IP incorrecta, o el firewall de Windows bloquea el puerto 5005.
    Serial.println("[HTTP] Sin respuesta: " + http.errorToString(httpCode));
    Serial.println("[HINT] Verificar → IP: " + String(SERVER_IP) +
                   "  Puerto: " + String(SERVER_PORT) +
                   "  Flask corriendo?  Firewall?");
    pantallaErrorRed();
  }

  http.end();
}

/**
 * POST /api/hardware/confirmar/<alerta_id>
 * Usa WiFiClient (HTTP plano).
 */
void confirmarAlerta(int alertaId) {
  WiFiClient client;
  HTTPClient http;

  String url = SERVER_URL_BASE + "/api/hardware/confirmar/" + String(alertaId);
  Serial.println("[HTTP] POST confirmar alerta #" + String(alertaId));

  http.begin(client, url);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  int httpCode = http.POST("");
  if (httpCode == 200) {
    Serial.println("[HTTP] Alerta confirmada OK");
  } else {
    Serial.println("[HTTP] Error al confirmar: " + String(httpCode));
  }

  http.end();
}

// ============================================================
//  FUNCIONES DE PANTALLA (LCD 2004)
// ============================================================

void pantallaArranque() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("====================");
  lcd.setCursor(0, 1);
  lcd.print("  TrashFlow  v1.0   ");
  lcd.setCursor(0, 2);
  lcd.print("  MODO LOCAL / DEV  ");  // ← diferencia visual vs producción
  lcd.setCursor(0, 3);
  lcd.print("====================");
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  Conectando WiFi...");
  lcd.setCursor(0, 1);
  lcd.print("Buscando red...     ");
}

void pantallaSinAlertas() {
  lcd.noBacklight();
  lcd.clear();
}

void dibujarPantallaAlerta(bool esRecordatorio) {
  lcd.backlight();
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print(esRecordatorio ? "-- RECORDATORIO --  " : "!! NUEVA ALERTA !!  ");

  lcd.setCursor(0, 1);
  String lineaZona = "Zona: " + zonaActual;
  while (lineaZona.length() < 20) lineaZona += " ";
  lcd.print(lineaZona.substring(0, 20));

  lcd.setCursor(0, 2);
  String lineaDir = direccionActual;
  while (lineaDir.length() < 20) lineaDir += " ";
  lcd.print(lineaDir.substring(0, 20));

  lcd.setCursor(0, 3);
  String lineaHora = horaActual;
  while (lineaHora.length() < 20) lineaHora += " ";
  lcd.print(lineaHora.substring(0, 20));
}

void dibujarPantallaAlerta() { dibujarPantallaAlerta(false); }

void mostrarAlerta(int alertaId, String zona, String direccion, String hora) {
  zonaActual      = zona;
  direccionActual = direccion;
  horaActual      = hora;
  recordatorioBuzzerEmitido = false;

  pantallaEncendida    = true;
  tiempoEncendidoDesde = millis();

  sonarBuzzer(6, 200);
  dibujarPantallaAlerta(false);

  Serial.println("[LCD] Alerta #" + String(alertaId) + " mostrada.");
}

void pantallaWiFiError() {
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("!!! ERROR WiFi !!!  ");
  lcd.setCursor(0, 1);
  lcd.print("Reconectando...     ");
  lcd.setCursor(0, 2);
  lcd.print("Red: Clarowifi      ");
  lcd.setCursor(0, 3);
  lcd.print("                    ");
}

/**
 * Error de red en modo LOCAL — muestra la IP y puerto configurados
 * para facilitar el debug sin Monitor Serial.
 */
void pantallaErrorRed() {
  if (!hayAlertaActiva) {
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  TrashFlow LOCAL   ");
    lcd.setCursor(0, 1);
    lcd.print(" Sin conexion red   ");
    lcd.setCursor(0, 2);
    String ipMsg = " IP:" + String(SERVER_IP);
    while (ipMsg.length() < 20) ipMsg += " ";
    lcd.print(ipMsg.substring(0, 20));
    lcd.setCursor(0, 3);
    String ptoMsg = " Puerto:" + String(SERVER_PORT) + "       ";
    lcd.print(ptoMsg.substring(0, 20));
  }
}

void pantallaErrorServidor(int codigo) {
  if (!hayAlertaActiva) {
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  TrashFlow LOCAL   ");
    lcd.setCursor(0, 1);
    lcd.print(" Error servidor:    ");
    lcd.setCursor(0, 2);
    lcd.print(" HTTP " + String(codigo) + "          ");
    lcd.setCursor(0, 3);
    lcd.print("                    ");
  }
}

void pantallaDispositivoSinAsignar() {
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  TrashFlow         ");
  lcd.setCursor(0, 1);
  lcd.print("Dispositivo sin     ");
  lcd.setCursor(0, 2);
  lcd.print("operario asignado.  ");
  lcd.setCursor(0, 3);
  lcd.print("Ver panel web local ");
}

// ============================================================
//  FUNCIÓN DEL BUZZER
// ============================================================

void sonarBuzzer(int veces, int duracionMs) {
#if BUZZER_HABILITADO
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(duracionMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < veces - 1) delay(100);
  }
#else
  Serial.println("[BUZZER] deshabilitado — beeps=" + String(veces) +
                 " dur=" + String(duracionMs) + "ms");
#endif
}

// ============================================================
//  FUNCIÓN DE CONEXIÓN Wi-Fi
// ============================================================

void conectarWiFi() {
  Serial.println("[WiFi] Buscando redes conocidas...");
  WiFi.mode(WIFI_STA);

  int intentos = 0;
  while (wifiMulti.run() != WL_CONNECTED && intentos < 40) {
    delay(500);
    Serial.print(".");
    intentos++;
    if (intentos % 5 == 0) {
      lcd.setCursor(0, 3);
      String puntos = "";
      for (int p = 0; p < (intentos / 5) % 5; p++) puntos += ".";
      lcd.print("Espere " + puntos + "             ");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado a: " + WiFi.SSID());
    Serial.println("[WiFi] IP ESP32: " + WiFi.localIP().toString());
    Serial.println("[WiFi] Flask en: " + SERVER_URL_BASE);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  WiFi Conectado!   ");

    String redConectada = WiFi.SSID();
    while (redConectada.length() < 20) redConectada += " ";
    lcd.setCursor(0, 1);
    lcd.print(redConectada.substring(0, 20));

    // Fila 2: mostrar IP del servidor Flask para confirmar config
    String srvMsg = String(SERVER_IP) + ":" + String(SERVER_PORT);
    while (srvMsg.length() < 20) srvMsg += " ";
    lcd.setCursor(0, 2);
    lcd.print(srvMsg.substring(0, 20));

    // Fila 3: IP del propio ESP32
    lcd.setCursor(0, 3);
    lcd.print(WiFi.localIP().toString());

    delay(2000);
    pantallaSinAlertas();

  } else {
    Serial.println("\n[WiFi] FALLO: ninguna red conocida encontrada.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("!!! ERROR WiFi !!!  ");
    lcd.setCursor(0, 1);
    lcd.print("Sin red disponible. ");
    lcd.setCursor(0, 2);
    lcd.print("Verificar redes en  ");
    lcd.setCursor(0, 3);
    lcd.print("el sketch .ino      ");
    while (true) delay(10000);
  }
}
