"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, Legend,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ---- Tipos de API ----
interface Curso {
    id: string;
    label: string;
    start: string;
    end: string;
    startTs: number;
    endTs: number;
}

interface RoomMeta {
    room: string;
    mics: string[];
    firstTs: number | null;
    lastTs: number | null;
}

interface Meta {
    dataRange: { firstTs: number | null; lastTs: number | null };
    rooms: RoomMeta[];
    cursos: Curso[];
}

interface SeriesSummary {
    samples: number;
    buckets: number;
    avg: number | null;
    min: number | null;
    max: number | null;
    maxPeak: number | null;
    p10: number | null;
    p50: number | null;
    p90: number | null;
    stdDev: number | null;
    pctAbove50: number;
    pctAbove70: number;
}

interface BreakdownSlot {
    id: string;
    label: string;
    start: string;
    end: string;
    type: "class" | "break";
    stats: SeriesSummary | null;
}

interface BreakdownDay {
    day: string;
    stats: {
        samples: number;
        buckets: number;
        avg: number | null;
        min: number | null;
        max: number | null;
        maxPeak: number | null;
    };
}

interface SeriesResult {
    id: string;
    label: string;
    room: string;
    mic: string | null;
    from: number;
    to: number;
    granularity: "raw" | "minute" | "hour";
    summary: SeriesSummary;
    breakdown?: { granularity: string; slots?: BreakdownSlot[]; days?: BreakdownDay[]; unavailable?: string };
}

interface CompareResponse {
    series: SeriesResult[];
}

// ---- Helpers ----
type Mode = "rooms" | "days" | "cursos";
type Breakdown = "none" | "slot" | "day";

