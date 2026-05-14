/**
 * Rollup en escalera para noise_readings.
 *
 * Tres niveles de granularidad:
 *   - noise_readings (raw, ~5s)           : retencion RAW_RETENTION_DAYS   (14)
 *   - noise_minute   (agregado 1 minuto)  : retencion MINUTE_RETENTION_DAYS (180)
 *   - noise_hour     (agregado 1 hora)    : sin retencion (infinito)
 *
 * Jobs:
 *   - Cada minuto: agrega raw del minuto recien cerrado a noise_minute.
 *   - Cada 5 min:  agrega noise_minute al noise_hour de la hora cerrada.
 *   - Cada 24 h:   purga raw > 14d y minute > 180d.
 *
 * Al arrancar se hace catch-up: procesa todos los buckets desde el ultimo
 * guardado hasta el presente (util si el server estuvo parado).
 */

const RAW_RETENTION_DAYS = parseInt(process.env.RAW_RETENTION_DAYS || "14");
const MINUTE_RETENTION_DAYS = parseInt(process.env.MINUTE_RETENTION_DAYS || "180");

const MINUTE_ROLLUP_INTERVAL_MS = 60 * 1000;
const HOUR_ROLLUP_INTERVAL_MS = 5 * 60 * 1000;
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function initRollup(db) {
    // ---- Esquema ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS noise_minute (
            room TEXT NOT NULL,
            mic TEXT NOT NULL,
            bucket_ts INTEGER NOT NULL,
            avg_db REAL NOT NULL,
            min_db REAL NOT NULL,
            max_db REAL NOT NULL,
            max_peak REAL NOT NULL,
            sample_count INTEGER NOT NULL,
            PRIMARY KEY (room, mic, bucket_ts)
        );
        CREATE INDEX IF NOT EXISTS idx_minute_bucket ON noise_minute (bucket_ts);
        CREATE INDEX IF NOT EXISTS idx_minute_room_bucket ON noise_minute (room, bucket_ts DESC);

        CREATE TABLE IF NOT EXISTS noise_hour (
            room TEXT NOT NULL,
            mic TEXT NOT NULL,
            bucket_ts INTEGER NOT NULL,
            avg_db REAL NOT NULL,
            min_db REAL NOT NULL,
            max_db REAL NOT NULL,
            max_peak REAL NOT NULL,
            sample_count INTEGER NOT NULL,
            PRIMARY KEY (room, mic, bucket_ts)
        );
        CREATE INDEX IF NOT EXISTS idx_hour_bucket ON noise_hour (bucket_ts);
        CREATE INDEX IF NOT EXISTS idx_hour_room_bucket ON noise_hour (room, bucket_ts DESC);
    `);

    // ---- Prepared statements ----
    const stmt = {
        lastMinuteBucket: db.prepare(`SELECT MAX(bucket_ts) as ts FROM noise_minute`),
        lastHourBucket: db.prepare(`SELECT MAX(bucket_ts) as ts FROM noise_hour`),
        firstRawTs: db.prepare(`SELECT MIN(timestamp) as ts FROM noise_readings`),

        aggregateRawToMinute: db.prepare(`
            SELECT
                room, mic,
                (timestamp / 60) * 60 as bucket_ts,
                AVG(db_level) as avg_db,
                MIN(db_level) as min_db,
                MAX(db_level) as max_db,
                MAX(peak_level) as max_peak,
                COUNT(*) as sample_count
            FROM noise_readings
            WHERE timestamp >= ? AND timestamp < ?
            GROUP BY room, mic, bucket_ts
        `),
        insertMinute: db.prepare(`
            INSERT INTO noise_minute (room, mic, bucket_ts, avg_db, min_db, max_db, max_peak, sample_count)
            VALUES (@room, @mic, @bucket_ts, @avg_db, @min_db, @max_db, @max_peak, @sample_count)
            ON CONFLICT(room, mic, bucket_ts) DO UPDATE SET
                avg_db = excluded.avg_db,
                min_db = excluded.min_db,
                max_db = excluded.max_db,
                max_peak = excluded.max_peak,
                sample_count = excluded.sample_count
        `),

        aggregateMinuteToHour: db.prepare(`
            SELECT
                room, mic,
                (bucket_ts / 3600) * 3600 as bucket_ts,
                SUM(avg_db * sample_count) / SUM(sample_count) as avg_db,
                MIN(min_db) as min_db,
                MAX(max_db) as max_db,
                MAX(max_peak) as max_peak,
                SUM(sample_count) as sample_count
            FROM noise_minute
            WHERE bucket_ts >= ? AND bucket_ts < ?
            GROUP BY room, mic, (bucket_ts / 3600) * 3600
        `),
        insertHour: db.prepare(`
            INSERT INTO noise_hour (room, mic, bucket_ts, avg_db, min_db, max_db, max_peak, sample_count)
            VALUES (@room, @mic, @bucket_ts, @avg_db, @min_db, @max_db, @max_peak, @sample_count)
            ON CONFLICT(room, mic, bucket_ts) DO UPDATE SET
                avg_db = excluded.avg_db,
                min_db = excluded.min_db,
                max_db = excluded.max_db,
                max_peak = excluded.max_peak,
                sample_count = excluded.sample_count
        `),

        purgeRaw: db.prepare(`DELETE FROM noise_readings WHERE timestamp < ?`),
        purgeMinute: db.prepare(`DELETE FROM noise_minute WHERE bucket_ts < ?`),

        queryMinute: db.prepare(`
            SELECT room, mic, bucket_ts as timestamp,
                   avg_db as db, max_peak as peak,
                   min_db as min, max_db as max, sample_count as count
            FROM noise_minute
            WHERE room = ? AND bucket_ts >= ? AND bucket_ts <= ?
            ORDER BY bucket_ts ASC
        `),
        queryMinuteByMic: db.prepare(`
            SELECT room, mic, bucket_ts as timestamp,
                   avg_db as db, max_peak as peak,
                   min_db as min, max_db as max, sample_count as count
            FROM noise_minute
            WHERE room = ? AND mic = ? AND bucket_ts >= ? AND bucket_ts <= ?
            ORDER BY bucket_ts ASC
        `),
        queryHour: db.prepare(`
            SELECT room, mic, bucket_ts as timestamp,
                   avg_db as db, max_peak as peak,
                   min_db as min, max_db as max, sample_count as count
            FROM noise_hour
            WHERE room = ? AND bucket_ts >= ? AND bucket_ts <= ?
            ORDER BY bucket_ts ASC
        `),
        queryHourByMic: db.prepare(`
            SELECT room, mic, bucket_ts as timestamp,
                   avg_db as db, max_peak as peak,
                   min_db as min, max_db as max, sample_count as count
            FROM noise_hour
            WHERE room = ? AND mic = ? AND bucket_ts >= ? AND bucket_ts <= ?
            ORDER BY bucket_ts ASC
        `),
    };

    // ---- Rollup minute ----
    const insertManyMinute = db.transaction((rows) => {
        for (const r of rows) stmt.insertMinute.run(r);
    });

    function runMinuteRollup() {
        const now = Math.floor(Date.now() / 1000);
        const currentMinuteStart = Math.floor(now / 60) * 60;

        const last = stmt.lastMinuteBucket.get().ts;
        const firstRaw = stmt.firstRawTs.get().ts;
        if (!firstRaw) return; // sin datos raw todavia

        // Empieza desde el minuto siguiente al ultimo procesado,
        // o desde el primer raw si es la primera vez.
        let startBucket = last != null
            ? last + 60
            : Math.floor(firstRaw / 60) * 60;

        const endBucket = currentMinuteStart; // excluye el minuto en curso

        if (startBucket >= endBucket) return;

        const rows = stmt.aggregateRawToMinute.all(startBucket, endBucket);
        if (rows.length === 0) return;

        insertManyMinute(rows);
        console.log(`[ROLLUP] minute: ${rows.length} buckets (rango ${startBucket} -> ${endBucket})`);
    }

    // ---- Rollup hour ----
    const insertManyHour = db.transaction((rows) => {
        for (const r of rows) stmt.insertHour.run(r);
    });

    function runHourRollup() {
        const now = Math.floor(Date.now() / 1000);
        const currentHourStart = Math.floor(now / 3600) * 3600;

        const last = stmt.lastHourBucket.get().ts;
        const firstMinute = stmt.lastMinuteBucket.get().ts;
        if (!firstMinute) return;

        let startBucket;
        if (last != null) {
            startBucket = last + 3600;
        } else {
            const firstMin = db.prepare(`SELECT MIN(bucket_ts) as ts FROM noise_minute`).get().ts;
            startBucket = Math.floor((firstMin || 0) / 3600) * 3600;
        }

        const endBucket = currentHourStart;
        if (startBucket >= endBucket) return;

        const rows = stmt.aggregateMinuteToHour.all(startBucket, endBucket);
        if (rows.length === 0) return;

        insertManyHour(rows);
        console.log(`[ROLLUP] hour: ${rows.length} buckets (rango ${startBucket} -> ${endBucket})`);
    }

    // ---- Purga ----
    function runPurge() {
        const now = Math.floor(Date.now() / 1000);
        const rawCutoff = now - RAW_RETENTION_DAYS * 86400;
        const minuteCutoff = now - MINUTE_RETENTION_DAYS * 86400;

        // Rollup primero para no perder datos antes de borrar
        runMinuteRollup();
        runHourRollup();

        const rawDeleted = stmt.purgeRaw.run(rawCutoff).changes;
        const minuteDeleted = stmt.purgeMinute.run(minuteCutoff).changes;

        console.log(`[PURGE] raw: ${rawDeleted} filas borradas (> ${RAW_RETENTION_DAYS}d), minute: ${minuteDeleted} filas (> ${MINUTE_RETENTION_DAYS}d)`);
    }

    // ---- Query inteligente: elige tabla segun rango ----
    function queryHistory({ room, mic, from, to }) {
        const now = Math.floor(Date.now() / 1000);
        const rawCutoff = now - RAW_RETENTION_DAYS * 86400;
        const minuteCutoff = now - MINUTE_RETENTION_DAYS * 86400;

        // Si el inicio del rango cae dentro del periodo raw -> raw
        if (from >= rawCutoff) {
            return { granularity: "raw", rows: null }; // caller usa sus statements raw
        }
        // Si cae en el periodo minute -> minute
        if (from >= minuteCutoff) {
            const rows = mic
                ? stmt.queryMinuteByMic.all(room, mic, from, to)
                : stmt.queryMinute.all(room, from, to);
            return { granularity: "minute", rows };
        }
        // Si no -> hour
        const rows = mic
            ? stmt.queryHourByMic.all(room, mic, from, to)
            : stmt.queryHour.all(room, from, to);
        return { granularity: "hour", rows };
    }

    // ---- Arranque ----
    console.log(`[ROLLUP] Iniciando (raw: ${RAW_RETENTION_DAYS}d, minute: ${MINUTE_RETENTION_DAYS}d, hour: infinito)`);

    // Catch-up al arrancar
    runMinuteRollup();
    runHourRollup();

    // Schedulers
    setInterval(runMinuteRollup, MINUTE_ROLLUP_INTERVAL_MS);
    setInterval(runHourRollup, HOUR_ROLLUP_INTERVAL_MS);
    setInterval(runPurge, PURGE_INTERVAL_MS);

    return {
        queryHistory,
        runMinuteRollup,
        runHourRollup,
        runPurge,
        RAW_RETENTION_DAYS,
        MINUTE_RETENTION_DAYS,
    };
}

module.exports = { initRollup };
