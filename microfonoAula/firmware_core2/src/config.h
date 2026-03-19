#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// Configuracion WiFi
// ============================================
#define WIFI_ENTERPRISE false  // true = WPA2-Enterprise EAP-PEAP, false = WPA2-Personal
#define WIFI_SSID "IOT2"
#define WIFI_USER ""           // Solo para WPA2-Enterprise
#define WIFI_PASSWORD "IOT_Enlaces_205"

// ============================================
// Configuracion MQTT
// ============================================
#define MQTT_BROKER "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_USER ""       // Dejar vacio si no hay autenticacion
#define MQTT_PASSWORD ""   // Dejar vacio si no hay autenticacion

// ============================================
// Identificacion del aula y microfono
// ============================================
#define ROOM_ID "aula_01"
#define MIC_ID "mic_central"

// ============================================
// Parametros de medicion
// ============================================
#define SEND_INTERVAL_MS 5000       // Intervalo de envio MQTT (ms) - media de 5s
#define SAMPLE_RATE 16000           // Frecuencia de muestreo (Hz)
#define SAMPLES_PER_READ 1024      // Muestras por lectura
#define DB_REFERENCE 94.0          // Referencia dB SPL para calibracion
#define DB_OFFSET 0.0              // Offset de calibracion (ajustar segun microfono)

// ============================================
// Umbrales de ruido (dB)
// ============================================
#define THRESHOLD_LOW 50.0    // Por debajo: verde (tranquilo)
#define THRESHOLD_HIGH 70.0   // Por encima: rojo (ruidoso)

// ============================================
// Pantalla LCD
// ============================================
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 240
#define DISPLAY_UPDATE_MS 500  // Actualizar pantalla cada 500ms

#endif // CONFIG_H
