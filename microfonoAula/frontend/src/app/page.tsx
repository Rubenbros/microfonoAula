"use client";

import { useNoiseData } from "@/lib/useNoiseData";
import RoomCard from "@/components/RoomCard";
import NoiseChart from "@/components/NoiseChart";

export default function HomePage() {
    const {
        rooms,
        connected,
        history,
        selectedRoom,
        loading,
        loadHistory,
        closeHistory,
        getSparkline,
    } = useNoiseData();

    // Ordenar aulas por nombre
    const sortedRooms = [...rooms].sort((a, b) => a.room.localeCompare(b.room));

    // Calcular estadisticas generales
    const totalRooms = rooms.length;
    const avgDb = totalRooms > 0
        ? rooms.reduce((sum, r) => sum + r.db, 0) / totalRooms
        : 0;
    const roomsAboveThreshold = rooms.filter((r) => r.db > 70).length;

    return (
        <div>
            {/* Barra de estado */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                        <span className="text-sm text-gray-400">
                            {connected ? "Conectado" : "Desconectado"}
                        </span>
                    </div>
                    <div className="text-sm text-gray-500">
                        {totalRooms} {totalRooms === 1 ? "aula" : "aulas"} monitorizadas
                    </div>
                </div>

                {/* Resumen rapido */}
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-gray-400">
                        Promedio: <span className="text-white font-medium">{avgDb.toFixed(1)} dB</span>
                    </div>
                    {roomsAboveThreshold > 0 && (
                        <div className="text-red-400 font-medium">
                            {roomsAboveThreshold} {roomsAboveThreshold === 1 ? "aula" : "aulas"} con ruido alto
                        </div>
                    )}
                </div>
            </div>

            {/* Grid de aulas */}
            {sortedRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4-4h8m-4-12a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z" />
                    </svg>
                    <p className="text-lg font-medium mb-1">Sin datos de aulas</p>
                    <p className="text-sm">
                        Esperando conexion de los microfonos ATOM Echo S3R...
                    </p>
                    <p className="text-xs mt-4 text-gray-600">
                        Los dispositivos envian datos via MQTT al topic <code className="bg-gray-800 px-1 rounded">aulas/+/noise</code>
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedRooms.map((room) => (
                        <RoomCard
                            key={room.room}
                            reading={room}
                            sparkline={getSparkline(room.room)}
                            onClick={() => loadHistory(room.room)}
                        />
                    ))}
                </div>
            )}

            {/* Modal de historico */}
            {selectedRoom && (
                <NoiseChart
                    data={history}
                    roomName={selectedRoom}
                    onClose={closeHistory}
                    loading={loading}
                />
            )}
        </div>
    );
}
