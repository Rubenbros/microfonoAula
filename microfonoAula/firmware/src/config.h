#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// Configuracion WiFi
// ============================================
#define WIFI_SSID "TU_SSID_AQUI"
#define WIFI_PASSWORD "TU_PASSWORD_AQUI"

// ============================================
// Configuracion MQTT
// ============================================
#define MQTT_BROKER "192.168.0.22"
#define MQTT_PORT 1883
#define MQTT_USER ""       // Dejar vacio si no hay autenticacion
#define MQTT_PASSWORD ""   // Dejar vacio si no hay autenticacion

// ============================================
// Identificacion del aula
// ============================================
#define ROOM_ID "aula_01"

// ============================================
// Parametros de medicion
// ============================================
#define SEND_INTERVAL_MS 2000       // Intervalo de envio MQTT (ms)
#define SAMPLE_RATE 16000           // Frecuencia de muestreo (Hz)
#define SAMPLES_PER_READ 1024      // Muestras por lectura I2S
#define DB_REFERENCE 94.0          // Referencia dB SPL para calibracion
#define DB_OFFSET 26.0             // Offset de calibracion (ajustar segun microfono)

// ============================================
// Pines I2S - M5Stack ATOM Echo S3R
// ============================================
#define I2S_LRCK_PIN 3    // GPIO3
#define I2S_SCLK_PIN 17   // GPIO17
#define I2S_MCLK_PIN 11   // GPIO11
#define I2S_DSDIN_PIN 48  // GPIO48

// ============================================
// Umbrales de ruido (dB)
// ============================================
#define THRESHOLD_LOW 50.0    // Por debajo: verde (tranquilo)
#define THRESHOLD_HIGH 70.0   // Por encima: rojo (ruidoso)

#endif // CONFIG_H
