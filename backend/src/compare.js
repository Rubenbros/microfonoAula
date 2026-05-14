/**
 * Comparador de series temporales.
 *
 * Una "serie" es un tramo de datos: { id, label?, room, mic?, from, to }.
 * Podemos comparar:
 *   - Aulas distintas en mismo rango (pares aula vs aula).
 *   - Misma aula en dias distintos (lunes vs martes).
 *   - Misma aula en cursos distintos (2024-25 vs 2025-26).
 *
 * Calcula stats (avg, min, max, p10/p50/p90, stdDev, pctAbove50/70) y opcionalmente
 * un breakdown por franja horaria o por dia. Elige automaticamente la tabla
 * (noise_readings / noise_minute / noise_hour) segun el rango pedido.
 */

// Calendario escolar: curso empieza 1 sep, termina 31 ago del año siguiente.
const CURSO_START_MONTH = 9; // Septiembre (1-indexed)
const CURSO_START_DAY = 1;

function cursoIdFromTimestamp(ts) {
    const d = new Date(ts * 1000);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    // Antes de sep 1: pertenece al curso (year-1)-year. Desde sep 1: year-(year+1).
    const startYear = (month >= CURSO_START_MONTH) ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
}

function cursoToRange(cursoId) {
    // "2024-2025" -> Date UTC
    const [y1, y2] = cursoId.split("-").map(Number);
    if (!y1 || !y2 || y2 !== y1 + 1) {
        throw new Error(`Curso invalido: ${cursoId}`);
    }
    const start = Date.UTC(y1, CURSO_START_MONTH - 1, CURSO_START_DAY, 0, 0, 0);
    const end = Date.UTC(y2, CURSO_START_MONTH - 1, CURSO_START_DAY, 0, 0, 0) - 1;
    return {
        id: cursoId,
        label: `Curso ${y1}-${String(y2).slice(-2)}`,
        start: new Date(start).toISOString().slice(0, 10),
        end: new Date(end).toISOString().slice(0, 10),
        startTs: Math.floor(start / 1000),
        endTs: Math.floor(end / 1000),
    };
}

function dayRangeFromDateStr(dateStr) {
    // "2026-04-15" -> {startTs, endTs} del dia completo (local time)
    const base = new Date(dateStr + "T00:00:00");
    const startTs = Math.floor(base.getTime() / 1000);
    const endTs = startTs + 86400 - 1;
    return { startTs, endTs };
}

/**
 * Devuelve que tabla y columna de timestamp usar segun el rango.
 * Retorna { table, tsCol, isAggregated, weight }.
 *   - Si `from` cae dentro del periodo raw -> readings (db_level, peak_level, timestamp)
 *   - Si cae en periodo minute -> noise_minute (avg_db, max_peak, bucket_ts, sample_count)
 *   - Si no -> noise_hour
 */
function pickTable(from, rawRetentionDays, minuteRetentionDays) {
    const now = Math.floor(Date.now() / 1000);
    const rawCutoff = now - rawRetentionDays * 86400;
    const minuteCutoff = now - minuteRetentionDays * 86400;

    if (from >= rawCutoff) {
        return {
            granularity: "raw",
            table: "noise_readings",
            tsCol: "timestamp",
            dbCol: "db_level",
            peakCol: "peak_level",
            weightCol: null,
            minCol: "db_level",
            maxCol: "db_level",
        };
    }
    if (from >= minuteCutoff) {
        return {
            granularity: "minute",
            table: "noise_minute",
            tsCol: "bucket_ts",
            dbCol: "avg_db",
            peakCol: "max_peak",
            weightCol: "sample_count",
            minCol: "min_db",
            maxCol: "max_db",
        };
    }
    return {
        granularity: "hour",
        table: "noise_hour",
        tsCol: "bucket_ts",
        dbCol: "avg_db",
        peakCol: "max_peak",
        weightCol: "sample_count",
        minCol: "min_db",
        maxCol: "max_db",
    };
}

