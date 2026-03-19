/**
 * Monitor de Ruido en Aulas
 * Firmware para M5Stack Core2 v1.1 (ESP32)
 *
 * Lee audio del microfono SPM1423 (PDM), aplica filtro A-weighting (dBA),
 * calcula nivel de ruido, muestra datos en la pantalla LCD y envia la
 * media de 5 segundos via MQTT.
 */

#include <Arduino.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <esp_wifi.h>
#if WIFI_ENTERPRISE
  #if __has_include(<esp_eap_client.h>)
    #include <esp_eap_client.h>
  #else
    #include <esp_wpa2.h>
    #define esp_eap_client_set_identity esp_wifi_sta_wpa2_ent_set_identity
    #define esp_eap_client_set_username esp_wifi_sta_wpa2_ent_set_username
    #define esp_eap_client_set_password esp_wifi_sta_wpa2_ent_set_password
    #define esp_eap_client_enable esp_wifi_sta_wpa2_ent_enable
  #endif
#endif
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <math.h>

#include "config.h"
#include "dsp.h"

// ============================================
// Variables globales
// ============================================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// Buffer de audio
int16_t sampleBuffer[SAMPLES_PER_READ];

// Filtro A-weighting
AWeightFilter awFilter;

// Valores de medicion
float currentDbLevel = 0.0;
float peakDbLevel = 0.0;
unsigned long lastSendTime = 0;
unsigned long lastPeakReset = 0;
unsigned long lastDisplayUpdate = 0;

// Acumulador para media de 5 segundos
float dbAccumulator = 0.0;
float peakAccumulator = 0.0;
int accumulatorCount = 0;

// Warmup: descartar primeros 3 segundos de lecturas
#define WARMUP_MS 3000
bool warmupDone = false;
unsigned long startTime = 0;

// Modo calibracion
bool calibrationMode = false;
float calAccumulator = 0.0;
int calCount = 0;
unsigned long calStartTime = 0;
#define CAL_DURATION_MS 10000

// Topic MQTT
char mqttTopic[128];

// Estado de conexiones
bool wifiConnected = false;
bool mqttConnected = false;
unsigned long lastMqttSendOk = 0;

// ============================================
// Colores para la pantalla
// ============================================
#define COLOR_BG       0x1082  // Gris oscuro
#define COLOR_CARD_BG  0x2104  // Gris un poco mas claro
#define COLOR_TEXT     0xFFFF  // Blanco
#define COLOR_GRAY     0x8410  // Gris claro para textos secundarios
#define COLOR_GREEN    0x07E0
#define COLOR_YELLOW   0xFFE0
#define COLOR_RED      0xF800
#define COLOR_BLUE     0x001F
#define COLOR_ORANGE   0xFD20

// ============================================
// Pantalla LCD - Interfaz principal
// ============================================
void drawStatusBar() {
    M5.Lcd.fillRect(0, 0, SCREEN_WIDTH, 28, COLOR_CARD_BG);

    M5.Lcd.setTextSize(1);
    M5.Lcd.setTextDatum(TL_DATUM);
    M5.Lcd.fillCircle(12, 14, 5, wifiConnected ? COLOR_GREEN : COLOR_RED);
    M5.Lcd.setTextColor(COLOR_TEXT);
    M5.Lcd.drawString("WiFi", 22, 8);

    M5.Lcd.fillCircle(80, 14, 5, mqttConnected ? COLOR_GREEN : COLOR_RED);
    M5.Lcd.drawString("MQTT", 90, 8);

    // dBA indicator
    M5.Lcd.setTextColor(COLOR_YELLOW);
    M5.Lcd.drawString("dBA", 140, 8);

    M5.Lcd.setTextDatum(TR_DATUM);
    M5.Lcd.setTextColor(COLOR_GRAY);
    char idStr[64];
    snprintf(idStr, sizeof(idStr), "%s / %s", ROOM_ID, MIC_ID);
    M5.Lcd.drawString(idStr, SCREEN_WIDTH - 8, 8);
}

