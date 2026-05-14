# Monitor de Ruido en Aulas 🎤

Sistema de monitorización de niveles de ruido en tiempo real para aulas educativas, utilizando micrófonos M5Stack ATOM Echo S3R (ESP32-S3).

## Arquitectura

```
[M5Stack ATOM Echo S3R] --MQTT--> [broker.hivemq.com] --MQTT--> [Backend Node.js] --WebSocket--> [Caddy] --> [Frontend Next.js]
                                                                         |                        |
                                                                     [SQLite]              [Cloudflare Tunnel]
                                                                                                  |
                                                                                            URL publica HTTPS
```

---

## 🚀 Quick start con Docker (recomendado)

Despliega todo con un comando. Obtienes una URL pública HTTPS protegida con contraseña, accesible desde cualquier sitio.

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose en Linux)

### Pasos

```bash
# 1. Clonar y entrar
git clone https://github.com/Rubenbros/microfonoAula.git
cd microfonoAula

# 2. Crear .env a partir de la plantilla
cp env.example .env

# 3. Generar hash de contraseña para el dashboard
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'TU_CONTRASEÑA'
# Copia el hash resultante a BASIC_AUTH_HASH en .env
# IMPORTANTE: duplica cada $ en el hash -> $$ (escape de docker-compose)

# 4. Arrancar todo
docker compose up -d

# 5. Obtener la URL publica del tunnel
docker logs aulas-cloudflared 2>&1 | grep trycloudflare.com
```

Accede a la URL resultante (`https://xxx-yyy-zzz.trycloudflare.com`), introduce usuario y contraseña, y verás el dashboard.

> **Importante sobre la URL**: con el modo "quick tunnel" (gratuito, sin cuenta Cloudflare) **la URL cambia cada vez que reinicias** `cloudflared`. Para URL estable necesitas cuenta Cloudflare gratis + un dominio propio (ver sección "URL estable").

### Comandos útiles

```bash
docker compose up -d          # Arrancar en background
docker compose down           # Parar todo
docker compose logs -f        # Ver logs
docker compose logs -f backend
docker compose restart frontend
docker compose build --no-cache   # Reconstruir imagenes
```

### Persistencia

Los datos de SQLite viven en el volumen `noise_data`. Sobreviven a reinicios y rebuilds.

```bash
docker volume ls             # Ver volumenes
docker volume inspect microfonoaula_noise_data
```

### URL estable (opcional, requiere dominio)

