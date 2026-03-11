"use client";

import { HistoryReading } from "@/lib/useNoiseData";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    ComposedChart,
} from "recharts";

interface NoiseChartProps {
    data: HistoryReading[];
    roomName: string;
    onClose: () => void;
    loading: boolean;
}

/** Formatea timestamp a hora legible */
function formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Formatea nombre del aula */
function formatRoomName(room: string): string {
    return room
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Tooltip personalizado */
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-lg">
            <p className="text-gray-400 mb-1">{formatTime(label)}</p>
            <p className="text-blue-400">
                Nivel: <span className="font-bold">{payload[0]?.value?.toFixed(1)} dB</span>
            </p>
            {payload[1] && (
                <p className="text-red-400">
                    Pico: <span className="font-bold">{payload[1]?.value?.toFixed(1)} dB</span>
                </p>
            )}
        </div>
    );
}

export default function NoiseChart({ data, roomName, onClose, loading }: NoiseChartProps) {
    // Calcular estadisticas
    const dbValues = data.map((d) => d.db);
    const avg = dbValues.length > 0
        ? dbValues.reduce((a, b) => a + b, 0) / dbValues.length
        : 0;
    const max = dbValues.length > 0 ? Math.max(...dbValues) : 0;
    const min = dbValues.length > 0 ? Math.min(...dbValues) : 0;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                {/* Cabecera */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {formatRoomName(roomName)}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Historico de nivel de ruido
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Estadisticas */}
                <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-800">
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Promedio</p>
                        <p className="text-2xl font-bold text-blue-400">{avg.toFixed(1)} dB</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Maximo</p>
                        <p className="text-2xl font-bold text-red-400">{max.toFixed(1)} dB</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Minimo</p>
                        <p className="text-2xl font-bold text-green-400">{min.toFixed(1)} dB</p>
                    </div>
                </div>

                {/* Grafico */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                            <span className="ml-3 text-gray-400">Cargando datos...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            No hay datos disponibles para este periodo
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            <ComposedChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={formatTime}
                                    stroke="#6b7280"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    domain={[20, 100]}
                                    stroke="#6b7280"
                                    tick={{ fontSize: 12 }}
                                    label={{
                                        value: "dB",
                                        position: "insideLeft",
                                        style: { fill: "#6b7280" },
                                    }}
                                />
                                <Tooltip content={<CustomTooltip />} />

                                {/* Zonas de referencia */}
                                <ReferenceLine
                                    y={50}
                                    stroke="#22c55e"
                                    strokeDasharray="5 5"
                                    strokeOpacity={0.5}
                                />
                                <ReferenceLine
                                    y={70}
                                    stroke="#ef4444"
                                    strokeDasharray="5 5"
                                    strokeOpacity={0.5}
                                />

                                {/* Area de nivel de ruido */}
                                <Area
                                    type="monotone"
                                    dataKey="db"
                                    fill="#3b82f6"
                                    fillOpacity={0.1}
                                    stroke="none"
                                />

                                {/* Linea de nivel de ruido */}
                                <Line
                                    type="monotone"
                                    dataKey="db"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Nivel"
                                />

                                {/* Linea de pico */}
                                <Line
                                    type="monotone"
                                    dataKey="peak"
                                    stroke="#ef4444"
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    dot={false}
                                    name="Pico"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Leyenda */}
                <div className="flex items-center justify-center gap-6 pb-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-blue-500" />
                        <span>Nivel actual</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500 border-dashed" style={{ borderTop: "2px dashed #ef4444", height: 0 }} />
                        <span>Pico</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-green-500 opacity-50" />
                        <span>50 dB (limite bajo)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500 opacity-50" />
                        <span>70 dB (limite alto)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
