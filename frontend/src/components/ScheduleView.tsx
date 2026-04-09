"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface SlotStats {
    readings: number;
    avg: number;
    max: number;
    min: number;
    maxPeak: number;
    p10: number;
    p50: number;
    p90: number;
    stdDev: number;
    pctAbove50: number;
    pctAbove70: number;
}

interface Slot {
    id: string;
    label: string;
    start: string;
    end: string;
    type: "class" | "break";
    startTs: number;
    endTs: number;
    active: boolean;
    stats: SlotStats | null;
}

interface ScheduleData {
    room: string;
    date: string;
    totalReadings: number;
    daySummary: { avg: number | null; max: number | null; min: number | null };
    noisiest: string | null;
    quietest: string | null;
    slots: Slot[];
}

function getBarColor(db: number): string {
    if (db < 50) return "#22c55e";
    if (db < 70) return "#eab308";
    return "#ef4444";
}

function getLevelLabel(db: number): { label: string; color: string } {
    if (db < 50) return { label: "Tranquilo", color: "text-green-400" };
    if (db < 60) return { label: "Moderado", color: "text-yellow-400" };
    if (db < 70) return { label: "Alto", color: "text-orange-400" };
    return { label: "Ruidoso", color: "text-red-400" };
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-ES", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
}

function CustomBarTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as Slot;
    if (!d.stats) return null;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm shadow-xl">
            <p className="font-semibold text-white mb-2">{d.label} ({d.start} - {d.end})</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
                <span>Media:</span><span className="font-medium text-white">{d.stats.avg} dB</span>
                <span>Mediana:</span><span className="font-medium">{d.stats.p50} dB</span>
                <span>Min / Max:</span><span>{d.stats.min} / {d.stats.max} dB</span>
                <span>P10 / P90:</span><span>{d.stats.p10} / {d.stats.p90} dB</span>
                <span>Desv. tip.:</span><span>{d.stats.stdDev} dB</span>
                <span>Pico max:</span><span className="text-red-400">{d.stats.maxPeak} dB</span>
                <span>&gt;50 dB:</span><span className="text-yellow-400">{d.stats.pctAbove50}%</span>
                <span>&gt;70 dB:</span><span className="text-red-400">{d.stats.pctAbove70}%</span>
                <span>Muestras:</span><span>{d.stats.readings}</span>
            </div>
        </div>
    );
}

