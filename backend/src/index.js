/**
 * Backend - Monitor de Ruido en Aulas
 *
 * Recibe datos MQTT de los microfonos, almacena en SQLite,
 * expone API REST y WebSocket para el frontend.
 * Soporta multiples microfonos por aula.
 */

require("dotenv").config();

const express = require("express");
const mqtt = require("mqtt");
const { WebSocketServer } = require("ws");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ============================================
// Configuracion
// ============================================
const USE_INTERNAL_BROKER = process.env.USE_INTERNAL_BROKER === "true";
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost";
const MQTT_PORT = parseInt(process.env.MQTT_PORT || "1883");

// ============================================
// Broker MQTT integrado (arranca si no hay externo)
// ============================================
if (USE_INTERNAL_BROKER) {
    try {
        require("./broker");
    } catch (err) {
        console.log("[BROKER] Broker integrado no disponible, usando externo:", MQTT_BROKER);
    }
}
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3001");
const WS_PORT = parseInt(process.env.WS_PORT || "3002");
const DB_PATH = process.env.DB_PATH || "./data/noise.db";

// Timeout para considerar un mic offline (15s)
const MIC_OFFLINE_TIMEOUT = 15000;

// ============================================
// Calibracion por micro (offset en dB)
// Positivo = el micro lee de mas, se le resta
// Ejemplo: mic_central lee +7 dB de mas -> poner 7.0
// ============================================
const MIC_CALIBRATION = {
    "mic_central": 7.0,
};

function applyCalibration(mic, dbValue) {
    const offset = MIC_CALIBRATION[mic] || 0;
    return Math.round((dbValue - offset) * 10) / 10;
}

function median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================
// Base de datos SQLite
// ============================================
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// Crear tabla con soporte para mic
db.exec(`
    CREATE TABLE IF NOT EXISTS noise_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL,
        mic TEXT NOT NULL DEFAULT 'mic_01',
        db_level REAL NOT NULL,
        peak_level REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
`);

// Migrar tabla existente si no tiene columna mic
try {
    db.exec(`ALTER TABLE noise_readings ADD COLUMN mic TEXT NOT NULL DEFAULT 'mic_01'`);
    console.log("[DB] Columna 'mic' añadida a tabla existente");
} catch (e) {
    // Ya existe, ignorar
}

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_room_mic_timestamp
    ON noise_readings (room, mic, timestamp DESC)
`);

console.log("[DB] Base de datos SQLite inicializada");

// Prepared statements
const insertReading = db.prepare(`
    INSERT INTO noise_readings (room, mic, db_level, peak_level, timestamp)
    VALUES (?, ?, ?, ?, ?)
`);

const getHistory = db.prepare(`
    SELECT id, room, mic, db_level, peak_level, timestamp, created_at
    FROM noise_readings
    WHERE room = ? AND mic = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
`);

const getRoomHistory = db.prepare(`
    SELECT id, room, mic, db_level, peak_level, timestamp, created_at
    FROM noise_readings
    WHERE room = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
`);

const getStats = db.prepare(`
    SELECT
        COUNT(DISTINCT room) as total_rooms,
        COUNT(*) as total_readings,
        ROUND(AVG(db_level), 1) as avg_db,
        ROUND(MAX(db_level), 1) as max_db,
        ROUND(MIN(db_level), 1) as min_db
    FROM noise_readings
    WHERE timestamp >= ?
