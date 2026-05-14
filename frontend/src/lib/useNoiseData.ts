"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** Lectura individual de un microfono */
export interface MicReading {
    room: string;
    mic: string;
    db: number;
    peak: number;
    timestamp: number;
    online?: boolean;
}

/** Resumen de un aula (media de todos sus mics) */
export interface RoomSummary {
    room: string;
    db: number;
    peak: number;
    micCount: number;
    onlineCount: number;
    mics: MicReading[];
}

/** Lectura historica con id */
export interface HistoryReading {
    id: number;
    room: string;
    mic?: string;
    db: number;
    peak: number;
    timestamp: number;
}

/** Vista actual del dashboard */
type View = "dashboard" | "room" | "mic" | "schedule" | "compare";

/** Estado del hook */
interface NoiseDataState {
    rooms: Map<string, RoomSummary>;
    connected: boolean;
    view: View;
    selectedRoom: string | null;
    selectedMic: string | null;
    selectedDate: string | null; // YYYY-MM-DD, solo para vista schedule
    history: HistoryReading[];
    loading: boolean;
}

// En produccion detras de Caddy: rutas relativas (API en /api, WS en /ws).
// En dev sin backend proxy: defaults a localhost.
function resolveApiUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== "undefined") return "";
    return "http://localhost:3001";
}

function resolveWsUrl(): string {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    if (typeof window !== "undefined") {
        // Dev directo: Next.js en 3000 + backend WS en 3002
        if (window.location.hostname === "localhost" && window.location.port === "3000") {
            return "ws://localhost:3002";
        }
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${proto}//${window.location.host}/ws`;
    }
    return "ws://localhost:3002";
}

const API_URL = resolveApiUrl();
const WS_URL = resolveWsUrl();

const MAX_SPARKLINE_POINTS = 30;

export function useNoiseData() {
    const [state, setState] = useState<NoiseDataState>({
        rooms: new Map(),
        connected: false,
        view: "dashboard",
        selectedRoom: null,
        selectedMic: null,
        selectedDate: null,
        history: [],
        loading: false,
    });

    const sparklineData = useRef<Map<string, number[]>>(new Map());
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Conectar WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[WS] Conectado");
            setState((prev) => ({ ...prev, connected: true }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "init") {
                    const rooms = new Map<string, RoomSummary>();
                    for (const [room, summary] of Object.entries(message.data)) {
                        rooms.set(room, summary as RoomSummary);
                    }
                    setState((prev) => ({ ...prev, rooms }));
                } else if (message.type === "room_update") {
                    const summary = message.data as RoomSummary;
                    setState((prev) => {
                        const newRooms = new Map(prev.rooms);
                        newRooms.set(summary.room, summary);
                        return { ...prev, rooms: newRooms };
                    });

                    // Actualizar sparkline del aula
                    const current = sparklineData.current.get(summary.room) || [];
                    current.push(summary.db);
                    if (current.length > MAX_SPARKLINE_POINTS) current.shift();
                    sparklineData.current.set(summary.room, current);
                } else if (message.type === "mic_update") {
                    // Mic updates are already reflected via room_update
                }
            } catch (err) {
                console.error("[WS] Error parseando mensaje:", err);
            }
        };

        ws.onclose = () => {
            console.log("[WS] Desconectado. Reconectando en 3s...");
            setState((prev) => ({ ...prev, connected: false }));
            reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
            console.error("[WS] Error:", err);
            ws.close();
        };
    }, []);

    // Cargar aulas iniciales via REST
    const loadRooms = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/rooms`);
            const data = await res.json();
            const rooms = new Map<string, RoomSummary>();
            for (const room of data.rooms) {
                rooms.set(room.room, room);
            }
            setState((prev) => ({ ...prev, rooms }));
        } catch (err) {
            console.error("[API] Error cargando aulas:", err);
        }
    }, []);

    // Navegar a vista de aula
    const selectRoom = useCallback((roomId: string) => {
        setState((prev) => ({
            ...prev,
            view: "room",
            selectedRoom: roomId,
            selectedMic: null,
            history: [],
        }));
    }, []);

    // Navegar a vista de microfono (carga historico)
    const selectMic = useCallback(async (roomId: string, micId: string) => {
        setState((prev) => ({
            ...prev,
            view: "mic",
            selectedRoom: roomId,
            selectedMic: micId,
            loading: true,
        }));

        try {
            const res = await fetch(`${API_URL}/api/rooms/${roomId}/mics/${micId}/history`);
            const data = await res.json();
            setState((prev) => ({
                ...prev,
                history: data.readings,
                loading: false,
            }));
        } catch (err) {
            console.error("[API] Error cargando historico:", err);
            setState((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    // Navegar al comparador
    const selectCompare = useCallback(() => {
        setState((prev) => ({
            ...prev,
            view: "compare",
            selectedRoom: null,
            selectedMic: null,
            selectedDate: null,
            history: [],
        }));
    }, []);

    // Navegar a vista de horario (opcionalmente con fecha inicial YYYY-MM-DD)
    const selectSchedule = useCallback((roomId: string, date?: string) => {
        setState((prev) => ({
            ...prev,
            view: "schedule",
            selectedRoom: roomId,
            selectedMic: null,
            selectedDate: date || null,
            history: [],
        }));
    }, []);

    // Volver atras
    const goBack = useCallback(() => {
        setState((prev) => {
            if (prev.view === "mic") {
                return { ...prev, view: "room", selectedMic: null, history: [] };
            }
            if (prev.view === "schedule") {
                return { ...prev, view: "room", history: [] };
            }
            return { ...prev, view: "dashboard", selectedRoom: null, selectedMic: null, history: [] };
        });
    }, []);

    // Obtener sparkline de un aula
    const getSparkline = useCallback((roomId: string): number[] => {
        return sparklineData.current.get(roomId) || [];
    }, []);

    // Conectar al montar + polling periodico como respaldo
    useEffect(() => {
        loadRooms();
        connect();

        // Polling cada 5s para detectar nuevos micros y cambios de estado
        const pollInterval = setInterval(() => {
            loadRooms();
        }, 5000);

        return () => {
            clearInterval(pollInterval);
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect, loadRooms]);

    return {
        rooms: Array.from(state.rooms.values()),
        connected: state.connected,
        view: state.view,
        selectedRoom: state.selectedRoom,
        selectedMic: state.selectedMic,
        selectedDate: state.selectedDate,
        history: state.history,
        loading: state.loading,
        selectRoom,
        selectMic,
        selectSchedule,
        selectCompare,
        goBack,
        getSparkline,
        getRoomData: (roomId: string) => state.rooms.get(roomId) || null,
    };
}