const SERIES_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function colorForAvg(avg: number | null): string {
    if (avg == null) return "#6b7280";
    if (avg < 50) return "#22c55e";
    if (avg < 60) return "#eab308";
    if (avg < 70) return "#f97316";
    return "#ef4444";
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

interface ComparatorViewProps {
    onBack: () => void;
}

export default function ComparatorView({ onBack }: ComparatorViewProps) {
    const [meta, setMeta] = useState<Meta | null>(null);
    const [metaLoading, setMetaLoading] = useState(true);
    const [mode, setMode] = useState<Mode>("rooms");
    const [breakdown, setBreakdown] = useState<Breakdown>("none");
    const [results, setResults] = useState<CompareResponse | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Estado por modo ---
    const [fromDate, setFromDate] = useState(daysAgo(7));
    const [toDate, setToDate] = useState(todayStr());
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>("");
    const [selectedDates, setSelectedDates] = useState<string[]>([todayStr(), daysAgo(1)]);
    const [selectedCursos, setSelectedCursos] = useState<string[]>([]);

    // --- Cargar meta al montar ---
    useEffect(() => {
        (async () => {
            setMetaLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/meta`);
                const json = await res.json() as Meta;
                setMeta(json);
                // Preseleccion
                if (json.rooms.length > 0) {
                    setSelectedRooms(json.rooms.slice(0, 2).map(r => r.room));
                    setSelectedRoom(json.rooms[0].room);
                }
                if (json.cursos.length > 0) {
                    setSelectedCursos(json.cursos.map(c => c.id).slice(-2));
                }
            } catch (err) {
                setError("No se pudo cargar /api/meta: " + String(err));
            }
            setMetaLoading(false);
        })();
    }, []);

    // --- Submit ---
    const runCompare = useCallback(async () => {
        setRunning(true);
        setResults(null);
        setError(null);
        try {
            let url = "";
            if (mode === "rooms") {
                if (selectedRooms.length < 2) throw new Error("Selecciona al menos 2 aulas");
                const fromTs = Math.floor(new Date(fromDate + "T00:00:00").getTime() / 1000);
                const toTs = Math.floor(new Date(toDate + "T23:59:59").getTime() / 1000);
                url = `${API_URL}/api/compare/rooms?rooms=${selectedRooms.join(",")}&from=${fromTs}&to=${toTs}&breakdown=${breakdown}`;
            } else if (mode === "days") {
                if (!selectedRoom) throw new Error("Selecciona un aula");
                if (selectedDates.length < 2) throw new Error("Añade al menos 2 fechas");
                url = `${API_URL}/api/compare/days?room=${selectedRoom}&dates=${selectedDates.join(",")}&breakdown=${breakdown}`;
            } else {
                if (!selectedRoom) throw new Error("Selecciona un aula");
                if (selectedCursos.length < 2) throw new Error("Selecciona al menos 2 cursos");
                url = `${API_URL}/api/compare/cursos?room=${selectedRoom}&cursos=${selectedCursos.join(",")}&breakdown=${breakdown}`;
            }
            const res = await fetch(url);
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || `HTTP ${res.status}`);
            }
            const json = await res.json() as CompareResponse;
            setResults(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        setRunning(false);
    }, [mode, breakdown, fromDate, toDate, selectedRooms, selectedRoom, selectedDates, selectedCursos]);

    function toggleRoom(room: string) {
        setSelectedRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]);
    }
    function toggleCurso(id: string) {
        setSelectedCursos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
    function addDate() {
        setSelectedDates(prev => [...prev, todayStr()]);
    }
    function updateDate(idx: number, v: string) {
        setSelectedDates(prev => prev.map((d, i) => i === idx ? v : d));
    }
    function removeDate(idx: number) {
        setSelectedDates(prev => prev.filter((_, i) => i !== idx));
    }

    return (
        <div>
            {/* Cabecera */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al dashboard
                </button>
                <h2 className="text-3xl font-bold text-white">Comparador</h2>
                <p className="text-gray-400 mt-1 text-sm">
                    Compara aulas entre sí, días de una misma aula, o cursos completos.
                </p>
            </div>

            {/* Tabs de modo */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
                <div className="flex gap-2 mb-4">
                    {(["rooms", "days", "cursos"] as Mode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setResults(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                mode === m
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            }`}
                        >
                            {m === "rooms" ? "Aulas" : m === "days" ? "Días" : "Cursos"}
                        </button>
                    ))}
                </div>

                {metaLoading ? (
                    <p className="text-gray-500 text-sm">Cargando metadatos...</p>
                ) : !meta || meta.rooms.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay datos disponibles en la base de datos.</p>
                ) : (
                    <>
                        {/* Selectores por modo */}
                        {mode === "rooms" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase">Aulas a comparar (2+)</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {meta.rooms.map(r => (
                                            <button
                                                key={r.room}
                                                onClick={() => toggleRoom(r.room)}
                                                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                                    selectedRooms.includes(r.room)
                                                        ? "bg-indigo-600 border-indigo-500 text-white"
                                                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                                }`}
                                            >
                                                {r.room}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase">Desde</label>
                                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                               className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase">Hasta</label>
                                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                               className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "days" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase">Aula</label>
                                    <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}
                                            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
                                        {meta.rooms.map(r => <option key={r.room} value={r.room}>{r.room}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase">Fechas a comparar (2+)</label>
                                    <div className="space-y-2 mt-2">
                                        {selectedDates.map((d, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input type="date" value={d} onChange={e => updateDate(i, e.target.value)}
                                                       className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
                                                <button onClick={() => removeDate(i)}
                                                        className="px-3 py-2 bg-gray-800 hover:bg-red-900/40 border border-gray-700 rounded text-sm text-gray-400">
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={addDate} className="text-sm text-indigo-400 hover:text-indigo-300">
                                            + Añadir fecha
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "cursos" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase">Aula</label>
                                    <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}
                                            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
                                        {meta.rooms.map(r => <option key={r.room} value={r.room}>{r.room}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase">Cursos (2+)</label>
                                    {meta.cursos.length === 0 ? (
                                        <p className="text-sm text-gray-500 mt-2">No hay cursos con datos aún.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {meta.cursos.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => toggleCurso(c.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                                        selectedCursos.includes(c.id)
                                                            ? "bg-indigo-600 border-indigo-500 text-white"
                                                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                                    }`}
                                                >
                                                    {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Breakdown + Submit */}
                        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-800">
                            <div>
                                <label className="text-xs text-gray-400 uppercase mr-2">Desglose</label>
                                <select value={breakdown} onChange={e => setBreakdown(e.target.value as Breakdown)}
                                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm">
                                    <option value="none">Solo resumen</option>
                                    <option value="slot">Por franja horaria</option>
                                    <option value="day">Por día</option>
                                </select>
                            </div>
                            <button
                                onClick={runCompare}
                                disabled={running}
                                className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
                            >
                                {running ? "Calculando..." : "Comparar"}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-3 p-3 bg-red-900/30 border border-red-800/50 rounded text-sm text-red-300">
                                {error}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Resultados */}
            {results && <ResultsPanel results={results} breakdown={breakdown} />}
        </div>
    );
}

