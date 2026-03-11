/**
 * Backend - Monitor de Ruido en Aulas
 *
 * Recibe datos MQTT de los microfonos, almacena en SQLite,
 * expone API REST y WebSocket para el frontend.
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
const USE_INTERNAL_BROKER = process.env.USE_INTERNAL_BROKER !== "false";
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

// ============================================
// Base de datos SQLite
// ============================================
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Optimizaciones SQLite
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// Crear tabla si no existe
db.exec(`
    CREATE TABLE IF NOT EXISTS noise_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL,
        db_level REAL NOT NULL,
        peak_level REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
`);

// Indice para consultas por aula y tiempo
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_room_timestamp
    ON noise_readings (room, timestamp DESC)
`);

console.log("[DB] Base de datos SQLite inicializada");

// Prepared statements para rendimiento
const insertReading = db.prepare(`
    INSERT INTO noise_readings (room, db_level, peak_level, timestamp)
    VALUES (?, ?, ?, ?)
`);

const getLatestByRoom = db.prepare(`
    SELECT room, db_level, peak_level, timestamp, created_at
    FROM noise_readings
    WHERE room = ?
    ORDER BY timestamp DESC
    LIMIT 1
`);

const getAllRooms = db.prepare(`
    SELECT DISTINCT room FROM noise_readings ORDER BY room
`);

const getHistory = db.prepare(`
    SELECT id, room, db_level, peak_level, timestamp, created_at
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
// Estado en memoria (ultima lectura por aula)
// ============================================
const latestReadings = new Map();

// ============================================
// WebSocket Server
// ============================================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
    console.log("[WS] Cliente conectado");

    // Enviar estado actual al conectarse
    const currentState = Object.fromEntries(latestReadings);
    ws.send(JSON.stringify({
        type: "init",
        data: currentState,
    }));

    ws.on("close", () => {
        console.log("[WS] Cliente desconectado");
    });
});

function broadcastToClients(data) {
    const message = JSON.stringify({
        type: "update",
        data,
    });

    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
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

    // Suscribirse a todos los topics de ruido de aulas
    mqttClient.subscribe("aulas/+/noise", (err) => {
        if (err) {
            console.error("[MQTT] Error al suscribirse:", err);
        } else {
            console.log("[MQTT] Suscrito a aulas/+/noise");
        }
    });
});

mqttClient.on("message", (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        const { room, db: dbLevel, peak, timestamp } = data;

        if (!room || dbLevel === undefined) {
            console.warn("[MQTT] Mensaje invalido:", data);
            return;
        }

        // Usar timestamp del servidor si el del dispositivo es uptime
        const serverTimestamp = Math.floor(Date.now() / 1000);

        // Guardar en SQLite
        insertReading.run(room, dbLevel, peak || dbLevel, serverTimestamp);

        // Actualizar estado en memoria
        const reading = {
            room,
            db: dbLevel,
            peak: peak || dbLevel,
            timestamp: serverTimestamp,
        };
        latestReadings.set(room, reading);

        // Enviar a clientes WebSocket
        broadcastToClients(reading);

        console.log(`[MQTT] ${room}: ${dbLevel} dB (pico: ${peak || dbLevel} dB)`);
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

// CORS para desarrollo
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.json());

// GET /api/rooms - Lista de aulas con ultima lectura
app.get("/api/rooms", (req, res) => {
    try {
        const rooms = getAllRooms.all();
        const result = rooms.map((r) => {
            // Priorizar dato en memoria, si no buscar en DB
            const cached = latestReadings.get(r.room);
            if (cached) {
                return cached;
            }
            const latest = getLatestByRoom.get(r.room);
            return latest
                ? {
                    room: latest.room,
                    db: latest.db_level,
                    peak: latest.peak_level,
                    timestamp: latest.timestamp,
                }
                : { room: r.room, db: 0, peak: 0, timestamp: 0 };
        });

        res.json({ rooms: result });
    } catch (err) {
        console.error("[API] Error en /api/rooms:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/rooms/:id/history - Historico de un aula
app.get("/api/rooms/:id/history", (req, res) => {
    try {
        const roomId = req.params.id;
        const now = Math.floor(Date.now() / 1000);
        const from = parseInt(req.query.from) || now - 3600;   // Ultima hora por defecto
        const to = parseInt(req.query.to) || now;

        const readings = getHistory.all(roomId, from, to);
        const result = readings.map((r) => ({
            id: r.id,
            room: r.room,
            db: r.db_level,
            peak: r.peak_level,
            timestamp: r.timestamp,
        }));

        res.json({
            room: roomId,
            from,
            to,
            count: result.length,
            readings: result,
        });
    } catch (err) {
        console.error("[API] Error en /api/rooms/:id/history:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/stats - Estadisticas generales
app.get("/api/stats", (req, res) => {
    try {
        const now = Math.floor(Date.now() / 1000);
        const since = parseInt(req.query.since) || now - 86400; // Ultimas 24h

        const stats = getStats.get(since);
        const activeRooms = latestReadings.size;

        // Calcular aulas por encima de umbral
        let roomsAboveThreshold = 0;
        latestReadings.forEach((reading) => {
            if (reading.db > 70) roomsAboveThreshold++;
        });

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
