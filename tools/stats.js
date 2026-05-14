/* eslint-disable no-console */
const path = require("path");
const Database = require(path.join(__dirname, "..", "backend", "node_modules", "better-sqlite3"));

const DB_PATH = path.join(__dirname, "..", "backend", "data", "noise.db");
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
db.pragma("journal_mode = WAL");

const out = {};
const log = (k, v) => { out[k] = v; };

const fmtTs = (s) => s ? new Date(s * 1000).toISOString() : null;

// Esquema y volumen
log("schema", db.prepare("PRAGMA table_info(noise_readings)").all());
log("total_rows", db.prepare("SELECT COUNT(*) AS n FROM noise_readings").get().n);

const range = db.prepare("SELECT MIN(timestamp) AS min_ts, MAX(timestamp) AS max_ts FROM noise_readings").get();
log("ts_min", fmtTs(range.min_ts));
log("ts_max", fmtTs(range.max_ts));
log("ts_span_days", range.max_ts && range.min_ts ? (range.max_ts - range.min_ts) / 86400 : null);

// Aulas y micros distintos
log("rooms", db.prepare("SELECT room, COUNT(*) AS n FROM noise_readings GROUP BY room ORDER BY n DESC").all());
log("mics_global", db.prepare("SELECT mic, COUNT(*) AS n FROM noise_readings GROUP BY mic ORDER BY n DESC").all());
log("room_mic_combo", db.prepare("SELECT room, mic, COUNT(*) AS n, MIN(timestamp) AS first_ts, MAX(timestamp) AS last_ts FROM noise_readings GROUP BY room, mic ORDER BY room, mic").all());

// Estadísticos globales de db_level
const stats = db.prepare(`
    SELECT
        AVG(db_level) AS mean,
        MIN(db_level) AS min,
        MAX(db_level) AS max,
        AVG(peak_level) AS peak_mean,
        MAX(peak_level) AS peak_max
    FROM noise_readings
`).get();
log("global_stats", stats);

// Percentiles (con SQL puro: ordenar y elegir por offset)
function percentile(p) {
    const total = out.total_rows;
    if (!total) return null;
    const offset = Math.floor((total - 1) * p);
    const row = db.prepare("SELECT db_level FROM noise_readings ORDER BY db_level ASC LIMIT 1 OFFSET ?").get(offset);
    return row ? row.db_level : null;
}
log("percentiles_db", {
    p05: percentile(0.05),
    p10: percentile(0.10),
    p25: percentile(0.25),
    p50: percentile(0.50),
    p75: percentile(0.75),
    p90: percentile(0.90),
    p95: percentile(0.95),
    p99: percentile(0.99),
});

function percentilePeak(p) {
    const total = out.total_rows;
    if (!total) return null;
    const offset = Math.floor((total - 1) * p);
    const row = db.prepare("SELECT peak_level FROM noise_readings ORDER BY peak_level ASC LIMIT 1 OFFSET ?").get(offset);
    return row ? row.peak_level : null;
}
log("percentiles_peak", {
    p50: percentilePeak(0.50),
    p90: percentilePeak(0.90),
    p95: percentilePeak(0.95),
    p99: percentilePeak(0.99),
});

// Distribución por bandas (10 dB)
log("bands", db.prepare(`
    SELECT
        CAST(db_level / 10 AS INTEGER) * 10 AS band_low,
        COUNT(*) AS n
    FROM noise_readings
    GROUP BY band_low
    ORDER BY band_low
`).all());

// Distribución por umbrales del sistema (50 / 70)
log("thresholds", db.prepare(`
    SELECT
        SUM(CASE WHEN db_level < 50 THEN 1 ELSE 0 END) AS bajo,
        SUM(CASE WHEN db_level >= 50 AND db_level < 70 THEN 1 ELSE 0 END) AS medio,
        SUM(CASE WHEN db_level >= 70 THEN 1 ELSE 0 END) AS alto
    FROM noise_readings
`).get());

