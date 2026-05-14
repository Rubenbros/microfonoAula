// Analisis estadistico de las lecturas entre 18:10 y 18:20 (2026-04-27)
const path = require("path");
const Database = require(path.resolve(__dirname, "../backend/node_modules/better-sqlite3"));

const db = new Database(path.resolve(__dirname, "../backend/data/noise.db"), { readonly: true });

// Ventana: 2026-04-27 18:10:00 -> 18:20:00 (hora local)
const startTs = Math.floor(new Date("2026-04-27T18:10:00").getTime() / 1000);
const endTs = Math.floor(new Date("2026-04-27T18:20:00").getTime() / 1000);

console.log(`Ventana: ${new Date(startTs * 1000).toLocaleString()} -> ${new Date(endTs * 1000).toLocaleString()}`);
console.log(`Timestamps: [${startTs}, ${endTs}]\n`);

// Contar total y por mic/room
const totals = db.prepare(`
    SELECT room, mic, COUNT(*) as n
    FROM noise_readings
    WHERE timestamp >= ? AND timestamp <= ?
    GROUP BY room, mic
    ORDER BY room, mic
`).all(startTs, endTs);

console.log("=== Lecturas por aula/micro ===");
for (const r of totals) console.log(`  ${r.room} / ${r.mic}: ${r.n} muestras`);
console.log(`  TOTAL: ${totals.reduce((a, b) => a + b.n, 0)} muestras\n`);

if (totals.length === 0) {
    console.log("No hay lecturas en esa ventana.");
    process.exit(0);
}

// Estadisticas por mic
function pct(arr, p) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return sorted[idx];
}

function stats(values) {
    const n = values.length;
    if (n === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const sorted = [...values].sort((a, b) => a - b);
    return {
        n,
        mean: +mean.toFixed(2),
        std: +std.toFixed(2),
        min: sorted[0],
        max: sorted[n - 1],
        median: pct(values, 0.5),
        p10: pct(values, 0.1),
        p25: pct(values, 0.25),
        p75: pct(values, 0.75),
        p90: pct(values, 0.9),
        p95: pct(values, 0.95),
        p99: pct(values, 0.99),
    };
}

const rows = db.prepare(`
    SELECT room, mic, db_level, peak_level, timestamp
    FROM noise_readings
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
`).all(startTs, endTs);

// Agrupar por mic
const byMic = new Map();
for (const r of rows) {
    const key = `${r.room}/${r.mic}`;
    if (!byMic.has(key)) byMic.set(key, { db: [], peak: [], ts: [] });
    const g = byMic.get(key);
    g.db.push(r.db_level);
    g.peak.push(r.peak_level);
    g.ts.push(r.timestamp);
}

console.log("=== Estadisticas por microfono ===\n");
for (const [key, g] of byMic.entries()) {
    const sDb = stats(g.db);
    const sPk = stats(g.peak);
    const dur = g.ts[g.ts.length - 1] - g.ts[0];
    const rate = (g.db.length / Math.max(dur, 1)).toFixed(2);
    const above70 = g.db.filter(v => v > 70).length;
    const above80 = g.db.filter(v => v > 80).length;
    const above85 = g.db.filter(v => v > 85).length;

    console.log(`--- ${key} ---`);
    console.log(`  Muestras: ${sDb.n}  |  Duracion ventana datos: ${dur}s  |  ~${rate} Hz`);
    console.log(`  dB_level:  media=${sDb.mean}  std=${sDb.std}  mediana=${sDb.median}`);
    console.log(`             min=${sDb.min}  max=${sDb.max}`);
    console.log(`             p10=${sDb.p10}  p25=${sDb.p25}  p75=${sDb.p75}  p90=${sDb.p90}  p95=${sDb.p95}  p99=${sDb.p99}`);
    console.log(`  peak:      media=${sPk.mean}  max=${sPk.max}  p95=${sPk.p95}  p99=${sPk.p99}`);
    console.log(`  Tiempo > 70 dB: ${above70}/${sDb.n} (${(above70 / sDb.n * 100).toFixed(1)}%)`);
    console.log(`  Tiempo > 80 dB: ${above80}/${sDb.n} (${(above80 / sDb.n * 100).toFixed(1)}%)`);
    console.log(`  Tiempo > 85 dB: ${above85}/${sDb.n} (${(above85 / sDb.n * 100).toFixed(1)}%)`);
    console.log("");
}

// Comparativa entre mics (si hay mas de uno)
if (byMic.size >= 2) {
    console.log("=== Comparativa entre microfonos (medias) ===");
    const means = [...byMic.entries()].map(([k, g]) => ({ mic: k, mean: g.db.reduce((a, b) => a + b, 0) / g.db.length, max: Math.max(...g.db) }));
    means.sort((a, b) => b.mean - a.mean);
    const top = means[0].mean;
    for (const m of means) {
        const delta = (m.mean - top).toFixed(2);
        console.log(`  ${m.mic}: media=${m.mean.toFixed(2)} dB (delta=${delta})  max=${m.max}`);
    }
    console.log("");
}

// Series temporales: bins de 30s
console.log("=== Evolucion temporal (bins de 30s, media por mic) ===");
const binSize = 30;
const bins = new Map(); // bin -> mic -> values
for (const r of rows) {
    const bin = Math.floor((r.timestamp - startTs) / binSize) * binSize;
    if (!bins.has(bin)) bins.set(bin, new Map());
    const b = bins.get(bin);
    const key = `${r.room}/${r.mic}`;
    if (!b.has(key)) b.set(key, []);
    b.get(key).push(r.db_level);
}

const sortedBins = [...bins.keys()].sort((a, b) => a - b);
const allMics = [...byMic.keys()];
console.log("  t(s)  " + allMics.map(m => m.padStart(20)).join(""));
for (const bin of sortedBins) {
    const b = bins.get(bin);
    const cells = allMics.map(m => {
        const arr = b.get(m);
        if (!arr) return "—".padStart(20);
        const mean = arr.reduce((a, c) => a + c, 0) / arr.length;
        return `${mean.toFixed(1)} (n=${arr.length})`.padStart(20);
    });
    console.log(`  ${String(bin).padStart(4)}  ${cells.join("")}`);
}

db.close();
