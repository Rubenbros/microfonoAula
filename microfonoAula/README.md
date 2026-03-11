# Monitor de Ruido en Aulas

Sistema de monitorización de niveles de ruido en tiempo real para aulas educativas, utilizando microfonos M5Stack ATOM Echo S3R (ESP32-S3).

## Arquitectura

```
[M5Stack ATOM Echo S3R] --MQTT--> [Mosquitto Broker] --MQTT--> [Backend Node.js] --WebSocket--> [Frontend Next.js]
                                                                      |
                                                                   [SQLite]
```

### Componentes

- **Firmware ESP32-S3**: Lee audio PDM del microfono integrado, calcula nivel de ruido en dB y envia datos via MQTT cada 2 segundos. LED RGB integrado muestra nivel: verde (<50dB), amarillo (50-70dB), rojo (>70dB).
- **Backend Node.js**: Recibe datos MQTT, almacena en SQLite, expone API REST y WebSocket para tiempo real.
- **Frontend Next.js**: Dashboard con tarjetas por aula, grafico historico y actualizacion en tiempo real.

## Hardware

- **Microfono**: [M5Stack ATOM Echo S3R](https://docs.m5stack.com/en/atom/AtomEchoS3R) (ESP32-S3, microfono PDM integrado)
- **Pines I2S PDM**: LRCK=G3, SCLK=G17, MCLK=G11, DSDIN=G48

## Inicio Rapido

### 1. Broker MQTT (con Docker)

```bash
docker-compose up -d mosquitto
```

### 2. Firmware

Requisitos: [PlatformIO](https://platformio.org/)

```bash
cd firmware
# Editar src/config.h con tus credenciales WiFi y direccion MQTT
cp src/config.h.example src/config.h  # (o editar directamente)
pio run -t upload
pio device monitor
```

### 3. Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

El servidor arranca en `http://localhost:3001`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

El dashboard arranca en `http://localhost:3000`.

## API REST

| Endpoint | Descripcion |
|---|---|
| `GET /api/rooms` | Lista de aulas con ultima lectura |
| `GET /api/rooms/:id/history?from=&to=` | Historico de un aula |
| `GET /api/stats` | Estadisticas generales |

## Formato MQTT

Topic: `aulas/{ROOM_ID}/noise`

```json
{
  "room": "aula_01",
  "db": 45.2,
  "peak": 67.1,
  "timestamp": 1234567890
}
```

## Estructura del Proyecto

```
microfonoAula/
├── firmware/           # Firmware ESP32-S3 (PlatformIO)
│   ├── platformio.ini
│   └── src/
│       ├── config.h
│       └── main.cpp
├── backend/            # Servidor Node.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       └── index.js
├── frontend/           # Dashboard Next.js
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── RoomCard.tsx
│       │   └── NoiseChart.tsx
│       └── lib/
│           └── useNoiseData.ts
├── docker-compose.yml
└── README.md
```

## Licencia

MIT
