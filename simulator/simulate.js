/**
 * Simulador de Microfonos - Monitor de Ruido en Aulas
 *
 * Simula N aulas enviando datos de ruido por MQTT,
 * con patrones realistas (clase tranquila, debate, recreo, etc.)
 *
 * Uso:
 *   node simulate.js                          # 6 aulas, intervalo 2s
 *   node simulate.js --rooms 10               # 10 aulas
 *   node simulate.js --rooms 8 --interval 1000  # 8 aulas, cada 1s
 *   node simulate.js --broker mqtt://192.168.1.50  # broker remoto
 */

const mqtt = require("mqtt");

// ============================================
// Parsear argumentos
// ============================================
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const BROKER = getArg("broker", "mqtt://localhost");
const NUM_ROOMS = parseInt(getArg("rooms", "6"));
const INTERVAL = parseInt(getArg("interval", "2000"));

// ============================================
// Escenarios de ruido (simulan actividades reales)
// ============================================
const ESCENARIOS = [
    {
        nombre: "Clase tranquila",
        emoji: "📚",
        baseDb: 35,
        variacion: 8,
        picos: { prob: 0.05, extra: 15 },
        duracionMin: 20,
        duracionMax: 45,
    },
    {
        nombre: "Explicacion profesor",
        emoji: "🎓",
        baseDb: 50,
        variacion: 10,
        picos: { prob: 0.08, extra: 12 },
        duracionMin: 10,
        duracionMax: 30,
    },
    {
        nombre: "Trabajo en grupo",
        emoji: "👥",
        baseDb: 58,
        variacion: 12,
        picos: { prob: 0.15, extra: 18 },
        duracionMin: 15,
        duracionMax: 35,
    },
    {
        nombre: "Debate activo",
        emoji: "🗣️",
        baseDb: 65,
        variacion: 10,
        picos: { prob: 0.2, extra: 20 },
        duracionMin: 10,
        duracionMax: 25,
    },
    {
        nombre: "Recreo / Descanso",
        emoji: "🎉",
        baseDb: 72,
        variacion: 15,
        picos: { prob: 0.3, extra: 25 },
        duracionMin: 5,
        duracionMax: 15,
    },
    {
        nombre: "Examen",
        emoji: "📝",
        baseDb: 28,
        variacion: 5,
        picos: { prob: 0.02, extra: 10 },
        duracionMin: 30,
        duracionMax: 60,
    },
    {
        nombre: "Aula vacia",
        emoji: "🏫",
        baseDb: 20,
        variacion: 3,
        picos: { prob: 0.01, extra: 8 },
        duracionMin: 10,
        duracionMax: 60,
    },
];

// ============================================
// Nombres de aulas
// ============================================
const NOMBRES_AULAS = [
    "aula_101", "aula_102", "aula_103", "aula_104", "aula_105",
    "aula_201", "aula_202", "aula_203", "aula_204", "aula_205",
    "lab_informatica", "lab_ciencias", "lab_idiomas",
    "sala_musica", "gimnasio", "biblioteca",
    "salon_actos", "aula_dibujo", "taller_tecnologia", "aula_208",
];

// ============================================
// Estado de cada aula simulada
// ============================================
class AulaSimulada {
    constructor(nombre) {
        this.nombre = nombre;
        this.escenario = null;
        this.ticksRestantes = 0;
        this.peakActual = 0;
        this.dbAnterior = 40;
        this.cambiarEscenario();
    }

    cambiarEscenario() {
        this.escenario = ESCENARIOS[Math.floor(Math.random() * ESCENARIOS.length)];
        // Duracion en ticks (cada tick = INTERVAL ms)
        const duracionSeg = this.escenario.duracionMin +
            Math.random() * (this.escenario.duracionMax - this.escenario.duracionMin);
        this.ticksRestantes = Math.floor((duracionSeg * 1000) / INTERVAL);
        this.peakActual = this.escenario.baseDb;
    }