function StatBox({ label, value, unit, color }: { label: string; value: string | number | null; unit?: string; color?: string }) {
    return (
        <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold ${color || "text-white"}`}>
                {value !== null ? value : "—"}{unit && <span className="text-sm font-normal text-gray-500"> {unit}</span>}
            </p>
        </div>
    );
}

interface ScheduleViewProps {
    roomId: string;
    onBack: () => void;
}

export default function ScheduleView({ roomId, onBack }: ScheduleViewProps) {
    const [data, setData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [dateOffset, setDateOffset] = useState(0); // 0 = today, -1 = yesterday, etc.

    const dateStr = (() => {
        const d = new Date();
        d.setDate(d.getDate() + dateOffset);
        return d.toISOString().split("T")[0];
    })();

    const loadSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/rooms/${roomId}/schedule?date=${dateStr}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("[API] Error cargando horario:", err);
        }
        setLoading(false);
    }, [roomId, dateStr]);

    useEffect(() => {
        loadSchedule();
        // Auto-refresh every 30s if viewing today
        if (dateOffset === 0) {
            const interval = setInterval(loadSchedule, 30000);
            return () => clearInterval(interval);
        }
    }, [loadSchedule, dateOffset]);

    const roomLabel = roomId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    // Chart data - fill missing stats with 0 for visual
    const chartData = data?.slots.map(s => ({
        ...s,
        avgDb: s.stats?.avg || 0,
        shortLabel: s.type === "break" ? "R" : s.start.slice(0, 5),
    })) || [];

    // Morning / afternoon split
    const morningSlots = data?.slots.filter(s => {
        const h = parseInt(s.start.split(":")[0]);
        return h < 15;
    }) || [];
    const afternoonSlots = data?.slots.filter(s => {
        const h = parseInt(s.start.split(":")[0]);
        return h >= 15;
    }) || [];

    const isToday = dateOffset === 0;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold">{roomLabel} — Horario del dia</h2>
                    <p className="text-sm text-gray-400 mt-0.5 capitalize">{formatDate(dateStr)}</p>
                </div>

                {/* Date navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDateOffset(d => d - 1)}
                        className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        ← Ayer
                    </button>
                    {!isToday && (
                        <button
                            onClick={() => setDateOffset(0)}
                            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                        >
                            Hoy
                        </button>
                    )}
                    {dateOffset < 0 && (
                        <button
                            onClick={() => setDateOffset(d => d + 1)}
                            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Sig →
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    <span className="ml-3 text-gray-400">Cargando datos del dia...</span>
                </div>
            ) : !data ? (
                <div className="text-center py-20 text-gray-500">Error al cargar datos</div>
            ) : (
                <>
                    {/* Day summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <StatBox
                                label="Media del dia"
                                value={data.daySummary.avg}
                                unit="dB"
                                color={data.daySummary.avg ? getLevelLabel(data.daySummary.avg).color : undefined}
                            />
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <StatBox label="Maximo" value={data.daySummary.max} unit="dB" color="text-red-400" />
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <StatBox label="Minimo" value={data.daySummary.min} unit="dB" color="text-green-400" />
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <StatBox label="Muestras" value={data.totalReadings} />
                        </div>
                    </div>

                    {/* Bar chart */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Nivel medio por franja</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} onClick={(e) => {
                                    if (e?.activePayload?.[0]) {
                                        setSelectedSlot(e.activePayload[0].payload);
                                    }
                                }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                    <XAxis
                                        dataKey="shortLabel"
                                        stroke="#6b7280"
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        domain={[20, 100]}
                                        stroke="#6b7280"
                                        tick={{ fontSize: 11 }}
                                        label={{ value: "dB", position: "insideLeft", style: { fill: "#6b7280" } }}
                                    />
                                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                                    <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.4} />
                                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.4} />
                                    <Bar dataKey="avgDb" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {chartData.map((entry) => (
                                            <Cell
                                                key={entry.id}
                                                fill={entry.stats ? getBarColor(entry.stats.avg) : "#374151"}
                                                opacity={entry.active ? 1 : 0.75}
                                                stroke={entry.active ? "#3b82f6" : "none"}
                                                strokeWidth={entry.active ? 2 : 0}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> &lt;50 dB</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 50-70 dB</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;70 dB</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded border-2 border-blue-500 bg-transparent" /> Franja activa</span>
                        </div>
                    </div>

                    {/* Slot grid - morning */}
                    {morningSlots.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Manana (8:30 - 14:20)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {morningSlots.map(slot => (
                                    <SlotCard
                                        key={slot.id}
                                        slot={slot}
                                        isSelected={selectedSlot?.id === slot.id}
                                        isNoisiest={data.noisiest === slot.id}
                                        isQuietest={data.quietest === slot.id}
                                        onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Slot grid - afternoon */}
                    {afternoonSlots.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Tarde (15:30 - 21:10)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {afternoonSlots.map(slot => (
                                    <SlotCard
                                        key={slot.id}
                                        slot={slot}
                                        isSelected={selectedSlot?.id === slot.id}
                                        isNoisiest={data.noisiest === slot.id}
                                        isQuietest={data.quietest === slot.id}
                                        onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected slot detail */}
                    {selectedSlot?.stats && (
                        <SlotDetail slot={selectedSlot} />
                    )}
                </>
            )}
        </div>
    );
}

function SlotCard({ slot, isSelected, isNoisiest, isQuietest, onClick }: {
    slot: Slot;
    isSelected: boolean;
    isNoisiest: boolean;
    isQuietest: boolean;
    onClick: () => void;
}) {
    const isBreak = slot.type === "break";
    const hasData = slot.stats !== null;
    const level = hasData ? getLevelLabel(slot.stats!.avg) : null;

    let borderClass = "border-gray-800";
    if (isSelected) borderClass = "border-blue-500";
    else if (slot.active) borderClass = "border-blue-500/50";

    let bgClass = "bg-gray-900";
    if (isBreak && hasData) bgClass = "bg-indigo-950/40";
    else if (isBreak) bgClass = "bg-gray-900/60";

    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left rounded-xl border p-4 transition-all duration-200
                ${bgClass} ${borderClass}
                hover:border-gray-600 cursor-pointer
                ${isSelected ? "ring-1 ring-blue-500/30" : ""}
            `}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {isBreak && <span className="text-xs">☕</span>}
                    <span className="font-medium text-sm">{slot.label}</span>
                    {slot.active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                </div>
                <span className="text-xs text-gray-500">{slot.start}-{slot.end}</span>
            </div>

            {hasData ? (
                <>
                    <div className="flex items-end gap-1 mb-2">
                        <span className={`text-2xl font-bold tabular-nums ${level!.color}`}>
                            {slot.stats!.avg}
                        </span>
                        <span className="text-xs text-gray-500 mb-1">dB avg</span>
                    </div>

                    {/* Mini visual bar */}
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
                        <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                                width: `${Math.min(100, Math.max(0, ((slot.stats!.avg - 20) / 80) * 100))}%`,
                                backgroundColor: getBarColor(slot.stats!.avg),
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{slot.stats!.min}-{slot.stats!.max} dB</span>
                        <div className="flex gap-2">
                            {isNoisiest && <span className="text-red-400 font-medium">Mas ruidosa</span>}
                            {isQuietest && <span className="text-green-400 font-medium">Mas tranquila</span>}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-sm text-gray-600 py-2">
                    {slot.active ? "Recopilando datos..." : "Sin datos"}
                </div>
            )}
        </button>
    );
}

function SlotDetail({ slot }: { slot: Slot }) {
    const s = slot.stats!;
    const level = getLevelLabel(s.avg);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold">{slot.label}</h3>
                    <p className="text-sm text-gray-400">{slot.start} - {slot.end}</p>
                </div>
                <div className={`text-3xl font-bold ${level.color}`}>
                    {s.avg} <span className="text-base font-normal text-gray-500">dB</span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Mediana (P50)</p>
                    <p className="text-lg font-bold">{s.p50} dB</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Desv. tipica</p>
                    <p className="text-lg font-bold">{s.stdDev} dB</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Rango P10-P90</p>
                    <p className="text-lg font-bold">{s.p10} - {s.p90} dB</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Pico maximo</p>
                    <p className="text-lg font-bold text-red-400">{s.maxPeak} dB</p>
                </div>
            </div>

            {/* Time above thresholds visual */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Tiempo &gt;50 dB</span>
                        <span className="text-sm font-medium text-yellow-400">{s.pctAbove50}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-yellow-500 transition-all" style={{ width: `${s.pctAbove50}%` }} />
                    </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Tiempo &gt;70 dB</span>
                        <span className="text-sm font-medium text-red-400">{s.pctAbove70}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${s.pctAbove70}%` }} />
                    </div>
                </div>
            </div>

            <p className="text-xs text-gray-600 mt-3 text-right">{s.readings} muestras</p>
        </div>
    );
}