void drawDbLevel(float db) {
    uint16_t bgColor;
    uint16_t textColor;
    const char* label;

    if (db < THRESHOLD_LOW) {
        bgColor = COLOR_GREEN;
        textColor = 0x0000;
        label = "TRANQUILO";
    } else if (db < THRESHOLD_HIGH) {
        bgColor = COLOR_YELLOW;
        textColor = 0x0000;
        label = "MODERADO";
    } else {
        bgColor = COLOR_RED;
        textColor = COLOR_TEXT;
        label = "RUIDOSO";
    }

    int centerY = 95;
    int boxH = 100;
    M5.Lcd.fillRoundRect(20, centerY - boxH/2, SCREEN_WIDTH - 40, boxH, 12, bgColor);

    M5.Lcd.setTextColor(textColor);
    M5.Lcd.setTextDatum(MC_DATUM);
    M5.Lcd.setTextSize(4);

    char dbStr[16];
    snprintf(dbStr, sizeof(dbStr), "%.1f", db);
    M5.Lcd.drawString(dbStr, SCREEN_WIDTH / 2, centerY - 12);

    M5.Lcd.setTextSize(2);
    M5.Lcd.drawString("dBA", SCREEN_WIDTH / 2, centerY + 25);

    M5.Lcd.setTextSize(1);
    M5.Lcd.drawString(label, SCREEN_WIDTH / 2, centerY + 42);
}

void drawCalibrationScreen() {
    int centerY = 95;
    int boxH = 100;
    M5.Lcd.fillRoundRect(20, centerY - boxH/2, SCREEN_WIDTH - 40, boxH, 12, COLOR_BLUE);

    M5.Lcd.setTextColor(COLOR_TEXT);
    M5.Lcd.setTextDatum(MC_DATUM);
    M5.Lcd.setTextSize(2);
    M5.Lcd.drawString("CALIBRANDO", SCREEN_WIDTH / 2, centerY - 20);

    int elapsed = (millis() - calStartTime) / 1000;
    int remaining = (CAL_DURATION_MS / 1000) - elapsed;
    char timeStr[16];
    snprintf(timeStr, sizeof(timeStr), "%d s", remaining > 0 ? remaining : 0);
    M5.Lcd.setTextSize(3);
    M5.Lcd.drawString(timeStr, SCREEN_WIDTH / 2, centerY + 15);

    if (calCount > 0) {
        M5.Lcd.setTextSize(1);
        char avgStr[32];
        snprintf(avgStr, sizeof(avgStr), "Media: %.1f dBA", calAccumulator / calCount);
        M5.Lcd.drawString(avgStr, SCREEN_WIDTH / 2, centerY + 42);
    }
}

void drawStats(float peak) {
    int statsY = 155;
    M5.Lcd.fillRect(0, statsY, SCREEN_WIDTH, 50, COLOR_BG);

    M5.Lcd.setTextSize(2);
    M5.Lcd.setTextDatum(MC_DATUM);
    M5.Lcd.setTextColor(COLOR_GRAY);
    M5.Lcd.drawString("Pico", SCREEN_WIDTH / 4, statsY + 8);

    uint16_t peakColor = peak < THRESHOLD_LOW ? COLOR_GREEN :
                         peak < THRESHOLD_HIGH ? COLOR_YELLOW : COLOR_RED;
    M5.Lcd.setTextColor(peakColor);
    char peakStr[16];
    snprintf(peakStr, sizeof(peakStr), "%.1f", peak);
    M5.Lcd.drawString(peakStr, SCREEN_WIDTH / 4, statsY + 30);

    M5.Lcd.setTextColor(COLOR_GRAY);
    M5.Lcd.drawString("WiFi", 3 * SCREEN_WIDTH / 4, statsY + 8);

    int rssi = WiFi.RSSI();
    uint16_t rssiColor = rssi > -50 ? COLOR_GREEN :
                         rssi > -70 ? COLOR_YELLOW : COLOR_RED;
    M5.Lcd.setTextColor(rssiColor);
    char rssiStr[16];
    snprintf(rssiStr, sizeof(rssiStr), "%d", rssi);
    M5.Lcd.drawString(rssiStr, 3 * SCREEN_WIDTH / 4, statsY + 30);
}

void drawBottomBar() {
    int barY = SCREEN_HEIGHT - 28;
    M5.Lcd.fillRect(0, barY, SCREEN_WIDTH, 28, COLOR_CARD_BG);

    M5.Lcd.setTextSize(1);
    M5.Lcd.setTextDatum(MC_DATUM);
    M5.Lcd.setTextColor(COLOR_GRAY);

    char info[64];
    unsigned long uptime = millis() / 1000;
    int mins = uptime / 60;
    int secs = uptime % 60;
    snprintf(info, sizeof(info), "Uptime: %dm %ds  |  A-weighting ON", mins, secs);
    M5.Lcd.drawString(info, SCREEN_WIDTH / 2, barY + 14);
}