    generarLectura() {
        this.ticksRestantes--;

        if (this.ticksRestantes <= 0) {
            this.cambiarEscenario();
        }

        const esc = this.escenario;

        // Ruido base + variacion gaussiana
        let db = esc.baseDb + (gaussiano() * esc.variacion);

        // Picos aleatorios (alguien grita, cae algo, etc.)
        let esPico = false;
        if (Math.random() < esc.picos.prob) {
            db += Math.random() * esc.picos.extra;
            esPico = true;
        }

        // Suavizar transiciones (media con valor anterior)
        db = db * 0.7 + this.dbAnterior * 0.3;
        this.dbAnterior = db;

        // Limitar rango realista
        db = Math.max(15, Math.min(110, db));

        // Peak tracking
        if (db > this.peakActual) {
            this.peakActual = db;
        } else {
            // El peak decae lentamente
            this.peakActual = this.peakActual * 0.95 + db * 0.05;
        }

        return {
            room: this.nombre,
            db: parseFloat(db.toFixed(1)),
            peak: parseFloat(Math.max(db, this.peakActual).toFixed(1)),
            timestamp: Math.floor(Date.now() / 1000),
            _escenario: esc.nombre,
            _emoji: esc.emoji,
            _esPico: esPico,
        };
    }
}

// Distribucion gaussiana (Box-Muller)
function gaussiano() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ============================================
// Programa principal
// ============================================
console.log("");
console.log("╔══════════════════════════════════════════════╗");
console.log("║   🎤 Simulador de Ruido en Aulas            ║");
console.log("╠══════════════════════════════════════════════╣");
console.log(`║   Aulas:     ${String(NUM_ROOMS).padEnd(32)}║`);
console.log(`║   Intervalo: ${String(INTERVAL + "ms").padEnd(32)}║`);
console.log(`║   Broker:    ${BROKER.padEnd(32)}║`);
console.log("╚══════════════════════════════════════════════╝");
console.log("");

// Crear aulas
const aulas = [];
for (let i = 0; i < NUM_ROOMS; i++) {
    const nombre = i < NOMBRES_AULAS.length ? NOMBRES_AULAS[i] : `aula_${300 + i}`;
    aulas.push(new AulaSimulada(nombre));
}

// Conectar MQTT
const client = mqtt.connect(BROKER, {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
});

let mensajesEnviados = 0;

client.on("connect", () => {
    console.log("✅ Conectado al broker MQTT");
    console.log("");
    console.log("Enviando datos de ruido... (Ctrl+C para parar)");
    console.log("─".repeat(70));
    console.log("");

    // Enviar datos periodicamente
    setInterval(() => {
        aulas.forEach((aula) => {
            const lectura = aula.generarLectura();
            const topic = `aulas/${lectura.room}/noise`;

            // Payload MQTT (sin campos internos)
            const payload = {
                room: lectura.room,
                db: lectura.db,
                peak: lectura.peak,
                timestamp: lectura.timestamp,
            };

            client.publish(topic, JSON.stringify(payload));
            mensajesEnviados++;

            // Indicador de nivel visual
            const barLength = Math.floor(lectura.db / 3);
            const bar = getColorBar(lectura.db, barLength);
            const picoMark = lectura._esPico ? " ⚡" : "";

            console.log(
                `${lectura._emoji} ${lectura.room.padEnd(18)} ` +
                `${String(lectura.db).padStart(5)} dB ` +
                `${bar} ` +
                `${lectura._escenario.padEnd(20)}${picoMark}`
            );
        });

        // Separador entre rondas
        const hora = new Date().toLocaleTimeString("es-ES");
        console.log(`── ${hora} ── mensajes: ${mensajesEnviados} ${"─".repeat(35)}`);
        console.log("");
    }, INTERVAL);
});

client.on("error", (err) => {
    console.error("❌ Error MQTT:", err.message);
    console.log("");
    console.log("¿Has arrancado el broker MQTT?");
    console.log("  docker-compose up -d mosquitto");
    console.log("");
});

client.on("reconnect", () => {
    console.log("🔄 Reconectando al broker...");
});

// Barra visual con colores ANSI
function getColorBar(db, length) {
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const red = "\x1b[31m";
    const reset = "\x1b[0m";

    let color;
    if (db < 50) color = green;
    else if (db < 70) color = yellow;
    else color = red;

    return color + "█".repeat(Math.min(length, 35)) + reset;
}

// Limpieza
process.on("SIGINT", () => {
    console.log("");
    console.log(`\n📊 Resumen: ${mensajesEnviados} mensajes enviados`);
    client.end();
    process.exit(0);
});