// Por micro: media, mediana aprox, p95, peak max
const mics = out.mics_global.map(m => m.mic);
const perMic = [];
for (const m of mics) {
    const base = db.prepare(`
        SELECT COUNT(*) AS n, AVG(db_level) AS mean, MIN(db_level) AS min, MAX(db_level) AS max,
               AVG(peak_level) AS peak_mean, MAX(peak_level) AS peak_max
        FROM noise_readings WHERE mic = ?
    `).get(m);
    const offsetP50 = Math.floor((base.n - 1) * 0.5);
    const offsetP95 = Math.floor((base.n - 1) * 0.95);
    const p50 = db.prepare("SELECT db_level FROM noise_readings WHERE mic = ? ORDER BY db_level ASC LIMIT 1 OFFSET ?").get(m, offsetP50);
    const p95 = db.prepare("SELECT db_level FROM noise_readings WHERE mic = ? ORDER BY db_level ASC LIMIT 1 OFFSET ?").get(m, offsetP95);
    perMic.push({
        mic: m,
        n: base.n,
        mean: base.mean,
        min: base.min,
        max: base.max,
        p50: p50 ? p50.db_level : null,
        p95: p95 ? p95.db_level : null,
        peak_mean: base.peak_mean,
        peak_max: base.peak_max,
    });
}
log("per_mic", perMic);

// Por hora del día (LOCAL — usamos strftime sobre datetime(timestamp,'unixepoch','localtime'))
log("by_hour_local", db.prepare(`
    SELECT
        CAST(strftime('%H', datetime(timestamp, 'unixepoch', 'localtime')) AS INTEGER) AS hour,
        COUNT(*) AS n,
        AVG(db_level) AS mean,
        MAX(db_level) AS max,
        MAX(peak_level) AS peak_max
    FROM noise_readings
    GROUP BY hour
    ORDER BY hour
`).all());

// Por día de la semana (0=domingo)
log("by_dow_local", db.prepare(`
    SELECT
        CAST(strftime('%w', datetime(timestamp, 'unixepoch', 'localtime')) AS INTEGER) AS dow,
        COUNT(*) AS n,
        AVG(db_level) AS mean
    FROM noise_readings
    GROUP BY dow
    ORDER BY dow
`).all());

// Por fecha (solo días con datos)
log("by_date_local", db.prepare(`
    SELECT
        strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'localtime')) AS d,
        COUNT(*) AS n,
        AVG(db_level) AS mean,
        MAX(db_level) AS max,
        MAX(peak_level) AS peak_max
    FROM noise_readings
    GROUP BY d
    ORDER BY d
`).all());

// Eventos: lecturas peak >= 80 dB (ruido alto sostenido)
log("events_peak_ge_80", db.prepare(`
    SELECT COUNT(*) AS n_events,
           COUNT(DISTINCT room || '|' || mic) AS n_sources
    FROM noise_readings WHERE peak_level >= 80
`).get());

log("events_peak_ge_90", db.prepare(`
    SELECT COUNT(*) AS n_events
    FROM noise_readings WHERE peak_level >= 90
`).get());

// Top picos absolutos
log("top_peaks", db.prepare(`
    SELECT room, mic, db_level, peak_level, datetime(timestamp,'unixepoch','localtime') AS local_ts
    FROM noise_readings ORDER BY peak_level DESC LIMIT 10
`).all());

// Top dB sostenido
log("top_db", db.prepare(`
    SELECT room, mic, db_level, peak_level, datetime(timestamp,'unixepoch','localtime') AS local_ts
    FROM noise_readings ORDER BY db_level DESC LIMIT 10
`).all());

// Cobertura: ratio lecturas mic_central vs distribuidos
const central = db.prepare("SELECT COUNT(*) AS n FROM noise_readings WHERE mic = 'mic_central'").get().n;
const distrib = db.prepare("SELECT COUNT(*) AS n FROM noise_readings WHERE mic != 'mic_central'").get().n;
log("central_vs_distrib", { central, distrib });

// Diferencia media central vs mediana de distribuidos por timestamp/aula (muestreo)
// Calculamos por aula la diferencia media entre lectura del central y mediana de distribuidos en ventanas de 5s
log("central_offset_check", db.prepare(`
    SELECT
        c.room,
        AVG(c.db_level) AS central_mean,
        (SELECT AVG(db_level) FROM noise_readings d WHERE d.room = c.room AND d.mic != 'mic_central') AS distrib_mean,
        AVG(c.db_level) - (SELECT AVG(db_level) FROM noise_readings d WHERE d.room = c.room AND d.mic != 'mic_central') AS diff
    FROM noise_readings c
    WHERE c.mic = 'mic_central'
    GROUP BY c.room
`).all());

console.log(JSON.stringify(out, null, 2));
db.close();
