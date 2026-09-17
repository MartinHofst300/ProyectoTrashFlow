/*
 * ============================================================
 * TrashFlow — Sketch para ESP32
 * Terminal Receptor de Alertas en Campo para Operarios
 *
 * *** VERSIÓN RED LOCAL / LOCALHOST (192.168.100.5:5005) ***
 *
 * Flujo operativo:
 *   1. El dispositivo consulta periódicamente (polling) la API.
 *   2. Cuando llega una alerta nueva:
 *        - El Buzzer emite 6 pitidos de atención.
 *        - La pantalla LCD muestra la zona, dirección y hora por 20s.
 *   3. Cada 40 segundos muestra el recordatorio en el display LCD.
 *        - En el PRIMER recordatorio (a los 40s), el Buzzer suena con 3 pitidos.
 *        - Después de ese primer recordatorio, todos los siguientes son en SILENCIO.
 *   4. El operario NO tiene que presionar ningún botón: solo acude al punto.
 *   5. Cuando la basura es retirada y el sistema marca la alerta como Resuelta,
 *      el display se apaga y vuelve al modo reposo.
 *
 * Hardware:
 *   - ESP32 (DevKit v1, NodeMCU-32S o Arduino Nano ESP32)
 *   - Display LCD 2004 (20 columnas x 4 filas) con I2C (PCF8574):
 *       SDA → GPIO 21 (D21)
 *       SCL → GPIO 22 (D22)
 *       VCC → 5V  |  GND → GND
 *   - Buzzer activo con transistor BC547:
 *       GPIO 4 (D4) → Resistencia 1kΩ a 2.2kΩ → Base BC547
 *       Colector → (-) del Buzzer
 *       Emisor → GND
 *       (+) del Buzzer → 5V (VIN)
 *
 * Librerías necesarias:
 *   - ArduinoJson (versión 6.x o 7.x)
 *   - LiquidCrystal_I2C
 * ============================================================
 */

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <WiFiMulti.h>
#include <Wire.h>

// ============================================================
//  CONFIGURACIÓN DEL SERVIDOR
// ============================================================

// URL del servidor de producción
const char *SERVER_URL = "http://192.168.100.5:5005";

// Token de autenticación del dispositivo de campo
const char *DEVICE_TOKEN = "trashflow_esp32_device_token_demo_2026";

// Buzzer activo con sonido
#define BUZZER_HABILITADO true

// ============================================================
//  PINES Y TIEMPOS
// ============================================================

#define PIN_BUZZER    4   // GPIO 4 — Control del Buzzer activo (BC547)
#define PIN_SDA      21   // GPIO 21 — SDA I2C del Display LCD
#define PIN_SCL      22   // GPIO 22 — SCL I2C del Display LCD

#define LCD_ADDR   0x27   // Dirección I2C del LCD (0x27 o 0x3F)
#define LCD_COLS     20
#define LCD_FILAS     4

// Ciclos de tiempo:
// 20 seg encendido + 20 seg apagado = 40 segundos por ciclo completo de recordatorio
const unsigned long INTERVALO_POLLING_MS = 10000; // Polling HTTP cada 10s
const unsigned long PANTALLA_ON_MS       = 20000; // LCD activo 20 segundos
const unsigned long PANTALLA_OFF_MS      = 20000; // LCD reposo 20 segundos
const int           HTTP_TIMEOUT_MS      =  8000; // Timeout de red (8s)

// ============================================================
//  VARIABLES GLOBALES
// ============================================================

WiFiMulti wifiMulti;
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_FILAS);

unsigned long ultimaConsulta         = 0;
unsigned long tiempoEncendidoDesde   = 0;
unsigned long tiempoApagadoDesde     = 0;

int  alertaActivaId                  = -1;
bool hayAlertaActiva                 = false;
bool pantallaEncendida               = false;
bool primerRecordatorioSonoroEmitido = false; // true = ya sonó el único recordatorio sonoro (3 pitidos)

String zonaActual      = "";
String direccionActual = "";
String horaActual      = "";

// ============================================================
//  PROTOTIPOS
// ============================================================

void conectarWiFi();
void consultarAlerta();
void sonarBuzzer(int veces, int duracionMs);
String limpiarTextoLCD(String texto);

void pantallaArranque();
void pantallaSinAlertas();
void dibujarPantallaAlerta(bool esRecordatorio);
void pantallaWiFiError();
void pantallaErrorRed();
void pantallaErrorServidor(int codigo, String msg);
void pantallaDispositivoSinAsignar();