// ============================================
// Panel de resultados
// ============================================
function ResultsPanel({ results, breakdown }: { results: CompareResponse; breakdown: Breakdown }) {
    const series = results.series;

    // Chart data: avg por serie
    const chartData = series.map((s, i) => ({
        label: s.label,
        avg: s.summary.avg ?? 0,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
    }));

    return (
        <div className="space-y-4">
            {/* Resumen en grid de cards */}
            <div className={`grid gap-3 ${
                series.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                series.length === 3 ? "grid-cols-1 md:grid-cols-3" :
                "grid-cols-2 md:grid-cols-4"
            }`}>
                {series.map((s, i) => (
                    <SeriesCard key={s.id} series={s} color={SERIES_COLORS[i % SERIES_COLORS.length]} />
                ))}
            </div>

            {/* Chart comparativa de avg */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Media de dB por serie</h3>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={[0, "auto"]} unit=" dB" />
                        <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                        <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                            {chartData.map((d, i) => <Cell key={i} fill={colorForAvg(d.avg)} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Breakdown */}
            {breakdown === "slot" && series.some(s => s.breakdown?.slots) && (
                <SlotBreakdownChart series={series} />
            )}
            {breakdown === "day" && series.some(s => s.breakdown?.days) && (
                <DayBreakdownChart series={series} />
            )}
            {breakdown !== "none" && series.some(s => s.breakdown?.unavailable) && (
                <div className="bg-yellow-900/20 border border-yellow-800/50 rounded p-3 text-sm text-yellow-300">
                    {series.find(s => s.breakdown?.unavailable)?.breakdown?.unavailable}
                </div>
            )}
        </div>
    );
}

function SeriesCard({ series, color }: { series: SeriesResult; color: string }) {
    const s = series.summary;
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-sm font-semibold text-white truncate" title={series.label}>
                    {series.label}
                </span>
            </div>
            <div className="text-3xl font-bold" style={{ color: colorForAvg(s.avg) }}>
                {s.avg != null ? s.avg.toFixed(1) : "—"} <span className="text-sm text-gray-500">dB</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{series.granularity} · {s.buckets.toLocaleString()} lecturas</p>

            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <Stat label="Min" v={s.min} />
                <Stat label="Max" v={s.max} />
                <Stat label="Pico" v={s.maxPeak} />
                <Stat label="p10" v={s.p10} />
                <Stat label="p50" v={s.p50} />
                <Stat label="p90" v={s.p90} />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 text-xs pt-2 border-t border-gray-800">
                <div className="text-center">
                    <p className="text-gray-500">% &gt; 50 dB</p>
                    <p className="text-yellow-400 font-semibold">{s.pctAbove50}%</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500">% &gt; 70 dB</p>
                    <p className="text-red-400 font-semibold">{s.pctAbove70}%</p>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, v }: { label: string; v: number | null }) {
    return (
        <div className="text-center">
            <p className="text-gray-500">{label}</p>
            <p className="text-white tabular-nums">{v != null ? v.toFixed(1) : "—"}</p>
        </div>
    );
}

function SlotBreakdownChart({ series }: { series: SeriesResult[] }) {
    // Construir datos por slot: filas = slots, columnas = series
    const firstSlots = series.find(s => s.breakdown?.slots)?.breakdown?.slots || [];
    const data = firstSlots.map(slot => {
        const row: Record<string, string | number | null> = { slot: slot.label };
        for (const s of series) {
            const slotMatch = s.breakdown?.slots?.find(sl => sl.id === slot.id);
            row[s.label] = slotMatch?.stats?.avg ?? null;
        }
        return row;
    });

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Desglose por franja horaria</h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="slot" tick={{ fill: "#9ca3af", fontSize: 10 }} angle={-35} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} unit=" dB" />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {series.map((s, i) => (
                        <Bar key={s.id} dataKey={s.label} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function DayBreakdownChart({ series }: { series: SeriesResult[] }) {
    // Si todas las series abarcan el mismo rango, combinar por dia.
    // Si no (ej. comparar cursos -> rangos distintos), mostrar grafico por cada serie.
    const allDays = new Set<string>();
    for (const s of series) {
        for (const d of (s.breakdown?.days || [])) allDays.add(d.day);
    }
    const sortedDays = [...allDays].sort();

    const data = sortedDays.map(day => {
        const row: Record<string, string | number | null> = { day };
        for (const s of series) {
            const dayMatch = s.breakdown?.days?.find(d => d.day === day);
            row[s.label] = dayMatch?.stats.avg ?? null;
        }
        return row;
    });

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Desglose por día</h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} angle={-35} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} unit=" dB" />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {series.map((s, i) => (
                        <Bar key={s.id} dataKey={s.label} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