/** Calcula p10, p50, p90, stdDev sobre un array ordenado de valores. */
function computePercentiles(values) {
    if (values.length === 0) return { p10: null, p50: null, p90: null, stdDev: null };
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const p10 = sorted[Math.floor(n * 0.1)] ?? sorted[0];
    const p50 = sorted[Math.floor(n * 0.5)] ?? sorted[0];
    const p90 = sorted[Math.floor(n * 0.9)] ?? sorted[n - 1];
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.round(Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n) * 10) / 10;
    return { p10, p50, p90, stdDev };
}

/**
 * Stats completas de una serie. Reconoce los 3 tipos de tabla y actua en consecuencia.
 * Si la tabla esta agregada, para avg se hace media ponderada con sample_count.
 */
function computeSeriesStats(db, spec, retention) {
    const t = pickTable(spec.from, retention.rawDays, retention.minuteDays);
    const where = [`${t.tsCol} >= @from`, `${t.tsCol} <= @to`, `room = @room`];
    const params = { from: spec.from, to: spec.to, room: spec.room };
    if (spec.mic) {
        where.push(`mic = @mic`);
        params.mic = spec.mic;
    }
    const whereSql = where.join(" AND ");

    // Stats agregadas (SQL)
    let aggSql;
    if (t.weightCol) {
        aggSql = `
            SELECT
                SUM(${t.weightCol}) as samples,
                COUNT(*) as buckets,
                SUM(${t.dbCol} * ${t.weightCol}) / NULLIF(SUM(${t.weightCol}), 0) as avg_db,
                MIN(${t.minCol}) as min_db,
                MAX(${t.maxCol}) as max_db,
                MAX(${t.peakCol}) as max_peak
            FROM ${t.table}
            WHERE ${whereSql}
        `;
    } else {
        aggSql = `
            SELECT
                COUNT(*) as samples,
                COUNT(*) as buckets,
                AVG(${t.dbCol}) as avg_db,
                MIN(${t.minCol}) as min_db,
                MAX(${t.maxCol}) as max_db,
                MAX(${t.peakCol}) as max_peak
            FROM ${t.table}
            WHERE ${whereSql}
        `;
    }
    const agg = db.prepare(aggSql).get(params);

    // Valores ordenados para percentiles y pct above (sobre avg por bucket si agregado)
    const valuesSql = `
        SELECT ${t.dbCol} as v
        FROM ${t.table}
        WHERE ${whereSql}
        ORDER BY ${t.dbCol} ASC
    `;
    const values = db.prepare(valuesSql).all(params).map(r => r.v);
    const pct = computePercentiles(values);

    const n = values.length;
    const pctAbove50 = n > 0 ? Math.round((values.filter(v => v > 50).length / n) * 100) : 0;
    const pctAbove70 = n > 0 ? Math.round((values.filter(v => v > 70).length / n) * 100) : 0;

    return {
        granularity: t.granularity,
        summary: {
            samples: agg.samples || 0,
            buckets: agg.buckets || 0,
            avg: agg.avg_db != null ? Math.round(agg.avg_db * 10) / 10 : null,
            min: agg.min_db,
            max: agg.max_db,
            maxPeak: agg.max_peak,
            p10: pct.p10, p50: pct.p50, p90: pct.p90,
            stdDev: pct.stdDev,
            pctAbove50, pctAbove70,
        },
    };
}

/**
 * Breakdown por franjas horarias para una serie.
 * Si la serie abarca varios dias, cada slot se aplica a cada dia y se agregan.
 * Si granularidad es "hour" devuelve null (no tiene sentido a 1h de resolucion).
 */
