/*
 * ============================================================
 * TrashFlow — Sketch para Arduino Nano ESP32
 * Sistema de Notificación de Residuos en Campo
 *
 * Hardware requerido:
 *   - Arduino Nano ESP32 (ESP32-S3)
 *   - Display LCD 2004 (20 col x 4 filas) con módulo I2C (PCF8574)
 *   - Motor vibrador (conectado a pin D2 con transistor NPN o directo si <40mA)
 *   - Batería 18650 con módulo step-up a 5V
 *
 * Librerías (instalar desde Library Manager del IDE Arduino):
 *   - ArduinoJson       (Benoit Blanchon, versión 6.x)
 *   - LiquidCrystal_I2C (Frank de Brabander)
 *
 * Librerías incluidas en el core ESP32 (no requieren instalación):
 *   - WiFi.h
 *   - HTTPClient.h
 *   - Wire.h
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ============================================================
//  *** CONFIGURAR ANTES DE CARGAR AL ESP32 ***
// ============================================================

// Red Wi-Fi a la que se conectará el dispositivo
const char* WIFI_SSID     = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASEÑA_DE_TU_WIFI";

// URL del servidor Flask
// OPCIÓN A (demo con ngrok): "https://abc123.ngrok-free.app"
//   → ejecutar en la PC: ngrok http 5000
// OPCIÓN B (red local):    "http://192.168.1.100:5000"
//   → reemplazar 192.168.1.100 con la IP de la PC en la red local
const char* SERVER_URL    = "http://192.168.1.100:5000";

// Token de autenticación del dispositivo
// ¡DEBE COINCIDIR con el token_device en la tabla dispositivos_hardware!
const char* DEVICE_TOKEN  = "trashflow_esp32_device_token_demo_2026";

// ============================================================
//  PINES Y CONSTANTES
// ============================================================

#define PIN_VIBRADOR D2         // Pin del motor vibrador
#define LCD_ADDR     0x27       // Dirección I2C del LCD (probar 0x3F si no enciende)
#define LCD_COLS     20         // LCD 2004: 20 columnas
#define LCD_FILAS    4          // LCD 2004: 4 filas

const unsigned long INTERVALO_POLLING_MS = 10000; // Consultar cada 10 segundos
const int           HTTP_TIMEOUT_MS      = 8000;  // Tiempo máximo de espera HTTP

// ============================================================
//  OBJETOS GLOBALES
// ============================================================

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_FILAS);

// Estado del dispositivo
unsigned long ultimaConsulta  = 0;
int           alertaActivaId  = -1;   // ID de la alerta que está en pantalla
bool          hayAlertaActiva = false;

// ============================================================
//  SETUP
// ============================================================

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n[TrashFlow] Iniciando dispositivo ESP32...");

    // Configurar pines
    pinMode(PIN_VIBRADOR, OUTPUT);
    digitalWrite(PIN_VIBRADOR, LOW);

    // Inicializar LCD
    Wire.begin();
    lcd.init();
    lcd.backlight();
    lcd.clear();

    // Pantalla de arranque
    pantallaArranque();

    // Conectar a Wi-Fi
    conectarWiFi();
}

// ============================================================
//  LOOP PRINCIPAL
// ============================================================

void loop() {
    // Si se perdió la conexión Wi-Fi, intentar reconectar
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi] Conexión perdida. Reconectando...");
        pantallaWiFiError();
        conectarWiFi();
        return;
    }

    // Consultar alertas según el intervalo configurado
    unsigned long ahora = millis();
    if (ahora - ultimaConsulta >= INTERVALO_POLLING_MS) {
        ultimaConsulta = ahora;
        consultarAlerta();
    }
}

// ============================================================
//  FUNCIONES DE RED
// ============================================================

/**
 * Consulta GET /api/hardware/alerta-pendiente
 * Si hay alerta: muestra en LCD y vibra. Si no: pantalla de espera.
 */
