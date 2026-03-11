"use client";

import { NoiseReading } from "@/lib/useNoiseData";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface RoomCardProps {
    reading: NoiseReading;
    sparkline: number[];
    onClick: () => void;
}

/** Determina el color segun el nivel de dB */
function getNoiseLevel(db: number): {
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    sparkColor: string;
} {
    if (db < 50) {
        return {
            color: "text-green-400",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/30",
            label: "Tranquilo",
            sparkColor: "#22c55e",
        };
    } else if (db < 70) {
        return {
            color: "text-yellow-400",
            bgColor: "bg-yellow-500/10",
            borderColor: "border-yellow-500/30",
            label: "Moderado",
            sparkColor: "#eab308",
        };
    } else {
        return {
            color: "text-red-400",
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/30",
            label: "Ruidoso",
            sparkColor: "#ef4444",
        };
    }
}

/** Formatea el nombre del aula para mostrarlo */
function formatRoomName(room: string): string {
    return room
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Tiempo relativo desde el ultimo dato */
function timeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 5) return "ahora";
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
}

export default function RoomCard({ reading, sparkline, onClick }: RoomCardProps) {
    const level = getNoiseLevel(reading.db);
    const sparkData = sparkline.map((value, index) => ({ value, index }));

    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left rounded-xl border p-5
                ${level.bgColor} ${level.borderColor}
                hover:scale-[1.02] transition-all duration-200
                cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
        >
            {/* Cabecera: nombre del aula y estado */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                    {formatRoomName(reading.room)}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${level.bgColor} ${level.color} font-medium`}>
                    {level.label}
                </span>
            </div>

            {/* Nivel actual de dB */}
            <div className="flex items-end gap-2 mb-1">
                <span className={`text-4xl font-bold tabular-nums ${level.color} db-pulse`}>
                    {reading.db.toFixed(1)}
                </span>
                <span className="text-gray-400 text-sm mb-1">dB</span>
            </div>

            {/* Pico */}
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                <span>Pico: {reading.peak.toFixed(1)} dB</span>
                <span>{timeAgo(reading.timestamp)}</span>
            </div>

            {/* Sparkline */}
            {sparkData.length > 2 && (
                <div className="h-10 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={level.sparkColor}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </button>
    );
}
