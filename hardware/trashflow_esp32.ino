/*
 * ============================================================
 * TrashFlow — Sketch para Arduino Nano ESP32
 * Sistema de Notificación de Residuos en Campo
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
 *   - WiFiClientSecure.h
 *   - Wire.h
 * ============================================================
 */

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiMulti.h> // ← permite guardar varias redes Wi-Fi
#include <Wire.h>

// ============================================================
//  *** CONFIGURAR ANTES DE CARGAR AL ESP32 ***
// ============================================================

// Podés agregar todas las redes Wi-Fi que quieras.
// El ESP32 se conecta automáticamente a la que encuentre primero.
WiFiMulti wifiMulti;

// URL del servidor Flask (producción)
// Dominio de hosting — https://trashflow.site
const char *SERVER_URL = "https://trashflow.site";

// Token de autenticación del dispositivo
// ¡DEBE COINCIDIR con el token_device en la tabla dispositivos_hardware!
const char *DEVICE_TOKEN = "trashflow_esp32_device_token_demo_2026";

// ─── MODO DE PRUEBA ────────────────────────────────────────
// Poner en true para habilitar el buzzer
#define BUZZER_HABILITADO true

// ============================================================
//  PINES Y CONSTANTES
// ============================================================

#define PIN_BUZZER 4   // GPIO 4 (D4) — Buzzer activo con BC547 (alimentado a 5V)
#define PIN_SDA 21     // GPIO 21 (D21) — SDA del LCD I2C
#define PIN_SCL 22     // GPIO 22 (D22) — SCL del LCD I2C
#define LCD_ADDR 0x27  // Dirección I2C del LCD (probar 0x3F si no enciende)
#define LCD_COLS 20    // LCD 2004: 20 columnas
#define LCD_FILAS 4    // LCD 2004: 4 filas

const unsigned long INTERVALO_POLLING_MS =
    10000; // Consultar servidor cada 10 segundos
const unsigned long PANTALLA_ON_MS =
    20000; // Pantalla encendida 20 seg por ciclo
const unsigned long PANTALLA_OFF_MS =
    20000;                        // Pantalla apagada  20 seg por ciclo
const int HTTP_TIMEOUT_MS = 8000; // Tiempo máximo de espera HTTP

// ============================================================
//  OBJETOS GLOBALES
// ============================================================

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_FILAS);

// ── Estado del dispositivo ────────────────────────────────
unsigned long ultimaConsulta = 0;
unsigned long tiempoEncendidoDesde =
    0;                                // millis() cuando se prendió la pantalla
unsigned long tiempoApagadoDesde = 0; // millis() cuando se apagó la pantalla
int alertaActivaId = -1;      // ID de la última alerta recibida (-1 = ninguna)
bool hayAlertaActiva = false; // true = ciclo de parpadeo activo
bool pantallaEncendida = false; // true = LCD mostrando alerta ahora mismo
bool recordatorioBuzzerEmitido = false; // true = ya sonó el único recordatorio sonoro (a los 40s)

// ── Datos de la alerta activa (guardados para re-dibujar) ─
// Se actualizan al recibir una alerta nueva con id distinto.
// Se usan para redibujar en cada ciclo ON sin depender del servidor.
String zonaActual = "";
String direccionActual = "";
String horaActual = "";

// ============================================================
//  PROTOTIPOS DE FUNCIONES (para compatibilidad Arduino IDE / ESP32)
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
  Serial.println("\n[TrashFlow] Iniciando dispositivo ESP32...");

