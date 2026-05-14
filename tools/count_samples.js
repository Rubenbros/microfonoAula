const Database = require("better-sqlite3");
const path = require("path");
const dbPath = path.resolve(__dirname, "..", "backend", "data", "noise.db");
const db = new Database(dbPath, { readonly: true });

const total = db.prepare("SELECT COUNT(*) AS n FROM noise_readings").get();
const perRoom = db.prepare(
    "SELECT room, mic, COUNT(*) AS n, MIN(timestamp) AS first, MAX(timestamp) AS last FROM noise_readings GROUP BY room, mic ORDER BY n DESC"
).all();

console.log("TOTAL muestras (raw):", total.n);
console.log("");
console.log("Por aula / micro:");
for (const r of perRoom) {
    const first = new Date(r.first * 1000).toISOString().replace("T", " ").slice(0, 19);
    const last = new Date(r.last * 1000).toISOString().replace("T", " ").slice(0, 19);
    console.log(`  ${r.room}/${r.mic}: ${r.n.toLocaleString()}  (${first} -> ${last} UTC)`);
}

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log("");
console.log("Tablas:", tables.join(", "));

if (tables.includes("noise_minute")) {
    const m = db.prepare("SELECT COUNT(*) AS buckets, SUM(sample_count) AS samples FROM noise_minute").get();
    console.log(`Rollup minuto:  ${m.buckets} buckets, ${(m.samples || 0).toLocaleString()} muestras agregadas`);
}
if (tables.includes("noise_hour")) {
    const h = db.prepare("SELECT COUNT(*) AS buckets, SUM(sample_count) AS samples FROM noise_hour").get();
    console.log(`Rollup hora:    ${h.buckets} buckets, ${(h.samples || 0).toLocaleString()} muestras agregadas`);
}
if (tables.includes("noise_day")) {
    const d = db.prepare("SELECT COUNT(*) AS buckets, SUM(sample_count) AS samples FROM noise_day").get();
    console.log(`Rollup dia:     ${d.buckets} buckets, ${(d.samples || 0).toLocaleString()} muestras agregadas`);
}