`);

// ============================================
// Estado en memoria: room -> Map<mic, reading>
// ============================================
const latestReadings = new Map();

function getRoomSummary(room) {
    const mics = latestReadings.get(room);
    if (!mics || mics.size === 0) return null;

    const now = Date.now();
    const micArray = [...mics.values()].map(m => ({
        ...m,
        online: (now - m._lastSeen) < MIC_OFFLINE_TIMEOUT,
    }));

    const onlineMics = micArray.filter(m => m.online);
    const medianDb = onlineMics.length > 0
        ? median(onlineMics.map(m => m.db))
        : 0;
    const maxPeak = onlineMics.length > 0
        ? Math.max(...onlineMics.map(m => m.peak))
        : 0;

    return {
        room,
        db: Math.round(medianDb * 10) / 10,
        peak: Math.round(maxPeak * 10) / 10,
        micCount: micArray.length,
        onlineCount: onlineMics.length,
        mics: micArray.map(({ _lastSeen, ...rest }) => rest),
    };
}

function getAllRoomSummaries() {
    const summaries = {};
    for (const room of latestReadings.keys()) {
        summaries[room] = getRoomSummary(room);
    }
    return summaries;
}

// ============================================
// WebSocket Server
// ============================================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
    console.log("[WS] Cliente conectado");

    ws.send(JSON.stringify({
        type: "init",
        data: getAllRoomSummaries(),
    }));

    ws.on("close", () => {
        console.log("[WS] Cliente desconectado");
    });
});

function broadcastRoomUpdate(room) {
    const summary = getRoomSummary(room);
    if (!summary) return;

    const message = JSON.stringify({
        type: "room_update",
        data: summary,
    });

    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

function broadcastMicUpdate(reading) {
    const message = JSON.stringify({
        type: "mic_update",
        data: reading,
    });

    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

console.log(`[WS] Servidor WebSocket en puerto ${WS_PORT}`);

// ============================================
// Cliente MQTT
// ============================================
const mqttClient = mqtt.connect(MQTT_BROKER, {
    port: MQTT_PORT,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
});

mqttClient.on("connect", () => {
    console.log("[MQTT] Conectado al broker");

    // Suscribirse a ambos formatos de topic (legacy y nuevo)
    mqttClient.subscribe("aulas/+/+/noise", (err) => {
        if (err) console.error("[MQTT] Error suscripcion nuevo formato:", err);
        else console.log("[MQTT] Suscrito a aulas/+/+/noise");
    });

    mqttClient.subscribe("aulas/+/noise", (err) => {
        if (err) console.error("[MQTT] Error suscripcion legacy:", err);
        else console.log("[MQTT] Suscrito a aulas/+/noise (legacy)");
    });
});

mqttClient.on("message", (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        const parts = topic.split("/");

        // Detectar formato: aulas/{room}/{mic}/noise o aulas/{room}/noise
        let room, mic;
        if (parts.length === 4 && parts[3] === "noise") {
            room = parts[1];
            mic = parts[2];
        } else if (parts.length === 3 && parts[2] === "noise") {
            room = parts[1];
            mic = data.mic || "mic_01";
        } else {
            return;
        }

        const dbLevel = applyCalibration(mic, data.db);
        const peak = applyCalibration(mic, data.peak || data.db);

        if (!room || dbLevel === undefined) {
            console.warn("[MQTT] Mensaje invalido:", data);
            return;
        }

        const serverTimestamp = Math.floor(Date.now() / 1000);

        // Guardar en SQLite
        insertReading.run(room, mic, dbLevel, peak, serverTimestamp);

        // Actualizar estado en memoria
        if (!latestReadings.has(room)) {
            latestReadings.set(room, new Map());
        }

        const reading = {
            room,
            mic,
            db: dbLevel,
            peak,
            timestamp: serverTimestamp,
            online: true,
        };

        latestReadings.get(room).set(mic, {
            ...reading,
            _lastSeen: Date.now(),
        });

        // Broadcast a clientes WebSocket
        broadcastMicUpdate(reading);
        broadcastRoomUpdate(room);

        console.log(`[MQTT] ${room}/${mic}: ${dbLevel} dB (pico: ${peak} dB)`);
    } catch (err) {
        console.error("[MQTT] Error procesando mensaje:", err.message);
    }
});

mqttClient.on("error", (err) => {
    console.error("[MQTT] Error:", err.message);
});

mqttClient.on("reconnect", () => {
    console.log("[MQTT] Reconectando...");
});

// ============================================
// API REST con Express
// ============================================
const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.json());

// GET /api/rooms - Lista de aulas con resumen
app.get("/api/rooms", (req, res) => {
    try {
        const summaries = getAllRoomSummaries();
        const rooms = Object.values(summaries).filter(Boolean);
        res.json({ rooms });
    } catch (err) {
        console.error("[API] Error en /api/rooms:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/rooms/:id - Detalle de un aula con todos sus mics
app.get("/api/rooms/:id", (req, res) => {
    try {
        const roomId = req.params.id;
        const summary = getRoomSummary(roomId);
        if (!summary) {
            return res.status(404).json({ error: "Aula no encontrada" });
        }
        res.json(summary);
    } catch (err) {
        console.error("[API] Error en /api/rooms/:id:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/rooms/:id/history - Historico de un aula (todos los mics)
app.get("/api/rooms/:id/history", (req, res) => {
    try {
        const roomId = req.params.id;
        const now = Math.floor(Date.now() / 1000);
        const from = parseInt(req.query.from) || now - 3600;
        const to = parseInt(req.query.to) || now;

        const readings = getRoomHistory.all(roomId, from, to);
        const result = readings.map((r) => ({
            id: r.id,
            room: r.room,
            mic: r.mic,
            db: r.db_level,
            peak: r.peak_level,
            timestamp: r.timestamp,
        }));

        res.json({ room: roomId, from, to, count: result.length, readings: result });
    } catch (err) {
        console.error("[API] Error en /api/rooms/:id/history:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/rooms/:id/mics/:micId/history - Historico de un micro especifico
app.get("/api/rooms/:id/mics/:micId/history", (req, res) => {
    try {
        const { id: roomId, micId } = req.params;
        const now = Math.floor(Date.now() / 1000);
        const from = parseInt(req.query.from) || now - 3600;
        const to = parseInt(req.query.to) || now;

        const readings = getHistory.all(roomId, micId, from, to);
        const result = readings.map((r) => ({
            id: r.id,
            room: r.room,
            mic: r.mic,
            db: r.db_level,
            peak: r.peak_level,
            timestamp: r.timestamp,
        }));

        res.json({ room: roomId, mic: micId, from, to, count: result.length, readings: result });
    } catch (err) {
        console.error("[API] Error en mic history:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/stats - Estadisticas generales
app.get("/api/stats", (req, res) => {
    try {
        const now = Math.floor(Date.now() / 1000);
        const since = parseInt(req.query.since) || now - 86400;

        const stats = getStats.get(since);
        const activeRooms = latestReadings.size;

        let roomsAboveThreshold = 0;
        for (const room of latestReadings.keys()) {
            const summary = getRoomSummary(room);
            if (summary && summary.db > 70) roomsAboveThreshold++;
        }

        res.json({
            total_rooms: stats.total_rooms,
            active_rooms: activeRooms,
            total_readings: stats.total_readings,
            avg_db: stats.avg_db || 0,
            max_db: stats.max_db || 0,
            min_db: stats.min_db || 0,
            rooms_above_threshold: roomsAboveThreshold,
            since,
        });
    } catch (err) {
        console.error("[API] Error en /api/stats:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ============================================
// GET /api/rooms/:id/schedule - Estadisticas por franjas horarias
// ============================================
const SCHEDULE_SLOTS = [
    { id: "clase_1",  label: "1a Clase",  start: "08:30", end: "09:20", type: "class" },
    { id: "clase_2",  label: "2a Clase",  start: "09:25", end: "10:15", type: "class" },
    { id: "clase_3",  label: "3a Clase",  start: "10:20", end: "11:10", type: "class" },
    { id: "recreo_1", label: "Recreo",    start: "11:10", end: "11:40", type: "break" },
    { id: "clase_4",  label: "4a Clase",  start: "11:40", end: "12:30", type: "class" },
    { id: "clase_5",  label: "5a Clase",  start: "12:35", end: "13:25", type: "class" },
    { id: "clase_6",  label: "6a Clase",  start: "13:30", end: "14:20", type: "class" },
    { id: "clase_7",  label: "7a Clase",  start: "15:30", end: "16:20", type: "class" },
    { id: "clase_8",  label: "8a Clase",  start: "16:25", end: "17:15", type: "class" },
    { id: "clase_9",  label: "9a Clase",  start: "17:20", end: "18:10", type: "class" },
    { id: "recreo_2", label: "Recreo",    start: "18:10", end: "18:30", type: "break" },
    { id: "clase_10", label: "10a Clase", start: "18:30", end: "19:20", type: "class" },
    { id: "clase_11", label: "11a Clase", start: "19:25", end: "20:15", type: "class" },
    { id: "clase_12", label: "12a Clase", start: "20:20", end: "21:10", type: "class" },
];

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function getSlotTimestamps(slot, dateStr) {
    // dateStr = "2026-03-24" or null for today
    const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
    if (!dateStr) {
        base.setHours(0, 0, 0, 0);
    }
    const [sh, sm] = slot.start.split(":").map(Number);
    const [eh, em] = slot.end.split(":").map(Number);
    const startTs = Math.floor(new Date(base.getTime() + (sh * 60 + sm) * 60000).getTime() / 1000);
    const endTs = Math.floor(new Date(base.getTime() + (eh * 60 + em) * 60000).getTime() / 1000);
    return { startTs, endTs };
}

// Prepared statement for slot stats
const getSlotStats = db.prepare(`
    SELECT
        COUNT(*) as readings,
        ROUND(AVG(db_level), 1) as avg_db,
        ROUND(MAX(db_level), 1) as max_db,
        ROUND(MIN(db_level), 1) as min_db,
        ROUND(MAX(peak_level), 1) as max_peak
    FROM noise_readings
    WHERE room = ? AND timestamp >= ? AND timestamp <= ?