function computeSlotBreakdown(db, spec, retention, slots) {
    const t = pickTable(spec.from, retention.rawDays, retention.minuteDays);
    if (t.granularity === "hour") {
        return { unavailable: "Breakdown por franjas no disponible con granularidad de hora" };
    }

    // Para cada slot, calcular stats sumando todos los dias del rango
    // Un slot (e.g. 08:30-09:20) aplica a todos los dias entre from y to.

    const startDate = new Date(spec.from * 1000);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(spec.to * 1000);

    // Recolectar todas las fechas del rango
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }

    const slotMap = {};
    for (const slot of slots) {
        slotMap[slot.id] = {
            id: slot.id,
            label: slot.label,
            type: slot.type,
            start: slot.start,
            end: slot.end,
            values: [],
            samplesTotal: 0,
            peaksMax: 0,
        };
    }

    const valuesSqlBase = `
        SELECT ${t.dbCol} as v, ${t.peakCol} as peak ${t.weightCol ? `, ${t.weightCol} as w` : ""}
        FROM ${t.table}
        WHERE room = @room ${spec.mic ? "AND mic = @mic" : ""}
          AND ${t.tsCol} >= @start AND ${t.tsCol} <= @end
    `;
    const valuesStmt = db.prepare(valuesSqlBase);

    for (const day of dates) {
        for (const slot of slots) {
            const [sh, sm] = slot.start.split(":").map(Number);
            const [eh, em] = slot.end.split(":").map(Number);
            const dayStart = new Date(day);
            dayStart.setHours(sh, sm, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(eh, em, 0, 0);

            const startTs = Math.floor(dayStart.getTime() / 1000);
            const endTs = Math.floor(dayEnd.getTime() / 1000);
            if (endTs < spec.from || startTs > spec.to) continue;

            const params = {
                room: spec.room,
                start: Math.max(startTs, spec.from),
                end: Math.min(endTs, spec.to),
            };
            if (spec.mic) params.mic = spec.mic;

            const rows = valuesStmt.all(params);
            for (const r of rows) {
                slotMap[slot.id].values.push(r.v);
                slotMap[slot.id].samplesTotal += (r.w ?? 1);
                if (r.peak > slotMap[slot.id].peaksMax) slotMap[slot.id].peaksMax = r.peak;
            }
        }
    }

    const breakdown = Object.values(slotMap).map(s => {
        const values = s.values;
        if (values.length === 0) {
            return { id: s.id, label: s.label, type: s.type, start: s.start, end: s.end, stats: null };
        }
        const pct = computePercentiles(values);
        const n = values.length;
        const avg = Math.round((values.reduce((a, b) => a + b, 0) / n) * 10) / 10;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return {
            id: s.id, label: s.label, type: s.type, start: s.start, end: s.end,
            stats: {
                samples: s.samplesTotal,
                buckets: n,
                avg, min, max,
                maxPeak: s.peaksMax,
                p10: pct.p10, p50: pct.p50, p90: pct.p90,
                stdDev: pct.stdDev,
                pctAbove50: Math.round((values.filter(v => v > 50).length / n) * 100),
                pctAbove70: Math.round((values.filter(v => v > 70).length / n) * 100),
            },
        };
    });

    return { granularity: t.granularity, slots: breakdown };
}

/**
 * Breakdown por dia: stats por cada dia dentro del rango.
 */
function computeDayBreakdown(db, spec, retention) {
    const t = pickTable(spec.from, retention.rawDays, retention.minuteDays);

    const whereMic = spec.mic ? "AND mic = @mic" : "";

    let sql;
    if (t.weightCol) {
        sql = `
            SELECT
                date(${t.tsCol}, 'unixepoch', 'localtime') as day,
                SUM(${t.weightCol}) as samples,
                COUNT(*) as buckets,
                SUM(${t.dbCol} * ${t.weightCol}) / NULLIF(SUM(${t.weightCol}), 0) as avg_db,
                MIN(${t.minCol}) as min_db,
                MAX(${t.maxCol}) as max_db,
                MAX(${t.peakCol}) as max_peak
            FROM ${t.table}
            WHERE room = @room ${whereMic} AND ${t.tsCol} >= @from AND ${t.tsCol} <= @to
            GROUP BY day
            ORDER BY day ASC
        `;
    } else {
        sql = `
            SELECT
                date(${t.tsCol}, 'unixepoch', 'localtime') as day,
                COUNT(*) as samples,
                COUNT(*) as buckets,
                AVG(${t.dbCol}) as avg_db,
                MIN(${t.minCol}) as min_db,
                MAX(${t.maxCol}) as max_db,
                MAX(${t.peakCol}) as max_peak
            FROM ${t.table}
            WHERE room = @room ${whereMic} AND ${t.tsCol} >= @from AND ${t.tsCol} <= @to
            GROUP BY day
            ORDER BY day ASC
        `;
    }
    const params = { room: spec.room, from: spec.from, to: spec.to };
    if (spec.mic) params.mic = spec.mic;

    const rows = db.prepare(sql).all(params);
    const days = rows.map(r => ({
        day: r.day,
        stats: {
            samples: r.samples,
            buckets: r.buckets,
            avg: r.avg_db != null ? Math.round(r.avg_db * 10) / 10 : null,
            min: r.min_db,
            max: r.max_db,
            maxPeak: r.max_peak,
        },
    }));

    return { granularity: t.granularity, days };
}

