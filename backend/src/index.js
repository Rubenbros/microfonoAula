/**
 * Backend - Monitor de Ruido en Aulas
 *
 * Recibe datos MQTT de los microfonos, almacena en SQLite,
 * expone API REST y WebSocket para el frontend.
 * Soporta multiples microfonos por aula.
 */

// Carga .env: primero del backend, luego del repo root como fallback.
require("dotenv").config();
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

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
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";
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

// ============================================
// Rollup en escalera + purgas
// ============================================
const { initRollup } = require("./rollup");
const rollup = initRollup(db);

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

        // Telemetría de batería (solo presente en el central)
        const battery = typeof data.battery === "number" ? data.battery : null;
        const charging = typeof data.charging === "boolean" ? data.charging : null;

        const serverTimestamp = Math.floor(Date.now() / 1000);

        // Guardar en SQLite (batería no se persiste, solo estado en vivo)
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
            ...(battery !== null ? { battery } : {}),
            ...(charging !== null ? { charging } : {}),
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
    console.error("[MQTT] Error:", err.code || err.errno || err.name || "unknown", "-", err.message || String(err));
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

// GET /api/rooms/:id/days?from=YYYY-MM-DD&to=YYYY-MM-DD
// Devuelve avg/max/samples agregado por dia (para heatmap de calendario).
// Rango por defecto: ultimos 35 dias.
app.get("/api/rooms/:id/days", (req, res) => {
    try {
        const roomId = req.params.id;
        const now = Math.floor(Date.now() / 1000);

        // Parse dates: YYYY-MM-DD
        const parseDate = (s) => {
            if (!s) return null;
            const d = new Date(s + "T00:00:00");
            if (isNaN(d.getTime())) return null;
            return Math.floor(d.getTime() / 1000);
        };

        const fromTs = parseDate(req.query.from) || (now - 35 * 86400);
        const toTs = (parseDate(req.query.to) || now) + 86400 - 1; // incluye dia completo

        // Construir spec como si fuera una serie del comparador
        const spec = { room: roomId, from: fromTs, to: toTs };
        const { granularity, days } = compare.computeDayBreakdown(db, spec, retention);

        res.json({
            room: roomId,
            from: new Date(fromTs * 1000).toISOString().slice(0, 10),
            to: new Date(toTs * 1000).toISOString().slice(0, 10),
            granularity,
            days, // [{ day: "2026-04-15", stats: {avg, min, max, maxPeak, samples, buckets} }]
        });
    } catch (err) {
        console.error("[API] Error en /api/rooms/:id/days:", err.message);
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

        const picked = rollup.queryHistory({ room: roomId, mic: null, from, to });
        let readings, granularity;

        if (picked.granularity === "raw") {
            granularity = "raw";
            readings = getRoomHistory.all(roomId, from, to).map((r) => ({
                room: r.room,
                mic: r.mic,
                db: r.db_level,
                peak: r.peak_level,
                timestamp: r.timestamp,
            }));
        } else {
            granularity = picked.granularity;
            readings = picked.rows;
        }

        res.json({ room: roomId, from, to, granularity, count: readings.length, readings });
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

        const picked = rollup.queryHistory({ room: roomId, mic: micId, from, to });
        let readings, granularity;

        if (picked.granularity === "raw") {
            granularity = "raw";
            readings = getHistory.all(roomId, micId, from, to).map((r) => ({
                room: r.room,
                mic: r.mic,
                db: r.db_level,
                peak: r.peak_level,
                timestamp: r.timestamp,
            }));
        } else {
            granularity = picked.granularity;
            readings = picked.rows;
        }

        res.json({ room: roomId, mic: micId, from, to, granularity, count: readings.length, readings });
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

// Prepared statement for slot stats (raw data, reciente)
const getSlotStatsRaw = db.prepare(`
    SELECT
        COUNT(*) as readings,
        ROUND(AVG(db_level), 1) as avg_db,
        ROUND(MAX(db_level), 1) as max_db,
        ROUND(MIN(db_level), 1) as min_db,
        ROUND(MAX(peak_level), 1) as max_peak
    FROM noise_readings
    WHERE room = ? AND timestamp >= ? AND timestamp <= ?
`);

const getSlotPercentilesRaw = db.prepare(`
    SELECT db_level FROM noise_readings
    WHERE room = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY db_level ASC
`);

// Equivalentes sobre minute aggregates (para fechas > 14 dias)
const getSlotStatsMinute = db.prepare(`
    SELECT
        SUM(sample_count) as readings,
        ROUND(SUM(avg_db * sample_count) / SUM(sample_count), 1) as avg_db,
        ROUND(MAX(max_db), 1) as max_db,
        ROUND(MIN(min_db), 1) as min_db,
        ROUND(MAX(max_peak), 1) as max_peak
    FROM noise_minute
    WHERE room = ? AND bucket_ts >= ? AND bucket_ts <= ?
`);

const getSlotPercentilesMinute = db.prepare(`
    SELECT avg_db as db_level FROM noise_minute
    WHERE room = ? AND bucket_ts >= ? AND bucket_ts <= ?
    ORDER BY avg_db ASC
`);

function getSlotSource(endTs) {
    const now = Math.floor(Date.now() / 1000);
    const rawCutoff = now - rollup.RAW_RETENTION_DAYS * 86400;
    return endTs >= rawCutoff ? "raw" : "minute";
}

function querySlotStats(roomId, startTs, endTs) {
    const source = getSlotSource(endTs);
    const statsStmt = source === "raw" ? getSlotStatsRaw : getSlotStatsMinute;
    const pctStmt = source === "raw" ? getSlotPercentilesRaw : getSlotPercentilesMinute;
    return {
        source,
        stats: statsStmt.get(roomId, startTs, endTs),
        rows: pctStmt.all(roomId, startTs, endTs),
    };
}

app.get("/api/rooms/:id/schedule", (req, res) => {
    try {
        const roomId = req.params.id;
        const dateStr = req.query.date || null; // "2026-03-24" or today

        const slots = SCHEDULE_SLOTS.map(slot => {
            const { startTs, endTs } = getSlotTimestamps(slot, dateStr);
            const { source, stats, rows } = querySlotStats(roomId, startTs, endTs);

            let p10 = null, p50 = null, p90 = null, stdDev = null;
            let timeAbove70 = 0, timeAbove50 = 0;

            if (stats && stats.readings > 0 && rows.length > 0) {
                const values = rows.map(r => r.db_level);
                const n = values.length;
                p10 = values[Math.floor(n * 0.1)] || values[0];
                p50 = values[Math.floor(n * 0.5)] || values[0];
                p90 = values[Math.floor(n * 0.9)] || values[n - 1];

                const mean = values.reduce((a, b) => a + b, 0) / n;
                stdDev = Math.round(Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n) * 10) / 10;

                timeAbove70 = Math.round((values.filter(v => v > 70).length / n) * 100);
                timeAbove50 = Math.round((values.filter(v => v > 50).length / n) * 100);
            }

            const now = Math.floor(Date.now() / 1000);
            const active = now >= startTs && now <= endTs;

            return {
                ...slot,
                startTs,
                endTs,
                active,
                source, // "raw" | "minute" - util para saber la precision
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

// ============================================
// Comparador de series
// ============================================
const compare = require("./compare");

const retention = {
    rawDays: rollup.RAW_RETENTION_DAYS,
    minuteDays: rollup.MINUTE_RETENTION_DAYS,
};

// GET /api/meta - aulas con datos + cursos disponibles + rango global
app.get("/api/meta", (req, res) => {
    try {
        res.json(compare.getMeta(db));
    } catch (err) {
        console.error("[API] Error en /api/meta:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Helper: ejecuta una serie con breakdown opcional
function runSeries(spec, breakdown) {
    const result = {
        id: spec.id,
        label: spec.label || spec.id,
        room: spec.room,
        mic: spec.mic || null,
        from: spec.from,
        to: spec.to,
    };
    const stats = compare.computeSeriesStats(db, spec, retention);
    result.granularity = stats.granularity;
    result.summary = stats.summary;

    if (breakdown === "slot") {
        result.breakdown = compare.computeSlotBreakdown(db, spec, retention, SCHEDULE_SLOTS);
    } else if (breakdown === "day") {
        result.breakdown = compare.computeDayBreakdown(db, spec, retention);
    }
    return result;
}

// Validacion basica de una serie
function validateSeries(s, idx) {
    if (!s || typeof s !== "object") throw new Error(`series[${idx}] invalida`);
    if (!s.room || typeof s.room !== "string") throw new Error(`series[${idx}].room requerido`);
    const from = parseInt(s.from);
    const to = parseInt(s.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error(`series[${idx}].from/to deben ser timestamps unix`);
    if (from >= to) throw new Error(`series[${idx}]: from debe ser < to`);
    return { id: s.id || `s${idx}`, label: s.label, room: s.room, mic: s.mic || null, from, to };
}

// POST /api/compare - endpoint flexible
// Body: { series: [...], breakdown?: "slot" | "day" }
app.post("/api/compare", (req, res) => {
    try {
        const { series, breakdown } = req.body || {};
        if (!Array.isArray(series) || series.length === 0) {
            return res.status(400).json({ error: "series debe ser array no vacio" });
        }
        if (series.length > 12) {
            return res.status(400).json({ error: "maximo 12 series por request" });
        }
        const validBreakdowns = [null, undefined, "none", "slot", "day"];
        if (!validBreakdowns.includes(breakdown)) {
            return res.status(400).json({ error: `breakdown debe ser uno de: slot, day, none` });
        }

        const specs = series.map((s, i) => validateSeries(s, i));
        const results = specs.map(spec => runSeries(spec, breakdown));
        res.json({ series: results });
    } catch (err) {
        console.error("[API] Error en /api/compare:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/compare/rooms?rooms=aula_01,aula_02&from=&to=&breakdown=slot
// Compara aulas en mismo rango temporal
app.get("/api/compare/rooms", (req, res) => {
    try {
        const rooms = (req.query.rooms || "").split(",").map(s => s.trim()).filter(Boolean);
        if (rooms.length === 0) return res.status(400).json({ error: "rooms es requerido" });
        const now = Math.floor(Date.now() / 1000);
        const from = parseInt(req.query.from) || now - 86400;
        const to = parseInt(req.query.to) || now;
        const breakdown = req.query.breakdown || null;

        const specs = rooms.map((room, i) => ({
            id: room,
            label: room,
            room,
            from, to,
        }));
        const results = specs.map(spec => runSeries(spec, breakdown));
        res.json({ series: results });
    } catch (err) {
        console.error("[API] Error en /api/compare/rooms:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/compare/days?room=aula_01&dates=2026-04-15,2026-04-16&breakdown=slot
// Compara la misma aula en distintos dias (YYYY-MM-DD)
app.get("/api/compare/days", (req, res) => {
    try {
        const room = req.query.room;
        if (!room) return res.status(400).json({ error: "room es requerido" });
        const dates = (req.query.dates || "").split(",").map(s => s.trim()).filter(Boolean);
        if (dates.length === 0) return res.status(400).json({ error: "dates es requerido (YYYY-MM-DD,YYYY-MM-DD)" });
        const breakdown = req.query.breakdown || null;
        const mic = req.query.mic || null;

        const specs = dates.map(date => {
            const { startTs, endTs } = compare.dayRangeFromDateStr(date);
            return {
                id: date,
                label: `${room} — ${date}`,
                room, mic,
                from: startTs,
                to: endTs,
            };
        });
        const results = specs.map(spec => runSeries(spec, breakdown));
        res.json({ series: results });
    } catch (err) {
        console.error("[API] Error en /api/compare/days:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/compare/cursos?room=aula_01&cursos=2024-2025,2025-2026&breakdown=day
// Compara la misma aula en distintos cursos escolares
app.get("/api/compare/cursos", (req, res) => {
    try {
        const room = req.query.room;
        if (!room) return res.status(400).json({ error: "room es requerido" });
        const cursos = (req.query.cursos || "").split(",").map(s => s.trim()).filter(Boolean);
        if (cursos.length === 0) return res.status(400).json({ error: "cursos es requerido (YYYY-YYYY,YYYY-YYYY)" });
        const breakdown = req.query.breakdown || null;
        const mic = req.query.mic || null;

        const specs = cursos.map(cursoId => {
            const c = compare.cursoToRange(cursoId);
            return {
                id: cursoId,
                label: `${room} — ${c.label}`,
                room, mic,
                from: c.startTs,
                to: c.endTs,
            };
        });
        const results = specs.map(spec => runSeries(spec, breakdown));
        res.json({ series: results });
    } catch (err) {
        console.error("[API] Error en /api/compare/cursos:", err.message);
        res.status(400).json({ error: err.message });
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