void consultarAlerta() {
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/hardware/alerta-pendiente";

    Serial.println("[HTTP] Consultando: " + url);
    http.begin(url);
    http.addHeader("X-Device-Token", DEVICE_TOKEN);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    int httpCode = http.GET();

    if (httpCode == 200) {
        String payload = http.getString();
        Serial.println("[HTTP] OK 200: " + payload);

        // Parsear JSON (capacidad de 512 bytes suficiente para la respuesta)
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
            Serial.println("[JSON] Error al parsear: " + String(error.c_str()));
            http.end();
            return;
        }

        if (!doc["alerta"].isNull()) {
            // Hay alerta pendiente
            int    alertaId  = doc["alerta"]["alerta_id"];
            String direccion = doc["alerta"]["direccion"].as<String>();
            String fecha     = doc["alerta"]["fecha"].as<String>();

            Serial.println("[ALERTA] ID=" + String(alertaId) + " Dir=" + direccion);

            // Solo actuar si es una alerta diferente a la que ya se muestra
            if (alertaId != alertaActivaId) {
                alertaActivaId  = alertaId;
                hayAlertaActiva = true;
                mostrarAlerta(alertaId, direccion, fecha);
                confirmarAlerta(alertaId);
            }
        } else {
            // Sin alertas pendientes
            if (hayAlertaActiva) {
                // La alerta anterior fue resuelta: limpiar pantalla
                hayAlertaActiva = false;
                alertaActivaId  = -1;
                Serial.println("[INFO] Sin alertas pendientes.");
            }
            pantallaSinAlertas();
        }

    } else if (httpCode == 409) {
        // El dispositivo no tiene operario asignado
        Serial.println("[HTTP] 409 — Dispositivo sin operario asignado");
        pantallaDispositivoSinAsignar();

    } else if (httpCode > 0) {
        // Otro error HTTP
        Serial.println("[HTTP] Error código: " + String(httpCode));
        pantallaErrorServidor(httpCode);

    } else {
        // Error de red (no se pudo conectar al servidor)
        Serial.println("[HTTP] Sin respuesta: " + http.errorToString(httpCode));
        pantallaErrorRed();
    }

    http.end();
}

/**
 * POST /api/hardware/confirmar/<alerta_id>
 * Confirma la recepción de la alerta. Activa el cooldown en el servidor
 * y cambia el estado a 'en proceso'.
 */
void confirmarAlerta(int alertaId) {
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/hardware/confirmar/" + String(alertaId);

    Serial.println("[HTTP] Confirmando alerta #" + String(alertaId));
    http.begin(url);
    http.addHeader("X-Device-Token", DEVICE_TOKEN);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    int httpCode = http.POST("");

    if (httpCode == 200) {
        Serial.println("[HTTP] Alerta confirmada correctamente");
    } else {
        Serial.println("[HTTP] Error al confirmar: " + String(httpCode));
    }

    http.end();
}

// ============================================================
//  FUNCIONES DE PANTALLA (LCD 2004)
// ============================================================

/**
 * Pantalla de inicio al encender el dispositivo
 */
void pantallaArranque() {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("====================");
    lcd.setCursor(0, 1); lcd.print("  TrashFlow  v1.0   ");
    lcd.setCursor(0, 2); lcd.print(" Municipio Vic.Lopez");
    lcd.setCursor(0, 3); lcd.print("====================");
    delay(2000);
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("  Conectando WiFi...");
    lcd.setCursor(0, 1); lcd.print("SSID: ");
    lcd.setCursor(6, 1); lcd.print(String(WIFI_SSID).substring(0, 14));
}

/**
 * Pantalla principal cuando no hay alertas pendientes
 */
void pantallaSinAlertas() {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("   TrashFlow        ");
    lcd.setCursor(0, 1); lcd.print("  Sistema Activo    ");
    lcd.setCursor(0, 2); lcd.print(" Esperando alertas..");
    lcd.setCursor(0, 3); lcd.print("  WiFi: OK          ");
}

/**
 * Pantalla de alerta activa (dirección de la bolsa detectada)
 * El LCD 2004 tiene 20 columnas × 4 filas = 80 caracteres total.
 */
void mostrarAlerta(int alertaId, String direccion, String fecha) {
    // Vibrar para llamar la atención del operario
    vibrar(3, 400);

    lcd.clear();

    // FILA 0: Título con borde
    lcd.setCursor(0, 0);
    lcd.print("!! NUEVA ALERTA !!  ");

    // FILA 1: Dirección línea 1 (primeros 20 chars)
    lcd.setCursor(0, 1);
    if (direccion.length() > 0) {
        lcd.print(direccion.substring(0, min((int)direccion.length(), 20)));
    }

    // FILA 2: Dirección línea 2 (chars 20-40, si existen)
    lcd.setCursor(0, 2);
    if (direccion.length() > 20) {
        lcd.print(direccion.substring(20, min((int)direccion.length(), 40)));
    }

    // FILA 3: ID de alerta y fecha
    lcd.setCursor(0, 3);
    String piePantalla = "ID#" + String(alertaId) + " " + fecha;
    // Rellenar con espacios hasta 20 chars
    while (piePantalla.length() < 20) piePantalla += " ";
    lcd.print(piePantalla.substring(0, 20));

    // Vibrar una vez más después de mostrar para reforzar la alerta
    delay(500);
    vibrar(1, 600);
}

