"use client";

import { RoomSummary, MicReading } from "@/lib/useNoiseData";

interface RoomDetailViewProps {
    roomData: RoomSummary | null;
    onSelectMic: (micId: string) => void;
    onBack: () => void;
}

function formatRoomName(room: string): string {
    return room.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatMicName(mic: string): string {
    return mic.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getMicColor(db: number): string {
    if (db < 50) return "bg-green-500";
    if (db < 70) return "bg-yellow-500";
    return "bg-red-500";
}

function getMicBorderColor(db: number): string {
    if (db < 50) return "border-green-500/50";
    if (db < 70) return "border-yellow-500/50";
    return "border-red-500/50";
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

// Posiciones 2x3 para 6 micros en el mapa del aula
const MIC_POSITIONS = [
    { row: 0, col: 0 }, // mic_01
    { row: 0, col: 1 }, // mic_02
    { row: 1, col: 0 }, // mic_03
    { row: 1, col: 1 }, // mic_04
    { row: 2, col: 0 }, // mic_05
    { row: 2, col: 1 }, // mic_06
];

export default function RoomDetailView({ roomData, onSelectMic, onBack }: RoomDetailViewProps) {
    if (!roomData) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>Cargando datos del aula...</p>
            </div>
        );
    }

    // Ordenar mics por nombre
    const sortedMics = [...roomData.mics].sort((a, b) => a.mic.localeCompare(b.mic));

    // Nivel general del aula
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
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${roomColor} db-pulse`}>
                            {roomData.db.toFixed(1)} <span className="text-lg">dB</span>
                        </div>
                        <div className={`text-sm ${roomColor}`}>{roomLevel}</div>
                    </div>
                </div>
            </div>

            {/* Mapa del aula */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">
                    Mapa del aula
                </h3>

                <div className="relative bg-gray-800/50 border-2 border-gray-700 rounded-xl p-8 mx-auto max-w-2xl">
                    {/* Etiqueta pizarra */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 px-4 py-1 rounded-full text-xs text-gray-400">
                        Pizarra
                    </div>

                    {/* Grid 3x2 de microfonos */}
                    <div className="grid grid-rows-3 grid-cols-2 gap-6">
                        {MIC_POSITIONS.map((pos, index) => {
                            const mic = sortedMics[index];
                            if (!mic) return <div key={index} />;

                            const isOnline = mic.online !== false;
                            const dotColor = isOnline ? getMicColor(mic.db) : "bg-gray-600";
                            const borderColor = isOnline ? getMicBorderColor(mic.db) : "border-gray-600/50";
                            const textColor = isOnline ? getMicTextColor(mic.db) : "text-gray-600";

                            return (
                                <button
                                    key={mic.mic}
                                    onClick={() => onSelectMic(mic.mic)}
                                    className={`
                                        flex flex-col items-center gap-2 p-4 rounded-xl border-2
                                        ${borderColor} bg-gray-900/50
                                        hover:scale-105 hover:bg-gray-800/50 transition-all duration-200
                                        cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
                                    `}
                                >
                                    {/* Circulo de estado */}
                                    <div className={`w-12 h-12 rounded-full ${dotColor} ${isOnline ? "animate-pulse" : ""} shadow-lg flex items-center justify-center`}>
                                        <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4-4h8m-4-12a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z" />
                                        </svg>
                                    </div>

                                    {/* Valor dB */}
                                    <span className={`text-xl font-bold tabular-nums ${textColor}`}>
                                        {isOnline ? `${mic.db.toFixed(1)}` : "--"} <span className="text-xs">dB</span>
                                    </span>

                                    {/* Nombre del mic */}
                                    <span className="text-xs text-gray-500">
                                        {formatMicName(mic.mic)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Etiqueta puerta */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-700 px-4 py-1 rounded-full text-xs text-gray-400">
                        Puerta
                    </div>
                </div>
            </div>

            {/* Resumen estadisticas */}
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
        </div>
    );
}