// ============================================================
//  NORMALIZACIÓN DE TEXTO PARA LCD HD44780 (SIN SÍMBOLOS RAROS)
// ============================================================

/**
 * Normaliza y limpia caracteres especiales y tildes UTF-8 para el display
 * LCD 2004 (controlador HD44780). Reemplaza acentos (á, é, í, ó, ú, ñ)
 * por caracteres ASCII planos (a, e, i, o, u, n) para evitar que el
 * LCD imprima símbolos japoneses o basura como "ﾃｳ".
 */
String limpiarTextoLCD(String texto) {
  String out = "";
  for (unsigned int i = 0; i < texto.length(); i++) {
    uint8_t c = (uint8_t)texto[i];
    if (c == 0xC3 && i + 1 < texto.length()) {
      uint8_t c2 = (uint8_t)texto[++i];
      switch (c2) {
        case 0xA1: out += 'a'; break; // á
        case 0xA9: out += 'e'; break; // é
        case 0xAD: out += 'i'; break; // í
        case 0xB3: out += 'o'; break; // ó
        case 0xBA: out += 'u'; break; // ú
        case 0xBC: out += 'u'; break; // ü
        case 0xB1: out += 'n'; break; // ñ
        case 0x81: out += 'A'; break; // Á
        case 0x89: out += 'E'; break; // É
        case 0x8D: out += 'I'; break; // Í
        case 0x93: out += 'O'; break; // Ó
        case 0x9A: out += 'U'; break; // Ú
        case 0x9C: out += 'U'; break; // Ü
        case 0x91: out += 'N'; break; // Ñ
        default: break;
      }
    } else if (c == 0xC2 && i + 1 < texto.length()) {
      uint8_t c2 = (uint8_t)texto[++i];
      if (c2 == 0xBA) out += 'o';      // º (Nº -> No)
      else if (c2 == 0xAA) out += 'a'; // ª
      else if (c2 == 0xB0) out += 'o'; // °
    } else if (c == 0xE1) out += 'a'; // á Latin-1
    else if (c == 0xE9) out += 'e'; // é Latin-1
    else if (c == 0xED) out += 'i'; // í Latin-1
    else if (c == 0xF3) out += 'o'; // ó Latin-1
    else if (c == 0xFA) out += 'u'; // ú Latin-1
    else if (c == 0xFC) out += 'u'; // ü Latin-1
    else if (c == 0xF1) out += 'n'; // ñ Latin-1
    else if (c == 0xC1) out += 'A'; // Á Latin-1
    else if (c == 0xC9) out += 'E'; // É Latin-1
    else if (c == 0xCD) out += 'I'; // Í Latin-1
    else if (c == 0xD3) out += 'O'; // Ó Latin-1
    else if (c == 0xDA) out += 'U'; // Ú Latin-1
    else if (c == 0xDC) out += 'U'; // Ü Latin-1
    else if (c == 0xD1) out += 'N'; // Ñ Latin-1
    else if (c == 0xBA || c == 0xB0) out += 'o'; // º / ° Latin-1
    else if (c == 0xAA) out += 'a'; // ª Latin-1
    else if (c >= 32 && c <= 126) {
      out += (char)c;
    }
  }
  return out;
}

// ============================================================
//  SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[TrashFlow] Terminal ESP32 de Notificaciones (Producción)");

#if BUZZER_HABILITADO
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
#endif

  Wire.begin(PIN_SDA, PIN_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  pantallaArranque();

  // Redes Wi-Fi configuradas (se conecta a la primera disponible)
  wifiMulti.addAP("Galaxydetincho", "12345678");
  wifiMulti.addAP("Clarowifi", "Hofstetter07");

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

  // ── Ciclo de parpadeo y recordatorio cada 40 segundos ──────
  if (hayAlertaActiva) {
    if (pantallaEncendida && (ahora - tiempoEncendidoDesde >= PANTALLA_ON_MS)) {
      // Fin del ciclo ON (20s) -> pasa a reposo
      pantallaEncendida = false;
      tiempoApagadoDesde = ahora;
      pantallaSinAlertas();
      Serial.println("[LCD] Fin ciclo ON. Pantalla en reposo por 20 seg.");

    } else if (!pantallaEncendida && (ahora - tiempoApagadoDesde >= PANTALLA_OFF_MS)) {
      // Fin del ciclo OFF (20s) -> Cumplidos los 40s: re-encender LCD (Recordatorio)
      pantallaEncendida = true;
      tiempoEncendidoDesde = ahora;
      dibujarPantallaAlerta(true);
      Serial.println("[LCD] Ciclo 40s cumplido — mostrando recordatorio.");

      // Solo suena el Buzzer en el PRIMER recordatorio (con 3 pitidos).
      // A partir del segundo, los recordatorios son en total silencio.
      if (!primerRecordatorioSonoroEmitido) {
        Serial.println("[BUZZER] Primer recordatorio: 3 pitidos emitidos.");
        sonarBuzzer(3, 160);
        primerRecordatorioSonoroEmitido = true;
      } else {
        Serial.println("[BUZZER] Recordatorio en silencio.");
      }
    }
  }

  // ── Polling periódico al servidor cada 10 segundos ─────────
  if (ahora - ultimaConsulta >= INTERVALO_POLLING_MS) {
    ultimaConsulta = ahora;
    consultarAlerta();
  }
}

