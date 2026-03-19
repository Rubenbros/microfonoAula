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

function getBgGradient(db: number): string {
    if (db < 50) return "from-green-500/10 to-green-500/5";
    if (db < 70) return "from-yellow-500/10 to-yellow-500/5";
    return "from-red-500/10 to-red-500/5";
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

/** Componente boton de microfono reutilizable */
function MicButton({ mic, onClick }: { mic: MicReading; onClick: () => void }) {
    const isOnline = mic.online !== false;
    const dotColor = isOnline ? getMicColor(mic.db) : "bg-gray-600";
    const borderColor = isOnline ? getMicBorderColor(mic.db) : "border-gray-600/50";
    const textColor = isOnline ? getMicTextColor(mic.db) : "text-gray-600";

    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2
                ${borderColor} bg-gray-900/50
                hover:scale-105 hover:bg-gray-800/50 transition-all duration-200
                cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
        >
            <div className={`w-12 h-12 rounded-full ${dotColor} ${isOnline ? "animate-pulse" : ""} shadow-lg flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4-4h8m-4-12a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z" />
                </svg>
            </div>
            <span className={`text-xl font-bold tabular-nums ${textColor}`}>
                {isOnline ? `${mic.db.toFixed(1)}` : "--"} <span className="text-xs">dB</span>
            </span>
            <span className="text-xs text-gray-500">
                {formatMicName(mic.mic)}
            </span>
        </button>
    );
}

export default function RoomDetailView({ roomData, onSelectMic, onBack }: RoomDetailViewProps) {
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
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${roomColor} db-pulse`}>
                            {roomData.db.toFixed(1)} <span className="text-lg">dB</span>
                        </div>
                        <div className={`text-sm ${roomColor}`}>{roomLevel}</div>
                    </div>
                </div>
            </div>

            {/* Dos modelos lado a lado */}
            <div className={`grid ${hasCentral ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-6 mb-6`}>

                {/* MODELO 1: Distribuido (6 micros) */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">
                                Modelo Distribuido
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">6 microfonos ATOM Echo</p>
                        </div>
                        {onlineDistributed.length > 0 && (
                            <div className="text-right">
                                <div className={`text-2xl font-bold ${getMicTextColor(distributedAvg)}`}>
                                    {distributedAvg.toFixed(1)} <span className="text-sm">dB</span>
                                </div>
                                <div className="text-xs text-gray-500">media</div>
                            </div>
                        )}
                    </div>

                    {/* Mapa del aula 2x3 */}
                    <div className="relative bg-gray-800/50 border-2 border-gray-700 rounded-xl p-6">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 px-3 py-0.5 rounded-full text-xs text-gray-400">
                            Pizarra
                        </div>

                        <div className="grid grid-rows-3 grid-cols-2 gap-4">
                            {MIC_POSITIONS.map((pos, index) => {
                                const mic = distributedMics[index];
                                if (!mic) return <div key={index} />;
                                return (
                                    <MicButton
                                        key={mic.mic}
                                        mic={mic}
                                        onClick={() => onSelectMic(mic.mic)}
                                    />
                                );
                            })}
                        </div>

                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-700 px-3 py-0.5 rounded-full text-xs text-gray-400">
                            Puerta
                        </div>
                    </div>

                    {/* Stats distribuido */}
                    <div className="grid grid-cols-3 gap-3 mt-5">
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">Media</p>
                            <p className="text-lg font-bold text-blue-400">
                                {onlineDistributed.length > 0 ? `${distributedAvg.toFixed(1)}` : "--"} <span className="text-xs">dB</span>
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">Pico</p>
                            <p className="text-lg font-bold text-red-400">
                                {onlineDistributed.length > 0 ? `${distributedPeak.toFixed(1)}` : "--"} <span className="text-xs">dB</span>
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">Online</p>
                            <p className="text-lg font-bold text-green-400">
                                {onlineDistributed.length}/{distributedMics.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* MODELO 2: Central (Core2) */}
                {hasCentral && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
                                    Modelo Central
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">1 microfono M5Stack Core2</p>
                            </div>
                            {centralOnline && (
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${getMicTextColor(centralMic.db)}`}>
                                        {centralMic.db.toFixed(1)} <span className="text-sm">dB</span>
                                    </div>
                                    <div className="text-xs text-gray-500">lectura</div>
                                </div>
                            )}
                        </div>

                        {/* Representacion visual del aula con micro central */}
                        <div className="relative bg-gray-800/50 border-2 border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center"
                             style={{ minHeight: "320px" }}>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 px-3 py-0.5 rounded-full text-xs text-gray-400">
                                Pizarra
                            </div>

                            {/* Micro central grande en el centro */}
                            <button
                                onClick={() => onSelectMic("mic_central")}
                                className={`
                                    flex flex-col items-center gap-3 p-8 rounded-2xl border-2
                                    ${centralOnline ? getMicBorderColor(centralMic.db) : "border-gray-600/50"}
                                    bg-gradient-to-b ${centralOnline ? getBgGradient(centralMic.db) : "from-gray-600/10 to-gray-600/5"}
                                    hover:scale-105 transition-all duration-200
                                    cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500
                                `}
                            >
                                {/* Circulo grande con icono */}
                                <div className={`w-24 h-24 rounded-full ${centralOnline ? getMicColor(centralMic.db) : "bg-gray-600"} ${centralOnline ? "animate-pulse" : ""} shadow-xl flex items-center justify-center`}>
                                    <svg className="w-12 h-12 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4-4h8m-4-12a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z" />
                                    </svg>
                                </div>

                                {/* Valor dB */}
                                <span className={`text-4xl font-bold tabular-nums ${centralOnline ? getMicTextColor(centralMic.db) : "text-gray-600"}`}>
                                    {centralOnline ? `${centralMic.db.toFixed(1)}` : "--"} <span className="text-lg">dB</span>
                                </span>

                                {/* Label */}
                                <span className="text-sm text-gray-400">
                                    Micro Central
                                </span>

                                {centralOnline && (
                                    <span className={`text-xs ${getMicTextColor(centralMic.db)}`}>
                                        {getNoiseLabel(centralMic.db)}
                                    </span>
                                )}
                            </button>

                            {/* Indicador de posicion */}
                            <p className="text-xs text-gray-600 mt-4">Centro del aula</p>

                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-700 px-3 py-0.5 rounded-full text-xs text-gray-400">
                                Puerta
                            </div>
                        </div>

                        {/* Stats central */}
                        <div className="grid grid-cols-3 gap-3 mt-5">
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">Nivel</p>
                                <p className="text-lg font-bold text-purple-400">
                                    {centralOnline ? `${centralMic.db.toFixed(1)}` : "--"} <span className="text-xs">dB</span>
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">Pico</p>
                                <p className="text-lg font-bold text-red-400">
                                    {centralOnline ? `${centralMic.peak.toFixed(1)}` : "--"} <span className="text-xs">dB</span>
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">Estado</p>
                                <p className={`text-lg font-bold ${centralOnline ? "text-green-400" : "text-red-400"}`}>
                                    {centralOnline ? "Online" : "Offline"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
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