void drawInitScreen(const char* status) {
    M5.Lcd.fillScreen(COLOR_BG);
    M5.Lcd.setTextColor(COLOR_TEXT);
    M5.Lcd.setTextDatum(MC_DATUM);
    M5.Lcd.setTextSize(2);
    M5.Lcd.drawString("Monitor Ruido", SCREEN_WIDTH / 2, 60);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setTextColor(COLOR_GRAY);
    M5.Lcd.drawString("M5Stack Core2 (dBA)", SCREEN_WIDTH / 2, 90);

    char idStr[64];
    snprintf(idStr, sizeof(idStr), "%s / %s", ROOM_ID, MIC_ID);
    M5.Lcd.drawString(idStr, SCREEN_WIDTH / 2, 110);

    M5.Lcd.setTextColor(COLOR_YELLOW);
    M5.Lcd.drawString(status, SCREEN_WIDTH / 2, 160);
}

void updateDisplay() {
    drawStatusBar();
    if (calibrationMode) {
        drawCalibrationScreen();
    } else if (!warmupDone) {
        int remaining = (WARMUP_MS - (millis() - startTime)) / 1000 + 1;
        char warmupStr[32];
        snprintf(warmupStr, sizeof(warmupStr), "Warmup... %ds", remaining);
        drawDbLevel(0);
        M5.Lcd.setTextColor(COLOR_YELLOW);
        M5.Lcd.setTextDatum(MC_DATUM);
        M5.Lcd.setTextSize(1);
        M5.Lcd.drawString(warmupStr, SCREEN_WIDTH / 2, 150);
    } else {
        drawDbLevel(currentDbLevel);
    }
    drawStats(peakDbLevel);
    drawBottomBar();
}

// ============================================
// Configuracion microfono via M5Unified
// ============================================
void setupMic() {
    auto mic_cfg = M5.Mic.config();
    mic_cfg.sample_rate = SAMPLE_RATE;
    mic_cfg.dma_buf_count = 4;
    mic_cfg.dma_buf_len = SAMPLES_PER_READ;
    M5.Mic.config(mic_cfg);

    if (M5.Mic.begin()) {
        Serial.println("[MIC] Microfono SPM1423 configurado via M5Unified");
    } else {
        Serial.println("[ERROR] No se pudo iniciar el microfono");
    }
}

// ============================================
// Conexion WiFi
// ============================================
void setupWiFi() {
    drawInitScreen("Conectando WiFi...");

    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true, true);
    delay(1000);

    #if WIFI_ENTERPRISE
        Serial.printf("[WiFi] Conectando a %s (WPA2-Enterprise, user: %s)\n", WIFI_SSID, WIFI_USER);
        esp_eap_client_set_identity((uint8_t *)WIFI_USER, strlen(WIFI_USER));
        esp_eap_client_set_username((uint8_t *)WIFI_USER, strlen(WIFI_USER));
        esp_eap_client_set_password((uint8_t *)WIFI_PASSWORD, strlen(WIFI_PASSWORD));
        esp_eap_client_enable();
        WiFi.begin(WIFI_SSID);
    #else
        Serial.printf("[WiFi] Conectando a %s (WPA2-Personal)\n", WIFI_SSID);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    #endif

    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 90) {
        delay(1000);
        Serial.printf(".");
        intentos++;

        if (intentos % 5 == 0) {
            char status[64];
            snprintf(status, sizeof(status), "WiFi... intento %d/90", intentos);
            drawInitScreen(status);
        }

        if (intentos % 30 == 0 && WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Reintentando conexion...");
            WiFi.disconnect(true, true);
            delay(1000);
            #if WIFI_ENTERPRISE
                esp_eap_client_set_identity((uint8_t *)WIFI_USER, strlen(WIFI_USER));
                esp_eap_client_set_username((uint8_t *)WIFI_USER, strlen(WIFI_USER));
                esp_eap_client_set_password((uint8_t *)WIFI_PASSWORD, strlen(WIFI_PASSWORD));
                esp_eap_client_enable();
                WiFi.begin(WIFI_SSID);
            #else
                WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            #endif
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.printf("\n[WiFi] Conectado! IP: %s  RSSI: %d dBm\n",
            WiFi.localIP().toString().c_str(), WiFi.RSSI());
        drawInitScreen("WiFi conectado!");
        delay(500);
    } else {
        Serial.printf("\n[WiFi] Error de conexion (estado: %d). Reiniciando en 5s...\n", WiFi.status());
        drawInitScreen("Error WiFi! Reiniciando...");
        delay(5000);
        ESP.restart();
    }
}