/**
 * Meta del sistema: aulas con datos + cursos disponibles.
 */
function getMeta(db) {
    // Rango global de datos (mira las 3 tablas)
    const bounds = db.prepare(`
        SELECT
            MIN(ts) as minTs,
            MAX(ts) as maxTs
        FROM (
            SELECT MIN(timestamp) as ts FROM noise_readings
            UNION ALL
            SELECT MAX(timestamp) as ts FROM noise_readings
            UNION ALL
            SELECT MIN(bucket_ts) as ts FROM noise_minute
            UNION ALL
            SELECT MAX(bucket_ts) as ts FROM noise_minute
            UNION ALL
            SELECT MIN(bucket_ts) as ts FROM noise_hour
            UNION ALL
            SELECT MAX(bucket_ts) as ts FROM noise_hour
        )
    `).get();

    // Aulas distintas + sus mics (union de las 3 tablas)
    const roomsRows = db.prepare(`
        SELECT DISTINCT room, mic FROM noise_readings
        UNION
        SELECT DISTINCT room, mic FROM noise_minute
        UNION
        SELECT DISTINCT room, mic FROM noise_hour
        ORDER BY room, mic
    `).all();

    const roomsMap = {};
    for (const r of roomsRows) {
        if (!roomsMap[r.room]) roomsMap[r.room] = { room: r.room, mics: [] };
        if (!roomsMap[r.room].mics.includes(r.mic)) roomsMap[r.room].mics.push(r.mic);
    }

    // Primer / ultimo timestamp por aula
    const roomBoundsStmt = db.prepare(`
        SELECT MIN(ts) as minTs, MAX(ts) as maxTs FROM (
            SELECT MIN(timestamp) as ts FROM noise_readings WHERE room = ?
            UNION ALL
            SELECT MAX(timestamp) as ts FROM noise_readings WHERE room = ?
            UNION ALL
            SELECT MIN(bucket_ts) as ts FROM noise_minute WHERE room = ?
            UNION ALL
            SELECT MAX(bucket_ts) as ts FROM noise_minute WHERE room = ?
            UNION ALL
            SELECT MIN(bucket_ts) as ts FROM noise_hour WHERE room = ?
            UNION ALL
            SELECT MAX(bucket_ts) as ts FROM noise_hour WHERE room = ?
        )
    `);

    const rooms = Object.values(roomsMap).map(r => {
        const b = roomBoundsStmt.get(r.room, r.room, r.room, r.room, r.room, r.room);
        return {
            room: r.room,
            mics: r.mics,
            firstTs: b.minTs,
            lastTs: b.maxTs,
        };
    });

    // Cursos disponibles: iterar desde el primer curso con datos hasta el ultimo
    const cursos = [];
    if (bounds.minTs != null && bounds.maxTs != null) {
        const firstCurso = cursoIdFromTimestamp(bounds.minTs);
        const lastCurso = cursoIdFromTimestamp(bounds.maxTs);
        const firstYear = parseInt(firstCurso.split("-")[0]);
        const lastYear = parseInt(lastCurso.split("-")[0]);
        for (let y = firstYear; y <= lastYear; y++) {
            cursos.push(cursoToRange(`${y}-${y + 1}`));
        }
    }

    return {
        dataRange: {
            firstTs: bounds.minTs,
            lastTs: bounds.maxTs,
        },
        rooms,
        cursos,
    };
}

module.exports = {
    cursoIdFromTimestamp,
    cursoToRange,
    dayRangeFromDateStr,
    computeSeriesStats,
    computeSlotBreakdown,
    computeDayBreakdown,
    getMeta,
};