1. Crea cuenta gratis en [cloudflare.com](https://cloudflare.com) y añade tu dominio.
2. Crea un tunnel en el dashboard CF (Zero Trust → Access → Tunnels) y copia el token.
3. Edita `docker-compose.yml` en el servicio `cloudflared`:
   ```yaml
   command: tunnel --no-autoupdate run --token TU_TOKEN_AQUI
   ```
4. En el dashboard CF del tunnel, apunta el hostname a `http://caddy:80`.
5. `docker compose up -d` → URL fija como `https://aulas.tudominio.es`.

---

## Modo desarrollo (sin Docker)

Para trabajar en el código sin Docker necesitas Node.js 18+. El broker MQTT es `broker.hivemq.com` (público), así que no hay que instalar nada más.

| Software | Para qué | Instalación |
|----------|----------|-------------|
| **Node.js 18+** | Backend + Frontend + Simulador | [nodejs.org](https://nodejs.org) |
| **Git** | Clonar el repo | [git-scm.com](https://git-scm.com) |
| **PlatformIO** | Solo si flasheas el micro | [platformio.org](https://platformio.org) (extensión VS Code) |

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

## Opción A: Demo rápida (sin micro real, sin Docker)

Perfecto para desarrollar. El simulador genera datos falsos publicando en HiveMQ.

```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Simulador
cd simulator && node simulate.js --rooms 6

# Terminal 3 - Frontend
cd frontend && npm run dev
```

**Abre http://localhost:3000** → Verás las 6 aulas con datos en tiempo real.

### Script automático (Windows)

```bash
scripts/demo.bat
```

---

## Opción B: Con micrófono real (M5Stack ATOM Echo S3R)

### Paso 1: Configura el firmware

Edita `firmware/src/config.h` con los datos de tu red WiFi:

```c
#define WIFI_SSID     "NombreDeTuWiFi"
#define WIFI_PASSWORD "TuContraseña"
#define MQTT_BROKER   "broker.hivemq.com"   // Broker publico (por defecto)
#define ROOM_ID       "aula_01"              // Nombre identificativo del aula
```

> El broker es público (HiveMQ). Los micros publican en topics `aulas/{ROOM_ID}/{MIC_ID}/noise` y cualquier backend suscrito ve los datos. No hace falta que PC y micros estén en la misma red.

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

### Paso 3: Arranca el sistema

**Con Docker (recomendado, expone URL pública):**
```bash
docker compose up -d
docker logs aulas-cloudflared 2>&1 | grep trycloudflare.com
```

**Sin Docker (solo local):**
```bash
cd backend && npm start    # Terminal 1
cd frontend && npm run dev # Terminal 2
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

## Portabilidad y despliegue

El sistema es totalmente portable gracias a Docker + broker público:

- **Broker:** `broker.hivemq.com` (público) → ni PC ni micros necesitan estar en la misma red.
- **Backend + Frontend + Caddy + Cloudflared:** en Docker → un solo `docker compose up -d`.
- **Exposición pública:** Cloudflare Tunnel → URL HTTPS sin abrir puertos en el router.
- **Autenticación:** Basic auth vía Caddy → el público solo ve el dashboard con usuario/contraseña.
- **Persistencia:** volumen Docker `noise_data` → el histórico sobrevive a reinicios.

Para moverlo a otro PC: `git clone`, `cp env.example .env`, ajustar credenciales, `docker compose up -d`.

---

## Retención de datos (rollup en escalera)

Para que la BBDD no crezca sin control y las queries de histórico largo sigan siendo rápidas, los datos se agregan en tres niveles:

| Tabla | Granularidad | Retención (default) |
|---|---|---|
| `noise_readings` | raw (cada 5s) | 14 días (`RAW_RETENTION_DAYS`) |
| `noise_minute` | 1 minuto (avg/min/max) | 180 días (`MINUTE_RETENTION_DAYS`) |
| `noise_hour` | 1 hora (avg/min/max) | infinita |

Los jobs corren automáticamente en el backend:
- Cada minuto: agrega raw del último minuto cerrado → `noise_minute`.
- Cada 5 min: agrega minute de horas cerradas → `noise_hour`.
- Cada 24 h: borra raw > 14d y minute > 180d.

Al arrancar hace **catch-up** — si el server estuvo parado varios días, procesa todos los buckets pendientes.

**El endpoint `/api/rooms/:id/history` elige tabla automáticamente** según el rango pedido. La respuesta incluye `granularity: "raw" | "minute" | "hour"` para que el frontend sepa la resolución.

Ajusta los días en `.env` si quieres más o menos retención.

## API REST

### Principales

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/rooms` | Lista de aulas con última lectura |
| `GET /api/rooms/:id/history?from=&to=` | Histórico de un aula (granularidad elegida según rango) |
| `GET /api/rooms/:id/mics/:micId/history` | Histórico de un micro concreto |
| `GET /api/rooms/:id/schedule?date=YYYY-MM-DD` | Stats por franjas horarias |
| `GET /api/stats` | Estadísticas generales (últimas 24h) |
| `GET /api/health` | Estado del sistema |

### Comparador

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/meta` | Aulas con datos, mics, cursos disponibles, rango global |
| `POST /api/compare` | Comparador flexible (body: `{series, breakdown}`) |
| `GET /api/compare/rooms?rooms=a,b&from=&to=&breakdown=slot` | Compara aulas en mismo rango |
| `GET /api/compare/days?room=a&dates=2026-04-15,2026-04-16&breakdown=slot` | Compara días en una aula |
| `GET /api/compare/cursos?room=a&cursos=2024-2025,2025-2026&breakdown=day` | Compara cursos en una aula |

**`breakdown`** puede ser `slot` (por franjas horarias del horario escolar), `day` (por día), o vacío (solo summary).

**Ejemplo POST flexible:**
```bash
curl -X POST http://localhost:3001/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "series": [
      {"id":"a","label":"Aula 1 lunes","room":"aula_01","from":1744156800,"to":1744243200},
      {"id":"b","label":"Aula 2 lunes","room":"aula_02","from":1744156800,"to":1744243200}
    ],
    "breakdown": "slot"
  }'
```

Cada serie del response incluye `granularity` (raw/minute/hour), `summary` (avg, min, max, p10/p50/p90, stdDev, pctAbove50/70) y opcionalmente `breakdown` (slots o días).

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
│   └── src/
│       ├── config.h    # ← Configura WiFi y MQTT aquí
│       └── main.cpp
├── backend/            # Servidor Node.js (API + WebSocket + MQTT client)
│   ├── Dockerfile
│   └── src/index.js
├── frontend/           # Dashboard Next.js (standalone output)
│   ├── Dockerfile
│   └── src/
├── caddy/              # Reverse proxy + Basic Auth
│   └── Caddyfile
├── simulator/          # Simulador de datos (sin hardware)
├── scripts/            # Scripts de arranque sin Docker (Windows)
├── docker-compose.yml  # backend + frontend + caddy + cloudflared
├── env.example         # Plantilla de configuracion (renombrar a .env)
└── README.md
```

## Licencia

MIT