// ============================================
// Conexion MQTT
// ============================================
void setupMQTT() {
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    snprintf(mqttTopic, sizeof(mqttTopic), "aulas/%s/%s/noise", ROOM_ID, MIC_ID);
    Serial.printf("[MQTT] Topic: %s\n", mqttTopic);
}

void reconnectMQTT() {
    while (!mqttClient.connected()) {
        Serial.print("[MQTT] Conectando al broker...");

        String clientId = "core2-";
        clientId += String(ROOM_ID);
        clientId += "-";
        clientId += String(MIC_ID);

        bool connected;
        if (strlen(MQTT_USER) > 0) {
            connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD);
        } else {
            connected = mqttClient.connect(clientId.c_str());
        }

        if (connected) {
            mqttConnected = true;
            Serial.println(" conectado!");
        } else {
            mqttConnected = false;
            Serial.printf(" fallo (rc=%d). Reintentando en 5s...\n", mqttClient.state());
            delay(5000);
        }
    }
}

// ============================================
// Calculo de nivel de ruido con A-weighting
// ============================================
float calculateRMS_AWeighted(int16_t* samples, size_t count) {
    double sum = 0.0;
    for (size_t i = 0; i < count; i++) {
        float filtered = aweight_process(&awFilter, (float)samples[i]);
        sum += (double)filtered * (double)filtered;
    }
    return sqrt(sum / count);
}

float rmsToDB(float rms) {
    if (rms < 1.0) rms = 1.0;
    float db = 20.0 * log10(rms) + DB_OFFSET;
    if (db < 20.0) db = 20.0;
    if (db > 120.0) db = 120.0;
    return db;
}

// ============================================
// Lectura de audio y calculo de dB
// ============================================
void readAudioLevel() {
    if (!M5.Mic.isEnabled()) return;

    if (M5.Mic.record(sampleBuffer, SAMPLES_PER_READ, SAMPLE_RATE) == false) {
        return;
    }

    // Descartar lecturas durante warmup
    if (!warmupDone) {
        if (millis() - startTime < WARMUP_MS) {
            return;
        }
        warmupDone = true;
        aweight_reset(&awFilter);
        Serial.println("[MIC] Warmup completado, mediciones dBA activas");
    }

    float rms = calculateRMS_AWeighted(sampleBuffer, SAMPLES_PER_READ);
    currentDbLevel = rmsToDB(rms);

    // Modo calibracion: acumular lecturas
    if (calibrationMode) {
        calAccumulator += currentDbLevel;
        calCount++;

        if (millis() - calStartTime >= CAL_DURATION_MS) {
            float calAvg = calAccumulator / calCount;
            Serial.println("\n========================================");
            Serial.println("  RESULTADO CALIBRACION");
            Serial.printf("  Media medida: %.1f dBA (%d muestras)\n", calAvg, calCount);
            Serial.printf("  DB_OFFSET actual: %.1f\n", DB_OFFSET);
            Serial.println("  --");
            Serial.println("  Para calibrar: pon un sonometro de referencia");
            Serial.println("  al lado y ajusta DB_OFFSET en config.h:");
            Serial.printf("  DB_OFFSET = %.1f + (lectura_referencia - %.1f)\n", DB_OFFSET, calAvg);
            Serial.println("========================================\n");
            calibrationMode = false;
            M5.Lcd.fillScreen(COLOR_BG);
        }
        return;
    }

    // Acumular para media
    dbAccumulator += currentDbLevel;
    if (currentDbLevel > peakAccumulator) {
        peakAccumulator = currentDbLevel;
    }
    accumulatorCount++;

    // Actualizar pico visual (se resetea cada 10 segundos)
    if (currentDbLevel > peakDbLevel) {
        peakDbLevel = currentDbLevel;
    }
    if (millis() - lastPeakReset > 10000) {
        peakDbLevel = currentDbLevel;
        lastPeakReset = millis();
    }
}