// ============================================================
//  COMUNICACIÓN HTTP CON LA API
// ============================================================

void consultarAlerta() {
  HTTPClient http;
  WiFiClientSecure clientSecure;
  WiFiClient clientPlain;
  String url = String(SERVER_URL) + "/api/hardware/alerta-pendiente";

  Serial.println("[HTTP] Polling: " + url);

  if (url.startsWith("https://")) {
    clientSecure.setInsecure();
    clientSecure.setTimeout(HTTP_TIMEOUT_MS / 1000);
    http.begin(clientSecure, url);
  } else {
    http.begin(clientPlain, url);
  }

  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(HTTP_TIMEOUT_MS);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("[HTTP 200] Respuesta: " + payload);

    StaticJsonDocument<768> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      Serial.println("[JSON] Error al parsear: " + String(error.c_str()));
      http.end();
      return;
    }

    if (!doc["alerta"].isNull()) {
      int alertaId      = doc["alerta"]["alerta_id"];
      String zona       = doc["alerta"]["zona"].as<String>();
      String direccion  = doc["alerta"]["direccion"].as<String>();
      String fecha      = doc["alerta"]["fecha"].as<String>();

      String hora = fecha;
      int espacio = fecha.indexOf(' ');
      if (espacio >= 0 && espacio + 1 < (int)fecha.length()) {
        hora = fecha.substring(espacio + 1);
      }

      // Nueva alerta asignada
      if (alertaId != alertaActivaId) {
        Serial.printf("[NUEVA ALERTA] #%d | %s | %s | Hora: %s\n",
                      alertaId, zona.c_str(), direccion.c_str(), hora.c_str());

        alertaActivaId                  = alertaId;
        zonaActual                      = zona;
        direccionActual                 = direccion;
        horaActual                      = hora;
        hayAlertaActiva                 = true;
        pantallaEncendida               = true;
        tiempoEncendidoDesde            = millis();
        primerRecordatorioSonoroEmitido = false; // Permite que el próximo recordatorio a los 40s dé los 3 pitidos

        // 1. Alarma inicial: 6 pitidos para alertar al operario
        Serial.println("[BUZZER] Alarma inicial: 6 pitidos.");
        sonarBuzzer(6, 180);

        // 2. Mostrar datos en la pantalla
        dibujarPantallaAlerta(false);
      }

    } else {
      // Servidor devolvió alerta = null (la alerta fue resuelta o no hay activas)
      if (hayAlertaActiva) {
        Serial.println("[INFO] Alerta marcada como RESUELTA. Volviendo a reposo.");
        hayAlertaActiva                 = false;
        alertaActivaId                  = -1;
        primerRecordatorioSonoroEmitido = false;
      }
      pantallaSinAlertas();
    }

  } else if (httpCode == 401) {
    Serial.println("[HTTP 401] Token inválido.");
    pantallaErrorServidor(401, "Token Invalido");

  } else if (httpCode == 409) {
    Serial.println("[HTTP 409] Sin operario asignado.");
    pantallaDispositivoSinAsignar();

  } else if (httpCode > 0) {
    Serial.printf("[HTTP ERROR %d]\n", httpCode);
    pantallaErrorServidor(httpCode, "Error Servidor");

  } else {
    Serial.println("[HTTP ERROR] Sin conexión con host: " + http.errorToString(httpCode));
    pantallaErrorRed();
  }

  http.end();
}

// ============================================================
//  PANTALLAS DEL LCD 2004 (20 columnas x 4 filas)
// ============================================================

