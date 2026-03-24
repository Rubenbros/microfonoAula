# Monitor de Ruido en Aulas 🎤

Sistema de monitorización de niveles de ruido en tiempo real para aulas educativas, utilizando micrófonos M5Stack ATOM Echo S3R (ESP32-S3).

## Arquitectura

```
[M5Stack ATOM Echo S3R] --MQTT--> [Mosquitto Broker] --MQTT--> [Backend Node.js] --WebSocket--> [Frontend Next.js]
                                                                      |
                                                                   [SQLite]
```

## Requisitos previos

Solo necesitas esto instalado en tu ordenador:

| Software | Para qué | Instalación |
|----------|----------|-------------|
| **Node.js 18+** | Backend + Frontend + Simulador | [nodejs.org](https://nodejs.org) |
| **Docker Desktop** | Broker MQTT (Mosquitto) | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Clonar el repo | [git-scm.com](https://git-scm.com) |
| **PlatformIO** | Solo si flasheas el micro | [platformio.org](https://platformio.org) (extensión VS Code) |

> **¿Puedo trabajar sin Docker?** Sí, puedes instalar Mosquitto directamente: `winget install EclipseFoundation.Mosquitto` (Windows) o `brew install mosquitto` (Mac).

---

## Instalación rápida (git clone y listo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Rubenbros/microfonoAula.git
cd microfonoAula

# 2. Instalar dependencias de todo
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd simulator && npm install && cd ..
```

¡Ya está! Ahora elige cómo quieres arrancarlo:

---

## Opción A: Demo rápida (sin micro real)

Perfecto para probar el sistema desde cualquier sitio. El simulador genera datos de 6 aulas virtuales con patrones realistas.

### Windows (3 terminales)

**Terminal 1 — Broker MQTT:**
```bash
docker compose up -d mosquitto
```

**Terminal 2 — Backend:**
```bash
cd backend
cp .env.example .env
npm start
```

**Terminal 3 — Simulador + Frontend:**
```bash
# Arranca el simulador (datos falsos de 6 aulas)
cd simulator
node simulate.js --rooms 6 &

# Arranca el dashboard
cd ../frontend
npm run dev
```

**Abre http://localhost:3000** → Verás las 6 aulas con datos en tiempo real.

### Script automático (Windows)

```bash
scripts/demo.bat
```

### Script automático (Linux/Mac)

```bash
chmod +x scripts/demo.sh
./scripts/demo.sh
```

---

## Opción B: Con micrófono real (M5Stack ATOM Echo S3R)

### Paso 1: Configura el firmware

Edita `firmware/src/config.h` con los datos de tu red WiFi:

```c
#define WIFI_SSID     "NombreDeTuWiFi"
#define WIFI_PASSWORD "TuContraseña"
#define MQTT_BROKER   "192.168.1.100"   // IP del PC que corre el backend
#define ROOM_ID       "aula_01"          // Nombre identificativo del aula
```

> **Truco:** Para saber tu IP local, ejecuta `ipconfig` (Windows) o `ifconfig` (Mac/Linux).

### Paso 2: Flashea el micro

Necesitas PlatformIO (extensión de VS Code):

```bash
cd firmware
pio run -t upload        # Compila y flashea
pio device monitor       # Ver logs del micro por serial
```

El LED del micro cambia de color según el ruido:
- 🟢 Verde → < 50 dB (tranquilo)
- 🟡 Amarillo → 50-70 dB (normal)
- 🔴 Rojo → > 70 dB (ruidoso)

### Paso 3: Arranca backend y frontend

```bash
# Terminal 1 - Broker MQTT
docker compose up -d mosquitto

# Terminal 2 - Backend
cd backend && npm start

# Terminal 3 - Frontend
cd frontend && npm run dev
```

### Paso 4: Múltiples aulas

Para cada micro adicional, solo cambia `ROOM_ID` en `config.h` antes de flashear:

```c
#define ROOM_ID "aula_02"   // Diferente para cada micro
```

Todos los micros se conectan al mismo broker MQTT. El dashboard los detecta automáticamente.

---

## Simulador — Opciones

```bash
cd simulator

# Demo estándar (6 aulas, datos cada 2s)
node simulate.js

# Más aulas
node simulate.js --rooms 12

# Más frecuencia (cada 500ms)
node simulate.js --rooms 8 --interval 500

# Broker remoto
node simulate.js --broker mqtt://192.168.1.50 --rooms 6
```

El simulador genera patrones realistas: clase tranquila, explicación del profesor, trabajo en grupo, debate, recreo, examen, aula vacía. Cambia automáticamente entre escenarios.

---

## Trabajar fuera de casa / en otra red

El sistema funciona 100% en local. Solo necesitas:

1. ✅ Clonar el repo (`git clone`)
2. ✅ Tener Docker (para Mosquitto) o Mosquitto instalado
3. ✅ Tener Node.js 18+

**Sin micro real:** usa el simulador → `node simulator/simulate.js`

**Con micro real:** asegúrate de que:
- El PC y el micro están en la **misma red WiFi**
- Actualiza `MQTT_BROKER` en `config.h` con la IP del PC en esa red
- Reflashea el micro si cambias de red

**Sin Docker:** instala Mosquitto directamente:
```bash
# Windows
winget install EclipseFoundation.Mosquitto

# Mac
brew install mosquitto && mosquitto -c /dev/null -p 1883

# Linux
sudo apt install mosquitto && mosquitto -p 1883
```

---

## API REST

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/rooms` | Lista de aulas con última lectura |
| `GET /api/rooms/:id/history?from=&to=` | Histórico de un aula (timestamps UNIX) |
| `GET /api/stats` | Estadísticas generales (últimas 24h) |
| `GET /api/health` | Estado del sistema |

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

## Estructura del proyecto

```
microfonoAula/
├── firmware/           # Firmware ESP32-S3 (PlatformIO)
│   ├── platformio.ini
│   └── src/
│       ├── config.h    # ← Configura WiFi y MQTT aquí
│       └── main.cpp
├── backend/            # Servidor Node.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       └── index.js
├── frontend/           # Dashboard Next.js
│   ├── package.json
│   └── src/
│       ├── app/
│       ├── components/
│       └── lib/
├── simulator/          # Simulador de datos (sin hardware)
│   ├── package.json
│   └── simulate.js
├── scripts/            # Scripts de demo
│   ├── demo.sh
│   └── demo.bat
├── docker-compose.yml  # Mosquitto MQTT
└── README.md
```

## Licencia

MIT