`);

const getSlotPercentiles = db.prepare(`
    SELECT db_level FROM noise_readings
    WHERE room = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY db_level ASC
`);

app.get("/api/rooms/:id/schedule", (req, res) => {
    try {
        const roomId = req.params.id;
        const dateStr = req.query.date || null; // "2026-03-24" or today

        const slots = SCHEDULE_SLOTS.map(slot => {
            const { startTs, endTs } = getSlotTimestamps(slot, dateStr);
            const stats = getSlotStats.get(roomId, startTs, endTs);

            let p10 = null, p50 = null, p90 = null, stdDev = null;
            if (stats && stats.readings > 0) {
                const rows = getSlotPercentiles.all(roomId, startTs, endTs);
                const values = rows.map(r => r.db_level);
                const n = values.length;
                p10 = values[Math.floor(n * 0.1)] || values[0];
                p50 = values[Math.floor(n * 0.5)] || values[0];
                p90 = values[Math.floor(n * 0.9)] || values[n - 1];

                const mean = values.reduce((a, b) => a + b, 0) / n;
                stdDev = Math.round(Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n) * 10) / 10;
            }

            // Determine if slot is currently active
            const now = Math.floor(Date.now() / 1000);
            const active = now >= startTs && now <= endTs;

            // Time above thresholds
            let timeAbove70 = 0, timeAbove50 = 0;
            if (stats && stats.readings > 0) {
                const rows = getSlotPercentiles.all(roomId, startTs, endTs);
                timeAbove70 = Math.round((rows.filter(r => r.db_level > 70).length / rows.length) * 100);
                timeAbove50 = Math.round((rows.filter(r => r.db_level > 50).length / rows.length) * 100);
            }

            return {
                ...slot,
                startTs,
                endTs,
                active,
                stats: stats && stats.readings > 0 ? {
                    readings: stats.readings,
                    avg: stats.avg_db,
                    max: stats.max_db,
                    min: stats.min_db,
                    maxPeak: stats.max_peak,
                    p10, p50, p90,
                    stdDev,
                    pctAbove50: timeAbove50,
                    pctAbove70: timeAbove70,
                } : null,
            };
        });

        // Day-wide summary (only within schedule slots)
        const allSlotStats = slots.filter(s => s.stats);
        const dayAvg = allSlotStats.length > 0
            ? Math.round(allSlotStats.reduce((s, sl) => s + sl.stats.avg * sl.stats.readings, 0)
                / allSlotStats.reduce((s, sl) => s + sl.stats.readings, 0) * 10) / 10
            : null;
        const dayMax = allSlotStats.length > 0
            ? Math.max(...allSlotStats.map(s => s.stats.max))
            : null;
        const dayMin = allSlotStats.length > 0
            ? Math.min(...allSlotStats.map(s => s.stats.min))
            : null;
        const totalReadings = allSlotStats.reduce((s, sl) => s + sl.stats.readings, 0);

        // Noisiest and quietest slot
        const classSlots = allSlotStats.filter(s => s.type === "class");
        const noisiest = classSlots.length > 0
            ? classSlots.reduce((a, b) => a.stats.avg > b.stats.avg ? a : b).id
            : null;
        const quietest = classSlots.length > 0
            ? classSlots.reduce((a, b) => a.stats.avg < b.stats.avg ? a : b).id
            : null;

        res.json({
            room: roomId,
            date: dateStr || new Date().toISOString().split("T")[0],
            totalReadings,
            daySummary: { avg: dayAvg, max: dayMax, min: dayMin },
            noisiest,
            quietest,
            slots,
        });
    } catch (err) {
        console.error("[API] Error en /api/rooms/:id/schedule:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        mqtt: mqttClient.connected,
        uptime: process.uptime(),
    });
});

// Iniciar servidor HTTP
app.listen(HTTP_PORT, () => {
    console.log(`[HTTP] Servidor API en http://localhost:${HTTP_PORT}`);
    console.log("");
    console.log("============================================");
    console.log("  Monitor de Ruido - Backend iniciado");
    console.log(`  API:       http://localhost:${HTTP_PORT}`);
    console.log(`  WebSocket: ws://localhost:${WS_PORT}`);
    console.log(`  MQTT:      ${MQTT_BROKER}:${MQTT_PORT}`);
    console.log("============================================");
});

// ============================================
// Chequeo periodico de mics offline
// ============================================
setInterval(() => {
    const now = Date.now();
    for (const [room, mics] of latestReadings.entries()) {
        let changed = false;
        for (const [mic, data] of mics.entries()) {
            const wasOnline = (now - data._lastSeen) < MIC_OFFLINE_TIMEOUT + 1000;
            const isOnline = (now - data._lastSeen) < MIC_OFFLINE_TIMEOUT;
            if (wasOnline !== isOnline || !isOnline) {
                changed = true;
            }
        }
        if (changed) {
            broadcastRoomUpdate(room);
        }
    }
}, 5000);

// ============================================
// Limpieza al cerrar
// ============================================
process.on("SIGINT", () => {
    console.log("\n[SISTEMA] Cerrando...");
    mqttClient.end();
    db.close();
    wss.close();
    process.exit(0);
});

process.on("SIGTERM", () => {
    mqttClient.end();
    db.close();
    wss.close();
    process.exit(0);
});