void pantallaArranque() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("====================");
  lcd.setCursor(0, 1);
  lcd.print("  TrashFlow  v2.0   ");
  lcd.setCursor(0, 2);
  lcd.print(" Terminal Operario  ");
  lcd.setCursor(0, 3);
  lcd.print("====================");
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  Conectando WiFi   ");
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

  // Fila 0: Cabecera según sea alerta inicial o recordatorio
  lcd.setCursor(0, 0);
  if (esRecordatorio) {
    lcd.print("-- RECORDATORIO --  ");
  } else {
    lcd.print("!! NUEVA ALERTA !!  ");
  }

  // Fila 1: Zona limpia
  lcd.setCursor(0, 1);
  String lineaZona = "Zona: " + limpiarTextoLCD(zonaActual);
  while (lineaZona.length() < 20) lineaZona += " ";
  lcd.print(lineaZona.substring(0, 20));

  // Fila 2: Dirección limpia (sin caracteres raros o katakana)
  lcd.setCursor(0, 2);
  String lineaDir = limpiarTextoLCD(direccionActual);
  while (lineaDir.length() < 20) lineaDir += " ";
  lcd.print(lineaDir.substring(0, 20));

  // Fila 3: Solo Hora (sin porcentaje de IA)
  lcd.setCursor(0, 3);
  String lineaPie = "Hora: " + horaActual + " hs";
  while (lineaPie.length() < 20) lineaPie += " ";
  lcd.print(lineaPie.substring(0, 20));
}

void pantallaWiFiError() {
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("!!! ERROR WiFi !!!  ");
  lcd.setCursor(0, 1);
  lcd.print("Reconectando red... ");
  lcd.setCursor(0, 2);
  lcd.print("Compruebe senal o   ");
  lcd.setCursor(0, 3);
  lcd.print("credenciales Wi-Fi  ");
}

void pantallaErrorRed() {
  if (!hayAlertaActiva) {
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  TrashFlow Online  ");
    lcd.setCursor(0, 1);
    lcd.print(" Servidor en nube   ");
    lcd.setCursor(0, 2);
    lcd.print(" no responde...     ");
    lcd.setCursor(0, 3);
    lcd.print(" Reintentando...    ");
  }
}

void pantallaErrorServidor(int codigo, String msg) {
  if (!hayAlertaActiva) {
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  TrashFlow Error   ");
    lcd.setCursor(0, 1);
    lcd.print("HTTP Code: " + String(codigo));
    lcd.setCursor(0, 2);
    lcd.print(msg);
    lcd.setCursor(0, 3);
    lcd.print("Revise panel web    ");
  }
}

void pantallaDispositivoSinAsignar() {
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  TrashFlow ESP32   ");
  lcd.setCursor(0, 1);
  lcd.print("Sin operario asign. ");
  lcd.setCursor(0, 2);
  lcd.print("Asignar dispositivo ");
  lcd.setCursor(0, 3);
  lcd.print("en el panel web admin");
}

void sonarBuzzer(int veces, int duracionMs) {
#if BUZZER_HABILITADO
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(duracionMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < veces - 1) {
      delay(90);
    }
  }
#else
  Serial.printf("[BUZZER OFF] %d beeps\n", veces);
#endif
}

void conectarWiFi() {
  Serial.println("[WiFi] Escaneando redes configuradas...");
  WiFi.mode(WIFI_STA);

  int intentos = 0;
  while (wifiMulti.run() != WL_CONNECTED && intentos < 35) {
    delay(500);
    Serial.print(".");
    intentos++;

    if (intentos % 4 == 0) {
      lcd.setCursor(0, 3);
      String puntos = "";
      for (int p = 0; p < (intentos / 4) % 4; p++) puntos += ".";
      lcd.print("Conectando " + puntos + "      ");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado exitosamente!");
    Serial.println("[WiFi] SSID: " + WiFi.SSID());
    Serial.println("[WiFi] IP:   " + WiFi.localIP().toString());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  WiFi Conectado!   ");
    String ssid = WiFi.SSID();
    while (ssid.length() < 20) ssid += " ";
    lcd.setCursor(0, 1);
    lcd.print(ssid.substring(0, 20));
    lcd.setCursor(0, 2);
    lcd.print("Terminal Operativa  ");
    lcd.setCursor(0, 3);
    lcd.print(WiFi.localIP().toString());
    delay(2000);

    pantallaSinAlertas();

  } else {
    Serial.println("\n[WiFi] Fallo de conexión.");
    pantallaWiFiError();
  }
}