// ============================================
// Envio de datos por MQTT (media de 5s)
// ============================================
void sendNoiseData() {
    if (accumulatorCount == 0) return;

    float avgDb = dbAccumulator / accumulatorCount;
    float peak = peakAccumulator;

    // Resetear acumulador
    dbAccumulator = 0.0;
    peakAccumulator = 0.0;
    accumulatorCount = 0;

    JsonDocument doc;
    doc["room"] = ROOM_ID;
    doc["mic"] = MIC_ID;
    doc["db"] = round(avgDb * 10.0) / 10.0;
    doc["peak"] = round(peak * 10.0) / 10.0;
    doc["timestamp"] = (unsigned long)(millis() / 1000);

    char payload[256];
    serializeJson(doc, payload, sizeof(payload));

    if (mqttClient.publish(mqttTopic, payload)) {
        lastMqttSendOk = millis();
        Serial.printf("[MQTT] Enviado: %s\n", payload);
    } else {
        Serial.println("[MQTT] Error al publicar");
    }
}

// ============================================
// Setup
// ============================================
void setup() {
    auto cfg = M5.config();
    M5.begin(cfg);

    Serial.begin(115200);
    delay(1000);

    M5.Lcd.fillScreen(COLOR_BG);
    M5.Lcd.setBrightness(80);

    Serial.println("========================================");
    Serial.println("  Monitor de Ruido en Aulas - Core2 (dBA)");
    Serial.printf("  Aula: %s  Micro: %s\n", ROOM_ID, MIC_ID);
    Serial.println("  Filtro: A-weighting IIR 3-biquad");
    Serial.println("========================================");

    // Inicializar filtro A-weighting
    aweight_init(&awFilter);

    drawInitScreen("Iniciando microfono...");
    setupMic();

    setupWiFi();

    drawInitScreen("Conectando MQTT...");
    setupMQTT();

    startTime = millis();

    // Pantalla principal
    M5.Lcd.fillScreen(COLOR_BG);
    updateDisplay();

    Serial.printf("[SISTEMA] Iniciado. Warmup %d ms...\n", WARMUP_MS);
}

// ============================================
// Loop principal
// ============================================
void loop() {
    M5.update();

    // Reconectar WiFi si se pierde
    if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        Serial.println("[WiFi] Conexion perdida. Reiniciando...");
        delay(1000);
        ESP.restart();
    }
    wifiConnected = true;

    if (!mqttClient.connected()) {
        mqttConnected = false;
        reconnectMQTT();
    }
    mqttConnected = mqttClient.connected();
    mqttClient.loop();

    readAudioLevel();

    unsigned long now = millis();

    // Enviar datos MQTT cada SEND_INTERVAL_MS
    if (now - lastSendTime >= SEND_INTERVAL_MS) {
        lastSendTime = now;
        if (!calibrationMode) {
            sendNoiseData();
        }
    }

    // Actualizar pantalla cada DISPLAY_UPDATE_MS
    if (now - lastDisplayUpdate >= DISPLAY_UPDATE_MS) {
        lastDisplayUpdate = now;
        updateDisplay();
    }

    // Boton A: pulsacion corta = reset pico, pulsacion larga (>2s) = calibracion
    if (M5.BtnA.wasPressed()) {
        peakDbLevel = currentDbLevel;
        Serial.println("[BOTON] Pico reseteado");
    }
    if (M5.BtnA.pressedFor(2000) && !calibrationMode) {
        calibrationMode = true;
        calAccumulator = 0.0;
        calCount = 0;
        calStartTime = millis();
        Serial.println("\n[CAL] Modo calibracion iniciado (10 segundos)...");
        Serial.println("[CAL] Coloca un sonometro de referencia junto al micro");
    }

    // Boton B: alternar brillo pantalla
    if (M5.BtnB.wasPressed()) {
        static int brightness = 80;
        brightness = (brightness == 80) ? 40 : (brightness == 40) ? 10 : 80;
        M5.Lcd.setBrightness(brightness);
        Serial.printf("[BOTON] Brillo: %d\n", brightness);
    }
}
