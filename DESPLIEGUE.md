# Despliegue - Monitor de Ruido en Aulas

## Arquitectura

```
M5Stack ATOM Echo S3R ---> MQTT Broker ---> Backend (Node.js) ---> Frontend (Next.js)
   (mic_01..mic_06)        (Mosquitto)      REST + WebSocket        Dashboard
                                                  |
                                              SQLite DB
```

## Requisitos

| Software   | Version | Para              |
|------------|---------|-------------------|
| Node.js    | 18+     | Backend, Frontend |
| Python     | 3.x     | Flash de micros   |
| PlatformIO | CLI     | Compilar firmware |
| Docker     | -       | Mosquitto (opcional) |

---

## Paso 1: Instalar dependencias

```bash
cd microfonoAula

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd simulator && npm install && cd ..

# Para flashear micros
pip install platformio pyserial
```

---

## Paso 2: Flashear los micros

### Flashear todos con una red WPA2-Personal

```bash
cd firmware
python flash.py --all --wifi SSID PASSWORD
```

El script pide que enchufes cada micro (mic_01 a mic_06) y los flashea uno a uno.

### Flashear uno solo

```bash
python flash.py mic_01 --wifi S25 12345678
python flash.py mic_03 --wifi S25 12345678 --room aula_02
```

### Usar red WPA2-Enterprise (3 parametros)

```bash
python flash.py --all --wifi ENLACES-A204 dam251v password
```

### Otros comandos utiles

```bash
python flash.py --list      # Ver puertos COM disponibles
python flash.py --config    # Ver configuracion actual en config.h
```

---

## Paso 3: Arrancar el broker MQTT

### Opcion A: Docker

```bash
docker compose up -d mosquitto
```

### Opcion B: Instalar Mosquitto directamente

```bash
# Windows
winget install EclipseFoundation.Mosquitto

# Linux
sudo apt install mosquitto && mosquitto -p 1883

# Mac
brew install mosquitto && mosquitto -c /dev/null -p 1883
```

El broker escucha en el puerto **1883** (MQTT) y **9001** (WebSocket).

---

## Paso 4: Arrancar el backend

```bash
cd backend
npm start
```

- API REST en `http://localhost:3001`
- WebSocket en `ws://localhost:3002`
- Crea la base de datos SQLite automaticamente en `backend/data/noise.db`

### Variables de entorno (opcionales, ver `.env.example`)

```bash
MQTT_BROKER=mqtt://localhost
MQTT_PORT=1883
HTTP_PORT=3001
WS_PORT=3002
DB_PATH=./data/noise.db
```

---

## Paso 5: Arrancar el frontend

```bash
cd frontend
npm run dev
```

Abrir **http://localhost:3000** en el navegador.

---

## Inicio rapido (todo a la vez)

### Windows

```bash
scripts/demo.bat
```

Abre 4 terminales (broker, backend, simulador, frontend) y el navegador.

### Linux/Mac

```bash
chmod +x scripts/demo.sh
./scripts/demo.sh
```

---

## Usar el simulador (sin micros fisicos)

```bash
cd simulator
node simulate.js                    # 6 aulas por defecto
node simulate.js --rooms 12         # 12 aulas
node simulate.js --interval 500     # Cada 500ms
```

---

## API del backend

| Endpoint | Descripcion |
|----------|-------------|
| `GET /api/rooms` | Lista de aulas con ultima lectura |
| `GET /api/rooms/:id/history?from=&to=` | Historico de un aula |
| `GET /api/stats` | Estadisticas (ultimas 24h) |
| `GET /api/health` | Estado del sistema |

WebSocket en `ws://localhost:3002` para datos en tiempo real.

---

## Topics MQTT

Los micros publican en:

```
aulas/{ROOM_ID}/{MIC_ID}/noise
```

Payload JSON:

```json
{
  "room": "aula_01",
  "mic": "mic_01",
  "db": 45.2,
  "peak": 67.7,
  "timestamp": 1234567890
}
```

---

## Resolucion de problemas

| Problema | Solucion |
|----------|----------|
| Micro no conecta al WiFi | Verificar SSID/password, comprobar senal |
| `COM port busy` | Cerrar monitor serie o cualquier programa usando el puerto |
| No se detecta el micro | Probar otro cable USB, otro puerto USB |
| Backend no recibe datos | Verificar que el broker MQTT esta corriendo |
| Frontend no muestra datos | Comprobar que el backend esta arrancado |
