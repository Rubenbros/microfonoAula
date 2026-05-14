// Analisis completo del histórico EduSoundMetrics
const path = require("path");
const Database = require(path.resolve(__dirname, "../backend/node_modules/better-sqlite3"));
const db = new Database(path.resolve(__dirname, "../backend/data/noise.db"), { readonly: true });

// Bandas dB(A) de la documentacion
function band(db) {
    if (db < 30) return "20-30 silencio profundo";
    if (db < 40) return "30-40 silencio";
    if (db < 50) return "40-50 ambiente bajo";
    if (db < 60) return "50-60 moderado";
    if (db < 70) return "60-70 elevado";
    if (db < 80) return "70-80 alto";
    if (db < 90) return "80-90 intenso";
    return "90+ excesivo";
}

// Franjas horarias del backend
const SLOTS = [
    { id: "clase_1",  label: "1a Clase",  start: "08:30", end: "09:20", type: "class" },
    { id: "clase_2",  label: "2a Clase",  start: "09:25", end: "10:15", type: "class" },
    { id: "clase_3",  label: "3a Clase",  start: "10:20", end: "11:10", type: "class" },
    { id: "recreo_1", label: "Recreo AM", start: "11:10", end: "11:40", type: "break" },
    { id: "clase_4",  label: "4a Clase",  start: "11:40", end: "12:30", type: "class" },
    { id: "clase_5",  label: "5a Clase",  start: "12:35", end: "13:25", type: "class" },
    { id: "clase_6",  label: "6a Clase",  start: "13:30", end: "14:20", type: "class" },
    { id: "clase_7",  label: "7a Clase",  start: "15:30", end: "16:20", type: "class" },
    { id: "clase_8",  label: "8a Clase",  start: "16:25", end: "17:15", type: "class" },
    { id: "clase_9",  label: "9a Clase",  start: "17:20", end: "18:10", type: "class" },
    { id: "recreo_2", label: "Recreo PM", start: "18:10", end: "18:30", type: "break" },
    { id: "clase_10", label: "10a Clase", start: "18:30", end: "19:20", type: "class" },
    { id: "clase_11", label: "11a Clase", start: "19:25", end: "20:15", type: "class" },
    { id: "clase_12", label: "12a Clase", start: "20:20", end: "21:10", type: "class" },
];

function tmin(s) { const [h, m] = s.split(":").map(Number); return h * 60 + m; }
function slotForMinute(m) { return SLOTS.find(s => m >= tmin(s.start) && m < tmin(s.end)); }

function stats(values) {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const n = s.length;
    const mean = s.reduce((a, b) => a + b, 0) / n;
    const variance = s.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
    return {
        n,
        mean: +mean.toFixed(2),
        std: +Math.sqrt(variance).toFixed(2),
        min: s[0], max: s[n - 1],
        p10: s[Math.floor(n * 0.1)],
        p50: s[Math.floor(n * 0.5)],
        p90: s[Math.floor(n * 0.9)],
        p95: s[Math.floor(n * 0.95)],
    };
}

// ============= 1. Resumen global =============
const overall = db.prepare(`SELECT COUNT(*) as n, MIN(timestamp) as t0, MAX(timestamp) as t1, COUNT(DISTINCT room) as rooms, COUNT(DISTINCT mic) as mics FROM noise_readings`).get();
console.log("============================================");
console.log("  RESUMEN GLOBAL");
console.log("============================================");
console.log(`Muestras totales: ${overall.n.toLocaleString()}`);
console.log(`Aulas: ${overall.rooms} | Micros distintos: ${overall.mics}`);
console.log(`Periodo: ${new Date(overall.t0 * 1000).toLocaleString()}  -->  ${new Date(overall.t1 * 1000).toLocaleString()}`);
const days = Math.ceil((overall.t1 - overall.t0) / 86400);
console.log(`Duracion: ~${days} dias\n`);

// ============= 2. Por aula =============
console.log("============================================");
console.log("  ESTADISTICAS POR AULA");
console.log("============================================");
const rooms = db.prepare(`SELECT DISTINCT room FROM noise_readings ORDER BY room`).all().map(r => r.room);
for (const room of rooms) {
    const rows = db.prepare(`SELECT db_level FROM noise_readings WHERE room = ?`).all(room);
    const vals = rows.map(r => r.db_level);
    const s = stats(vals);
    console.log(`\n${room}: ${s.n.toLocaleString()} muestras`);
    console.log(`  media=${s.mean} dB | mediana=${s.p50} | std=${s.std}`);
    console.log(`  min=${s.min} | max=${s.max} | p90=${s.p90} | p95=${s.p95}`);
    console.log(`  banda mediana: ${band(s.p50)}`);
}