/**
 * Error de conexión Wi-Fi
 */
void pantallaWiFiError() {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("!!! ERROR WiFi !!!  ");
    lcd.setCursor(0, 1); lcd.print("Reconectando...     ");
    lcd.setCursor(0, 2); lcd.print("SSID: ");
    lcd.setCursor(6, 2); lcd.print(String(WIFI_SSID).substring(0, 14));
    lcd.setCursor(0, 3); lcd.print("                    ");
}

/**
 * Error de red (servidor no responde)
 */
void pantallaErrorRed() {
    if (!hayAlertaActiva) {
        lcd.clear();
        lcd.setCursor(0, 0); lcd.print("  TrashFlow         ");
        lcd.setCursor(0, 1); lcd.print(" Sin conexion red   ");
        lcd.setCursor(0, 2); lcd.print(" Reintentando...    ");
        lcd.setCursor(0, 3); lcd.print("                    ");
    }
    // Si hay alerta activa, no la borramos — el operario la sigue viendo
}

/**
 * Error HTTP del servidor (4xx / 5xx)
 */
void pantallaErrorServidor(int codigo) {
    if (!hayAlertaActiva) {
        lcd.clear();
        lcd.setCursor(0, 0); lcd.print("  TrashFlow         ");
        lcd.setCursor(0, 1); lcd.print(" Error servidor:    ");
        lcd.setCursor(0, 2); lcd.print(" HTTP " + String(codigo) + "          ");
        lcd.setCursor(0, 3); lcd.print("                    ");
    }
}

/**
 * Dispositivo sin operario asignado desde el panel web
 */
void pantallaDispositivoSinAsignar() {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("  TrashFlow         ");
    lcd.setCursor(0, 1); lcd.print("Dispositivo sin     ");
    lcd.setCursor(0, 2); lcd.print("operario asignado.  ");
    lcd.setCursor(0, 3); lcd.print("Ver panel web.      ");
}

// ============================================================
//  FUNCIÓN DE VIBRACIÓN
// ============================================================

/**
 * Activa el motor vibrador N veces con la duración indicada.
 * @param veces      Cantidad de pulsos
 * @param duracionMs Duración de cada pulso en milisegundos
 */
void vibrar(int veces, int duracionMs) {
    for (int i = 0; i < veces; i++) {
        digitalWrite(PIN_VIBRADOR, HIGH);
        delay(duracionMs);
        digitalWrite(PIN_VIBRADOR, LOW);
        if (i < veces - 1) {
            delay(150);  // Pausa breve entre pulsos
        }
    }
}

// ============================================================
//  FUNCIÓN DE CONEXIÓN Wi-Fi
// ============================================================

void conectarWiFi() {
    Serial.println("[WiFi] Conectando a: " + String(WIFI_SSID));
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 40) {
        delay(500);
        Serial.print(".");
        intentos++;

        // Actualizar pantalla con animación de puntos
        if (intentos % 5 == 0) {
            lcd.setCursor(0, 3);
            String puntos = "";
            for (int p = 0; p < (intentos / 5) % 5; p++) puntos += ".";
            lcd.print("Espere " + puntos + "             ");
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] Conectado!");
        Serial.println("[WiFi] IP: " + WiFi.localIP().toString());

        lcd.clear();
        lcd.setCursor(0, 0); lcd.print("  WiFi Conectado!   ");
        lcd.setCursor(0, 1); lcd.print("IP:");
        lcd.setCursor(3, 1); lcd.print(WiFi.localIP().toString());
        lcd.setCursor(0, 2); lcd.print("Consultando alertas.");
        lcd.setCursor(0, 3); lcd.print("                    ");
        delay(2000);
        pantallaSinAlertas();

    } else {
        Serial.println("\n[WiFi] FALLO DE CONEXIÓN. Revisar SSID/contraseña.");
        lcd.clear();
        lcd.setCursor(0, 0); lcd.print("!!! ERROR WiFi !!!  ");
        lcd.setCursor(0, 1); lcd.print("No se pudo conectar.");
        lcd.setCursor(0, 2); lcd.print("Verificar SSID y    ");
        lcd.setCursor(0, 3); lcd.print("contrasena.         ");
        // No reinicia: queda en pantalla de error hasta que el usuario
        // corrija el problema y reinicie el dispositivo manualmente
        while (true) { delay(10000); }
    }
}
