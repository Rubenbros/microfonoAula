/**
 * Monitor de Ruido en Aulas
 * Firmware para M5Stack ATOM Echo S3R (ESP32-S3)
 *
 * Lee audio del microfono integrado, calcula nivel de ruido en dB SPL
 * y envia la media de 5 segundos via MQTT. El LED RGB indica el nivel.
 */

#include <Arduino.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <esp_wpa2.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <math.h>

#include "config.h"

// ============================================
// Variables globales
// ============================================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// Buffer de audio
int16_t sampleBuffer[SAMPLES_PER_READ];

// Valores de medicion
float currentDbLevel = 0.0;
float peakDbLevel = 0.0;
unsigned long lastSendTime = 0;
unsigned long lastPeakReset = 0;

// Acumulador para media de 5 segundos
float dbAccumulator = 0.0;
float peakAccumulator = 0.0;
int accumulatorCount = 0;

// Topic MQTT
char mqttTopic[128];

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
        Serial.println("[MIC] Microfono configurado correctamente via M5Unified");
    } else {
        Serial.println("[ERROR] No se pudo iniciar el microfono");
    }
}

// ============================================
// Conexion WiFi
// ============================================
void setupWiFi() {
    Serial.printf("[WiFi] Conectando a %s (EAP user: %s)\n", WIFI_SSID, WIFI_USER);
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true);
    delay(100);

    // Configurar WPA2-Enterprise (EAP-PEAP)
    esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)WIFI_USER, strlen(WIFI_USER));
    esp_wifi_sta_wpa2_ent_set_username((uint8_t *)WIFI_USER, strlen(WIFI_USER));
    esp_wifi_sta_wpa2_ent_set_password((uint8_t *)WIFI_PASSWORD, strlen(WIFI_PASSWORD));
    esp_wifi_sta_wpa2_ent_enable();

    WiFi.begin(WIFI_SSID);

    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 40) {
        delay(500);
        Serial.print(".");
        intentos++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Error de conexion. Reiniciando...");
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

        String clientId = "atom-echo-";
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
            Serial.println(" conectado!");
        } else {
            Serial.printf(" fallo (rc=%d). Reintentando en 5s...\n", mqttClient.state());
            delay(5000);
        }
    }
}

// ============================================
// Calculo de nivel de ruido
// ============================================
float calculateRMS(int16_t* samples, size_t count) {
    double sum = 0.0;
    for (size_t i = 0; i < count; i++) {
        double sample = (double)samples[i];
        sum += sample * sample;
    }
    return sqrt(sum / count);
}

float rmsToDB(float rms) {
    if (rms < 1.0) rms = 1.0; // Evitar log(0)
    float db = 20.0 * log10(rms) + DB_OFFSET;
    if (db < 20.0) db = 20.0;
    if (db > 120.0) db = 120.0;
    return db;
}

// ============================================
// LED de estado segun nivel de ruido
// ============================================
void updateLED(float db) {
    if (db < THRESHOLD_LOW) {
        M5.Lcd.clear(TFT_GREEN);
    } else if (db < THRESHOLD_HIGH) {
        M5.Lcd.clear(TFT_YELLOW);
    } else {
        M5.Lcd.clear(TFT_RED);
    }
}

// ============================================
// Lectura de audio y calculo de dB
// ============================================
void readAudioLevel() {
    if (!M5.Mic.isEnabled()) return;

    if (M5.Mic.record(sampleBuffer, SAMPLES_PER_READ, SAMPLE_RATE) == false) {
        return;
    }

    float rms = calculateRMS(sampleBuffer, SAMPLES_PER_READ);
    currentDbLevel = rmsToDB(rms);

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

    Serial.println("========================================");
    Serial.println("  Monitor de Ruido en Aulas");
    Serial.printf("  Aula: %s  Micro: %s\n", ROOM_ID, MIC_ID);
    Serial.println("========================================");

    setupMic();
    setupWiFi();
    setupMQTT();

    M5.Lcd.clear(TFT_BLUE);
    Serial.println("[SISTEMA] Iniciado correctamente");
}

// ============================================
// Loop principal
// ============================================
void loop() {
    M5.update();

    if (!mqttClient.connected()) {
        reconnectMQTT();
    }
    mqttClient.loop();

    readAudioLevel();
    updateLED(currentDbLevel);

    unsigned long now = millis();
    if (now - lastSendTime >= SEND_INTERVAL_MS) {
        lastSendTime = now;
        sendNoiseData();
    }

    if (M5.BtnA.wasPressed()) {
        peakDbLevel = currentDbLevel;
        Serial.println("[BOTON] Pico reseteado");
    }
}