// Configurar pines (buzzer solo si está habilitado)
#if BUZZER_HABILITADO
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
#endif

  // Inicializar LCD con pines I2C correctos
  Wire.begin(PIN_SDA, PIN_SCL); // SDA=GPIO21, SCL=GPIO22
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Pantalla de arranque
  pantallaArranque();

  // ─── REDES WI-FI CONFIGURADAS ──────────────────────────
  // El ESP32 se conecta automáticamente a la que encuentre primero.
  wifiMulti.addAP("Clarowifi", "Hofstetter07"); // Red principal
  // wifiMulti.addAP("OtraRed", "otraContraseña");      // ← agregar más si se
  // necesita ────────────────────────────────────────────────────────

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

  unsigned long ahora = millis();

  // ── Ciclo de parpadeo 20s ON / 20s OFF ──────────────────
  // Se evalúa en CADA vuelta del loop() para precisión temporal,
  // independientemente del ciclo de polling HTTP de 10 segundos.
  // Los datos (zona, dirección, hora) se guardaron localmente al
  // recibir la alerta, por lo que NO depende de una nueva respuesta
  // del servidor — el ciclo continúa aunque el servidor ya no
  // devuelva esa alerta (fue confirmada y está en cooldown).
  if (hayAlertaActiva) {

    if (pantallaEncendida && (ahora - tiempoEncendidoDesde >= PANTALLA_ON_MS)) {
      // Fin del ciclo ON → apagar pantalla
      Serial.println("[LCD] Ciclo ON cumplido — pantalla apagada por 20 seg.");
      pantallaEncendida = false;
      tiempoApagadoDesde = ahora;
      pantallaSinAlertas();

    } else if (!pantallaEncendida &&
               (ahora - tiempoApagadoDesde >= PANTALLA_OFF_MS)) {
      // Fin del ciclo OFF → re-encender pantalla con datos guardados (modo recordatorio)
      Serial.println("[LCD] Ciclo OFF cumplido — re-encendiendo pantalla (recordatorio).");
      pantallaEncendida = true;
      tiempoEncendidoDesde = ahora;
      dibujarPantallaAlerta(true);

      // El buzzer solo suena en el PRIMER re-encendido (a los 40 seg).
      // En los siguientes ciclos, el LCD sigue prendiendo/apagando pero en silencio.
      if (!recordatorioBuzzerEmitido) {
        sonarBuzzer(2, 200); // 2 beeps de recordatorio (única vez)
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
//  FUNCIONES DE RED
// ============================================================

/**
 * GET /api/hardware/alerta-pendiente
 * Consulta si hay una nueva alerta asignada al dispositivo.
 * Si llega una alerta con alerta_id distinto al activo, arranca el ciclo
 * de parpadeo con los nuevos datos.
 * Si no hay alerta y no hay ciclo activo, apaga la pantalla.
 */
void consultarAlerta() {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure(); // Omite verificación de certificado (proyecto escolar)
  String url = String(SERVER_URL) + "/api/hardware/alerta-pendiente";

  Serial.println("[HTTP] Consultando: " + url);
  http.begin(client, url);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("[HTTP] OK 200: " + payload);

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      Serial.println("[JSON] Error al parsear: " + String(error.c_str()));
      http.end();
      return;
    }

    if (!doc["alerta"].isNull()) {
      // ── Hay alerta pendiente ──
      int alertaId = doc["alerta"]["alerta_id"];
      String zona = doc["alerta"]["zona"].as<String>();
      String direccion = doc["alerta"]["direccion"].as<String>();
      String fecha = doc["alerta"]["fecha"].as<String>();

      // Extraer solo la hora del string "DD/MM HH:MM" → "HH:MM"
      String hora = fecha;
      int espacio = fecha.indexOf(' ');
      if (espacio >= 0 && espacio + 1 < (int)fecha.length()) {
        hora = fecha.substring(espacio + 1);
      }

      Serial.println("[ALERTA] ID=" + String(alertaId) + " Zona=" + zona +
                     " Dir=" + direccion + " Hora=" + hora);

      // Solo actuar si es una alerta DIFERENTE a la que ya está activa
      // (evita redibujar/sonar si el servidor sigue devolviendo la misma)
      if (alertaId != alertaActivaId) {
        alertaActivaId = alertaId;
        hayAlertaActiva = true;
        mostrarAlerta(alertaId, zona, direccion, hora);
        confirmarAlerta(alertaId);
      }

    } else {
      // ── Sin alertas en el servidor ──
      // IMPORTANTE: si hay un ciclo de parpadeo activo (hayAlertaActiva=true),
      // NO se interrumpe — el servidor dejó de devolver la alerta porque ya fue
      // confirmada (cooldown), pero el operario todavía debe ver el
      // recordatorio. El ciclo solo se corta cuando llegue una alerta con id
      // diferente.
      if (!hayAlertaActiva) {
        pantallaSinAlertas();
      }
      Serial.println("[INFO] Sin alertas pendientes en servidor.");
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
  WiFiClientSecure client;
  client.setInsecure(); // Omite verificación de certificado (proyecto escolar)
  String url =
      String(SERVER_URL) + "/api/hardware/confirmar/" + String(alertaId);

  Serial.println("[HTTP] Confirmando alerta #" + String(alertaId));
  http.begin(client, url);
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
 * Pantalla de inicio al encender el dispositivo.
 */
void pantallaArranque() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("====================");
  lcd.setCursor(0, 1);
  lcd.print("  TrashFlow  v1.0   ");
  lcd.setCursor(0, 2);
  lcd.print(" Municipio Vic.Lopez");
  lcd.setCursor(0, 3);
  lcd.print("====================");
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  Conectando WiFi...");
  lcd.setCursor(0, 1);
  lcd.print("Buscando red...     ");
}

/**
 * Estado sin alertas: pantalla completamente apagada.
 * El operario no ve nada hasta que llegue una nueva alerta.
 */
void pantallaSinAlertas() {
  lcd.noBacklight();
  lcd.clear();
}

/**
 * Dibuja en el LCD los datos de la alerta activa usando las variables
 * globales zonaActual / direccionActual / horaActual.
 *
 * Layout del LCD 2004 (20×4):
 *   Fila 0: "!! NUEVA ALERTA !!" o "-- RECORDATORIO --"
 *   Fila 1: "Zona: <zona>"
 *   Fila 2: "<dirección>" (máx 20 chars)
 *   Fila 3: "<hora>"       (ej: "15:30")
 *
 * Esta función NO activa buzzer ni actualiza tiempos — solo renderiza.
 *
 * @param esRecordatorio true si es el ciclo de re-encendido (recordatorio),
 *                       false si es la primera vez que llega la alerta.
 */
void dibujarPantallaAlerta(bool esRecordatorio) {
  lcd.backlight();
  lcd.clear();

  // Fila 0: título según si es alerta nueva o recordatorio
  lcd.setCursor(0, 0);
  if (esRecordatorio) {
    lcd.print("-- RECORDATORIO --  ");
  } else {
    lcd.print("!! NUEVA ALERTA !!  ");
  }

  // Fila 1: zona
  lcd.setCursor(0, 1);
  String lineaZona = "Zona: " + zonaActual;
  while (lineaZona.length() < 20)
    lineaZona += " ";
  lcd.print(lineaZona.substring(0, 20));

  // Fila 2: dirección (primeros 20 chars)
  lcd.setCursor(0, 2);
  if (direccionActual.length() > 0) {
    String lineaDir = direccionActual;
    while (lineaDir.length() < 20)
      lineaDir += " ";
    lcd.print(lineaDir.substring(0, 20));
  }

  // Fila 3: hora (solo "HH:MM")
  lcd.setCursor(0, 3);
  String lineaHora = horaActual;
  while (lineaHora.length() < 20)
    lineaHora += " ";
  lcd.print(lineaHora.substring(0, 20));
}

// Sobrecarga por compatibilidad
void dibujarPantallaAlerta() {
  dibujarPantallaAlerta(false);
}

/**
 * Primera vez que llega una alerta nueva:
 *   1. Guarda los datos localmente (para re-dibujar en ciclos posteriores)
 *   2. Arranca el ciclo de parpadeo (pantallaEncendida = true)
 *   3. Hace sonar el buzzer con patrón insistente (6 beeps de 200ms)
 *   4. Dibuja la pantalla
 *
 * @param alertaId  ID de la alerta (solo para logs)
 * @param zona      Nombre de la zona
 * @param direccion Dirección corta (ya viene recortada del servidor)
 * @param hora      Hora en formato "HH:MM"
 */
void mostrarAlerta(int alertaId, String zona, String direccion, String hora) {
  // 1. Guardar datos para el ciclo de parpadeo y resetear recordatorio de buzzer
  zonaActual = zona;
  direccionActual = direccion;
  horaActual = hora;
  recordatorioBuzzerEmitido = false; // Permitir el único recordatorio sonoro para esta nueva alerta

  // 2. Arrancar ciclo: pantalla ON, registrar tiempo
  pantallaEncendida = true;
  tiempoEncendidoDesde = millis();

  // 3. Buzzer insistente para nueva alerta: 6 beeps rápidos de 200ms con pausas de 100ms
  sonarBuzzer(6, 200);

  // 4. Dibujar pantalla (primera vez: "!! NUEVA ALERTA !!")
  dibujarPantallaAlerta(false);

  Serial.println("[LCD] Alerta #" + String(alertaId) +
                 " mostrada — ciclo 20s ON / 20s OFF iniciado.");
}

/**
 * Error de conexión Wi-Fi.
 */
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
 * Error de red (servidor no responde).
 * No sobreescribe la pantalla si hay un ciclo de alerta activo.
 */
void pantallaErrorRed() {
  if (!hayAlertaActiva) {
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  TrashFlow         ");
    lcd.setCursor(0, 1);
    lcd.print(" Sin conexion red   ");
    lcd.setCursor(0, 2);
    lcd.print(" Reintentando...    ");
    lcd.setCursor(0, 3);
    lcd.print("                    ");
  }
  // Si hay alerta activa, no interrumpir el ciclo de parpadeo
}

/**
 * Error HTTP del servidor (4xx / 5xx).
 * No sobreescribe la pantalla si hay un ciclo de alerta activo.
 */
void pantallaErrorServidor(int codigo) {
  if (!hayAlertaActiva) {
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  TrashFlow         ");
    lcd.setCursor(0, 1);
    lcd.print(" Error servidor:    ");
    lcd.setCursor(0, 2);
    lcd.print(" HTTP " + String(codigo) + "          ");
    lcd.setCursor(0, 3);
    lcd.print("                    ");
  }
}

/**
 * Dispositivo sin operario asignado desde el panel web.
 */
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
  lcd.print("Ver panel web.      ");
}

// ============================================================
//  FUNCIÓN DEL BUZZER
// ============================================================

/**
 * Activa el buzzer activo N veces con la duración indicada.
 * Pausa de 100ms entre beeps para un sonido insistente y claro.
 * Si BUZZER_HABILITADO = false, solo imprime en Serial.
 *
 * @param veces      Cantidad de beeps
 * @param duracionMs Duración de cada beep en milisegundos
 */
void sonarBuzzer(int veces, int duracionMs) {
#if BUZZER_HABILITADO
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(duracionMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < veces - 1) {
      delay(100); // Pausa breve de 100ms entre beeps
    }
  }
#else
  Serial.println("[BUZZER] (deshabilitado) beeps=" + String(veces) +
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
  // wifiMulti.run() escanea las redes disponibles y se conecta
  // automáticamente a la primera que coincida con las cargadas.
  while (wifiMulti.run() != WL_CONNECTED && intentos < 40) {
    delay(500);
    Serial.print(".");
    intentos++;

    // Animación de puntos en pantalla
    if (intentos % 5 == 0) {
      lcd.setCursor(0, 3);
      String puntos = "";
      for (int p = 0; p < (intentos / 5) % 5; p++)
        puntos += ".";
      lcd.print("Espere " + puntos + "             ");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado a: " + WiFi.SSID());
    Serial.println("[WiFi] IP: " + WiFi.localIP().toString());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  WiFi Conectado!   ");
    String redConectada = WiFi.SSID();
    while (redConectada.length() < 20)
      redConectada += " ";
    lcd.setCursor(0, 1);
    lcd.print(redConectada.substring(0, 20));
    lcd.setCursor(0, 2);
    lcd.print("Consultando alertas.");
    lcd.setCursor(0, 3);
    lcd.print(WiFi.localIP().toString());
    delay(2000);

    // Apagar pantalla: el ciclo de alertas la prenderá cuando corresponda
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
    // No reinicia: queda en pantalla de error hasta reset manual
    while (true) {
      delay(10000);
    }
  }
}
