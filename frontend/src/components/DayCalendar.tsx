"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface DayStats {
    samples: number;
    buckets: number;
    avg: number | null;
    min: number | null;
    max: number | null;
    maxPeak: number | null;
}

interface DayEntry {
    day: string; // "2026-04-15"
    stats: DayStats;
}

interface DayCalendarProps {
    roomId: string;
    onSelect: (date: string) => void;
    onClose: () => void;
}

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function getDayColor(avg: number | null): { bg: string; text: string; label: string } {
    if (avg == null) return { bg: "bg-gray-800", text: "text-gray-600", label: "sin datos" };
    if (avg < 50) return { bg: "bg-green-500/80", text: "text-white", label: "tranquilo" };
    if (avg < 60) return { bg: "bg-yellow-500/80", text: "text-gray-900", label: "moderado" };
    if (avg < 70) return { bg: "bg-orange-500/80", text: "text-white", label: "alto" };
    return { bg: "bg-red-500/80", text: "text-white", label: "ruidoso" };
}

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function DayCalendar({ roomId, onSelect, onClose }: DayCalendarProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today));
    const [daysData, setDaysData] = useState<Map<string, DayStats>>(new Map());
    const [loading, setLoading] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Delay para no pillar el click que abrio
        const t = setTimeout(() => document.addEventListener("mousedown", handler), 100);
        return () => {
            clearTimeout(t);
            document.removeEventListener("mousedown", handler);
        };
    }, [onClose]);

    const loadMonth = useCallback(async () => {
        setLoading(true);
        const from = toDateStr(startOfMonth(viewMonth));
        const to = toDateStr(endOfMonth(viewMonth));
        try {
            const res = await fetch(`${API_URL}/api/rooms/${roomId}/days?from=${from}&to=${to}`);
            const json = await res.json();
            const map = new Map<string, DayStats>();
            for (const d of (json.days || []) as DayEntry[]) {
                map.set(d.day, d.stats);
            }
            setDaysData(map);
        } catch (err) {
            console.error("[CALENDAR] Error cargando dias:", err);
        }
        setLoading(false);
    }, [roomId, viewMonth]);

    useEffect(() => {
        loadMonth();
    }, [loadMonth]);

    // Construir grid del mes (celdas que pueden ser del mes anterior/siguiente)
    const firstDay = startOfMonth(viewMonth);
    const lastDay = endOfMonth(viewMonth);
    // Lunes como primer dia: JS tiene domingo = 0, hay que ajustar
    const firstWeekday = (firstDay.getDay() + 6) % 7; // 0 = lunes
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date; inMonth: boolean } | null> = [];
    // Huecos antes del dia 1
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    // Dias del mes
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d), inMonth: true });
    }

    function navMonth(delta: number) {
        const newMonth = new Date(viewMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setViewMonth(startOfMonth(newMonth));
    }

    function isFuture(d: Date): boolean {
        return d.getTime() > today.getTime();
    }

    return (
        <div
            ref={popoverRef}
            className="absolute z-50 top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 w-80"
        >
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={() => navMonth(-1)}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                    aria-label="Mes anterior"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="text-sm font-medium text-white">
                    {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </div>
                <button
                    onClick={() => navMonth(1)}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                    aria-label="Mes siguiente"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Dias de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((w) => (
                    <div key={w} className="text-xs text-center text-gray-500 font-medium py-1">
                        {w}
                    </div>
                ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, i) => {
                    if (!cell) return <div key={i} />;
                    const dStr = toDateStr(cell.date);
                    const stats = daysData.get(dStr);
                    const avg = stats?.avg ?? null;
                    const { bg, text, label } = getDayColor(avg);
                    const future = isFuture(cell.date);
                    const isToday = dStr === toDateStr(today);

                    return (
                        <button
                            key={i}
                            disabled={future || !stats}
                            onClick={() => !future && stats && onSelect(dStr)}
                            title={
                                future
                                    ? "Fecha futura"
                                    : stats
                                        ? `${dStr} — ${label} (${avg?.toFixed(1)} dB, ${stats.buckets} lecturas)`
                                        : `${dStr} — sin datos`
                            }
                            className={`
                                aspect-square rounded flex flex-col items-center justify-center
                                text-xs font-medium transition
                                ${future
                                    ? "bg-gray-900 text-gray-700 cursor-not-allowed opacity-40"
                                    : stats
                                        ? `${bg} ${text} hover:ring-2 hover:ring-white cursor-pointer`
                                        : "bg-gray-800 text-gray-600 cursor-not-allowed"}
                                ${isToday ? "ring-2 ring-blue-400" : ""}
                            `}
                        >
                            <span>{cell.date.getDate()}</span>
                            {avg != null && (
                                <span className="text-[9px] opacity-80 tabular-nums">{avg.toFixed(0)}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Leyenda */}
            <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Media del día (dB)</span>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-green-500/80" title="<50" />
                        <span className="w-3 h-3 rounded bg-yellow-500/80" title="50-60" />
                        <span className="w-3 h-3 rounded bg-orange-500/80" title="60-70" />
                        <span className="w-3 h-3 rounded bg-red-500/80" title=">70" />
                    </div>
                </div>
                {loading && <div className="text-[10px] text-gray-500 mt-1 text-center">Cargando...</div>}
            </div>
        </div>
    );
}
