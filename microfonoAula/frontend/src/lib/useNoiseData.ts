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
type View = "dashboard" | "room" | "mic";

/** Estado del hook */
interface NoiseDataState {
    rooms: Map<string, RoomSummary>;
    connected: boolean;
    view: View;
    selectedRoom: string | null;
    selectedMic: string | null;
    history: HistoryReading[];
    loading: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

const MAX_SPARKLINE_POINTS = 30;

export function useNoiseData() {
    const [state, setState] = useState<NoiseDataState>({
        rooms: new Map(),
        connected: false,
        view: "dashboard",
        selectedRoom: null,
        selectedMic: null,
        history: [],
        loading: false,
    });

    const sparklineData = useRef<Map<string, number[]>>(new Map());
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

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

    // Volver atras
    const goBack = useCallback(() => {
        setState((prev) => {
            if (prev.view === "mic") {
                return { ...prev, view: "room", selectedMic: null, history: [] };
            }
            return { ...prev, view: "dashboard", selectedRoom: null, selectedMic: null, history: [] };
        });
    }, []);

    // Obtener sparkline de un aula
    const getSparkline = useCallback((roomId: string): number[] => {
        return sparklineData.current.get(roomId) || [];
    }, []);

    // Conectar al montar
    useEffect(() => {
        loadRooms();
        connect();

        return () => {
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
        history: state.history,
        loading: state.loading,
        selectRoom,
        selectMic,
        goBack,
        getSparkline,
        getRoomData: (roomId: string) => state.rooms.get(roomId) || null,
    };
}