// ============= 3. Por dia de la semana =============
console.log("\n============================================");
console.log("  PATRON SEMANAL (todas las aulas)");
console.log("============================================");
const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const byDow = new Map();
const allRows = db.prepare(`SELECT db_level, timestamp FROM noise_readings`).all();
for (const r of allRows) {
    const d = new Date(r.timestamp * 1000);
    const dow = d.getDay();
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow).push(r.db_level);
}
for (let i = 1; i <= 6; i++) {
    if (byDow.has(i)) {
        const s = stats(byDow.get(i));
        console.log(`  ${dayNames[i].padEnd(10)} n=${s.n.toString().padStart(7)}  media=${s.mean.toString().padStart(5)} dB  mediana=${s.p50.toString().padStart(5)}  p95=${s.p95.toString().padStart(5)}  banda=${band(s.p50)}`);
    }
}
if (byDow.has(0)) {
    const s = stats(byDow.get(0));
    console.log(`  ${dayNames[0].padEnd(10)} n=${s.n.toString().padStart(7)}  media=${s.mean.toString().padStart(5)} dB  mediana=${s.p50.toString().padStart(5)}  p95=${s.p95.toString().padStart(5)}  banda=${band(s.p50)}`);
}

// ============= 4. Por hora del dia =============
console.log("\n============================================");
console.log("  PATRON POR HORA DEL DIA");
console.log("============================================");
const byHour = new Map();
for (const r of allRows) {
    const h = new Date(r.timestamp * 1000).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h).push(r.db_level);
}
const hours = [...byHour.keys()].sort((a, b) => a - b);
for (const h of hours) {
    const s = stats(byHour.get(h));
    const bar = "#".repeat(Math.max(0, Math.round((s.mean - 30) * 1.5)));
    console.log(`  ${String(h).padStart(2, "0")}:00  n=${s.n.toString().padStart(6)}  media=${s.mean.toString().padStart(5)}  p95=${s.p95.toString().padStart(5)}  ${bar}`);
}

// ============= 5. Por franja horaria (clase / recreo) =============
console.log("\n============================================");
console.log("  PATRON POR FRANJA HORARIA (slot)");
console.log("============================================");
const bySlot = new Map();
for (const r of allRows) {
    const d = new Date(r.timestamp * 1000);
    const min = d.getHours() * 60 + d.getMinutes();
    const slot = slotForMinute(min);
    if (!slot) continue;
    if (!bySlot.has(slot.id)) bySlot.set(slot.id, { slot, vals: [] });
    bySlot.get(slot.id).vals.push(r.db_level);
}
const slotResults = [];
for (const [id, { slot, vals }] of bySlot.entries()) {
    const s = stats(vals);
    slotResults.push({ ...slot, ...s, banda: band(s.p50) });
}
slotResults.sort((a, b) => SLOTS.findIndex(x => x.id === a.id) - SLOTS.findIndex(x => x.id === b.id));
console.log("  ID         Tipo   Hora           n      media  mediana  p95   banda");
for (const r of slotResults) {
    const time = `${r.start}-${r.end}`;
    console.log(`  ${r.id.padEnd(10)} ${r.type.padEnd(6)} ${time.padEnd(13)} ${String(r.n).padStart(6)} ${String(r.mean).padStart(6)}  ${String(r.p50).padStart(6)}  ${String(r.p95).padStart(5)}  ${r.banda}`);
}

// Top noisiest classes vs quietest
const classOnly = slotResults.filter(s => s.type === "class").sort((a, b) => b.mean - a.mean);
console.log("\n  TOP 3 CLASES MAS RUIDOSAS:");
for (const c of classOnly.slice(0, 3)) console.log(`    ${c.label} (${c.start}): media=${c.mean} dB, banda=${c.banda}`);
console.log("\n  TOP 3 CLASES MAS SILENCIOSAS:");
for (const c of classOnly.slice(-3)) console.log(`    ${c.label} (${c.start}): media=${c.mean} dB, banda=${c.banda}`);

// Recreos vs clases
const breaks = slotResults.filter(s => s.type === "break");
const classes = slotResults.filter(s => s.type === "class");
const breakAvg = breaks.length ? breaks.reduce((s, b) => s + b.mean * b.n, 0) / breaks.reduce((s, b) => s + b.n, 0) : 0;
const classAvg = classes.length ? classes.reduce((s, b) => s + b.mean * b.n, 0) / classes.reduce((s, b) => s + b.n, 0) : 0;
console.log(`\n  CLASE vs RECREO:`);
console.log(`    Media en clase:  ${classAvg.toFixed(2)} dB`);
console.log(`    Media en recreo: ${breakAvg.toFixed(2)} dB`);
console.log(`    Diferencia:       ${(breakAvg - classAvg).toFixed(2)} dB`);

