"use client";

import { useState } from "react";
import { RoomSummary } from "@/lib/useNoiseData";
import DayCalendar from "./DayCalendar";
import RoomFloorplan from "./RoomFloorplan";

interface RoomDetailViewProps {
    roomData: RoomSummary | null;
    onSelectMic: (micId: string) => void;
    onBack: () => void;
    onSchedule?: (date?: string) => void;
}

function formatRoomName(room: string): string {
    return room.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getMicTextColor(db: number): string {
    if (db < 50) return "text-green-400";
    if (db < 70) return "text-yellow-400";
    return "text-red-400";
}

function getNoiseLabel(db: number): string {
    if (db < 50) return "Tranquilo";
    if (db < 70) return "Moderado";
    return "Ruidoso";
}

export default function RoomDetailView({ roomData, onSelectMic, onBack, onSchedule }: RoomDetailViewProps) {
    const [showCalendar, setShowCalendar] = useState(false);

    if (!roomData) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>Cargando datos del aula...</p>
            </div>
        );
    }

    // Separar micros distribuidos y central
    const distributedMics = [...roomData.mics]
        .filter((m) => m.mic !== "mic_central")
        .sort((a, b) => a.mic.localeCompare(b.mic));
    const centralMic = roomData.mics.find((m) => m.mic === "mic_central") || null;

    // Calcular media solo de los distribuidos (online)
    const onlineDistributed = distributedMics.filter((m) => m.online !== false);
    const distributedAvg = onlineDistributed.length > 0
        ? onlineDistributed.reduce((s, m) => s + m.db, 0) / onlineDistributed.length
        : 0;
    const distributedPeak = onlineDistributed.length > 0
        ? Math.max(...onlineDistributed.map((m) => m.peak))
        : 0;

    const hasCentral = centralMic !== null;
    const centralOnline = centralMic && centralMic.online !== false;
    const centralDb = centralOnline ? centralMic.db : 0;

    // Diferencia entre modelos
    const bothOnline = onlineDistributed.length > 0 && centralOnline;
    const diff = bothOnline ? Math.abs(distributedAvg - centralDb) : 0;

    // Nivel general del aula (media de todos los mics online)
    const roomLevel = getNoiseLabel(roomData.db);
    const roomColor = getMicTextColor(roomData.db);

    return (
        <div>
            {/* Cabecera con breadcrumb */}
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

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            {formatRoomName(roomData.room)}
                        </h2>
                        <p className="text-gray-400 mt-1">
                            {roomData.onlineCount}/{roomData.micCount} microfonos activos
                            {hasCentral && " (incluye micro central)"}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {onSchedule && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onSchedule()}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Horario (hoy)
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCalendar(v => !v)}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-sm font-medium text-gray-300"
                                        title="Seleccionar día (heatmap)"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                                        </svg>
                                    </button>
                                    {showCalendar && (
                                        <DayCalendar
                                            roomId={roomData.room}
                                            onSelect={(date) => {
                                                setShowCalendar(false);
                                                onSchedule(date);
                                            }}
                                            onClose={() => setShowCalendar(false)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${roomColor} db-pulse`}>
                                {roomData.db.toFixed(1)} <span className="text-lg">dB</span>
                            </div>
                            <div className={`text-sm ${roomColor}`}>{roomLevel}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plano del aula unificado */}
            <div className="mb-4">
                <RoomFloorplan roomId={roomData.room} mics={roomData.mics} onSelectMic={onSelectMic} />
            </div>

            {/* Stats rapidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-400 uppercase">Distribuido</p>
                    <p className={`text-xl font-bold ${onlineDistributed.length > 0 ? getMicTextColor(distributedAvg) : "text-gray-600"}`}>
                        {onlineDistributed.length > 0 ? distributedAvg.toFixed(1) : "--"} <span className="text-xs">dB</span>
                    </p>
                    <p className="text-[10px] text-gray-500">media {onlineDistributed.length}/{distributedMics.length}</p>
                </div>
                {hasCentral && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-purple-400 uppercase">Central (C)</p>
                        <p className={`text-xl font-bold ${centralOnline ? getMicTextColor(centralMic.db) : "text-gray-600"}`}>
                            {centralOnline ? centralMic.db.toFixed(1) : "--"} <span className="text-xs">dB</span>
                        </p>
                        <p className="text-[10px] text-gray-500">{centralOnline ? "online" : "offline"}</p>
                    </div>
                )}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase">Pico máximo</p>
                    <p className="text-xl font-bold text-red-400">
                        {Math.max(distributedPeak, centralOnline ? centralMic.peak : 0).toFixed(1)} <span className="text-xs">dB</span>
                    </p>
                    <p className="text-[10px] text-gray-500">últimos 5s</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase">Total online</p>
                    <p className="text-xl font-bold text-green-400">
                        {roomData.onlineCount}/{roomData.micCount}
                    </p>
                    <p className="text-[10px] text-gray-500">mics activos</p>
                </div>
            </div>

            {/* Comparativa entre modelos */}
            {hasCentral && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
                        Comparativa de modelos
                    </h3>

                    {bothOnline ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Distribuido */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                                <p className="text-xs text-blue-400 uppercase mb-1">Distribuido (6 mics)</p>
                                <p className={`text-3xl font-bold ${getMicTextColor(distributedAvg)}`}>
                                    {distributedAvg.toFixed(1)} <span className="text-sm">dB</span>
                                </p>
                            </div>

                            {/* Diferencia */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center flex flex-col justify-center">
                                <p className="text-xs text-gray-500 uppercase mb-1">Diferencia</p>
                                <p className={`text-3xl font-bold ${diff < 3 ? "text-green-400" : diff < 6 ? "text-yellow-400" : "text-red-400"}`}>
                                    {diff < 0.1 ? "=" : `${diff > 0 && distributedAvg > centralDb ? "+" : "-"}${diff.toFixed(1)}`} <span className="text-sm">dB</span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {diff < 3 ? "Coinciden" : diff < 6 ? "Diferencia moderada" : "Diferencia alta"}
                                </p>
                            </div>

                            {/* Central */}
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                                <p className="text-xs text-purple-400 uppercase mb-1">Central (Core2)</p>
                                <p className={`text-3xl font-bold ${getMicTextColor(centralDb)}`}>
                                    {centralDb.toFixed(1)} <span className="text-sm">dB</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500">
                            <p>Esperando datos de ambos modelos para comparar...</p>
                            <p className="text-xs mt-2">
                                Distribuido: {onlineDistributed.length > 0 ? "online" : "offline"} |
                                Central: {centralOnline ? "online" : "offline"}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Stats globales si NO hay central (compatibilidad) */}
            {!hasCentral && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-400">Media</p>
                        <p className="text-2xl font-bold text-blue-400">{roomData.db.toFixed(1)} dB</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-400">Pico maximo</p>
                        <p className="text-2xl font-bold text-red-400">{roomData.peak.toFixed(1)} dB</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-400">Micros online</p>
                        <p className="text-2xl font-bold text-green-400">{roomData.onlineCount}/{roomData.micCount}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
