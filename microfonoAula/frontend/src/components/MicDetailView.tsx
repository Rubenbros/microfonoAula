"use client";

import { MicReading, HistoryReading } from "@/lib/useNoiseData";
import NoiseChart from "./NoiseChart";

interface MicDetailViewProps {
    roomName: string;
    micId: string;
    micData: MicReading | null;
    history: HistoryReading[];
    loading: boolean;
    onBack: () => void;
}

function formatName(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getMicTextColor(db: number): string {
    if (db < 50) return "text-green-400";
    if (db < 70) return "text-yellow-400";
    return "text-red-400";
}

export default function MicDetailView({ roomName, micId, micData, history, loading, onBack }: MicDetailViewProps) {
    return (
        <div>
            {/* Breadcrumb */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a {formatName(roomName)}
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            {formatName(micId)}
                        </h2>
                        <p className="text-gray-400 mt-1">
                            {formatName(roomName)}
                        </p>
                    </div>
                    {micData && (
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${getMicTextColor(micData.db)} db-pulse`}>
                                {micData.db.toFixed(1)} <span className="text-lg">dB</span>
                            </div>
                            <div className="text-sm text-gray-400">
                                Pico: {micData.peak.toFixed(1)} dB
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Grafico embebido (no modal) */}
            <NoiseChart
                data={history}
                roomName={`${formatName(roomName)} - ${formatName(micId)}`}
                loading={loading}
                embedded={true}
            />
        </div>
    );
}