// ============= 6. Diurno vs vespertino =============
console.log("\n============================================");
console.log("  TURNO DIURNO (08:30-14:20) vs VESPERTINO (15:30-21:10)");
console.log("============================================");
const diurno = [], vespertino = [];
for (const r of allRows) {
    const d = new Date(r.timestamp * 1000);
    const min = d.getHours() * 60 + d.getMinutes();
    if (min >= tmin("08:30") && min < tmin("14:30")) diurno.push(r.db_level);
    else if (min >= tmin("15:30") && min < tmin("21:15")) vespertino.push(r.db_level);
}
const sd = stats(diurno), sv = stats(vespertino);
if (sd) console.log(`  Diurno:     n=${sd.n.toLocaleString()}  media=${sd.mean}  mediana=${sd.p50}  p95=${sd.p95}  banda=${band(sd.p50)}`);
if (sv) console.log(`  Vespertino: n=${sv.n.toLocaleString()}  media=${sv.mean}  mediana=${sv.p50}  p95=${sv.p95}  banda=${band(sv.p50)}`);
if (sd && sv) console.log(`  Delta:      ${(sv.mean - sd.mean).toFixed(2)} dB`);

// ============= 7. Distribucion por bandas =============
console.log("\n============================================");
console.log("  DISTRIBUCION GLOBAL POR BANDAS dB(A)");
console.log("============================================");
const bandCount = new Map();
for (const r of allRows) {
    const b = band(r.db_level);
    bandCount.set(b, (bandCount.get(b) || 0) + 1);
}
const totalBand = allRows.length;
const bandKeys = [...bandCount.keys()].sort();
for (const b of bandKeys) {
    const n = bandCount.get(b);
    const pct = (n * 100 / totalBand).toFixed(1);
    const bar = "#".repeat(Math.round(pct / 2));
    console.log(`  ${b.padEnd(28)} ${String(n).padStart(7)} (${pct.padStart(5)}%)  ${bar}`);
}

// ============= 8. Picos extremos =============
console.log("\n============================================");
console.log("  TOP 10 PICOS EXTREMOS (peak_level)");
console.log("============================================");
const peaks = db.prepare(`SELECT room, mic, db_level, peak_level, timestamp FROM noise_readings ORDER BY peak_level DESC LIMIT 10`).all();
for (const p of peaks) {
    const dt = new Date(p.timestamp * 1000).toLocaleString();
    console.log(`  ${dt}  ${p.room}/${p.mic}  db=${p.db_level}  peak=${p.peak_level} (${band(p.peak_level)})`);
}

// ============= 9. Por dia (cada dia con datos) =============
console.log("\n============================================");
console.log("  RESUMEN POR DIA CON DATOS");
console.log("============================================");
const byDate = new Map();
for (const r of allRows) {
    const d = new Date(r.timestamp * 1000);
    const key = d.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(r.db_level);
}
const dates = [...byDate.keys()].sort();
console.log(`  Dias con datos: ${dates.length}`);
console.log("  Fecha       n        media  mediana  p95   max   banda");
for (const date of dates) {
    const s = stats(byDate.get(date));
    console.log(`  ${date}  ${String(s.n).padStart(6)}  ${String(s.mean).padStart(5)}  ${String(s.p50).padStart(5)}    ${String(s.p95).padStart(4)}  ${String(s.max).padStart(4)}  ${band(s.p50)}`);
}

// ============= 10. Excedencias normativas =============
console.log("\n============================================");
console.log("  EXCEDENCIAS DE UMBRALES NORMATIVOS");
console.log("============================================");
const total = allRows.length;
const above55 = allRows.filter(r => r.db_level > 55).length;
const above60 = allRows.filter(r => r.db_level > 60).length;
const above70 = allRows.filter(r => r.db_level > 70).length;
const above80 = allRows.filter(r => r.db_level > 80).length;
console.log(`  > 55 dB (umbral OMS concentracion):  ${above55.toLocaleString()} / ${total.toLocaleString()} (${(above55*100/total).toFixed(1)}%)`);
console.log(`  > 60 dB (alerta dashboard):          ${above60.toLocaleString()} / ${total.toLocaleString()} (${(above60*100/total).toFixed(1)}%)`);
console.log(`  > 70 dB (ruido alto):                ${above70.toLocaleString()} / ${total.toLocaleString()} (${(above70*100/total).toFixed(1)}%)`);
console.log(`  > 80 dB (ruido intenso):             ${above80.toLocaleString()} / ${total.toLocaleString()} (${(above80*100/total).toFixed(1)}%)`);

db.close();
