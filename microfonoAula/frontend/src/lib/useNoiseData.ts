"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** Lectura de ruido de un aula */
export interface NoiseReading {
    room: string;
    db: number;
    peak: number;
    timestamp: number;
}

/** Lectura historica con id */
export interface HistoryReading extends NoiseReading {
    id: number;
}

/** Estado del hook */
interface NoiseDataState {
    rooms: Map<string, NoiseReading>;
    connected: boolean;
    history: HistoryReading[];
    selectedRoom: string | null;
    loading: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

/** Maximo de lecturas en el sparkline */
const MAX_SPARKLINE_POINTS = 30;

export function useNoiseData() {
    const [state, setState] = useState<NoiseDataState>({
        rooms: new Map(),
        connected: false,
        history: [],
        selectedRoom: null,
        loading: false,
    });

    // Historico reciente por aula para sparklines
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
                    // Estado inicial: todas las aulas
                    const rooms = new Map<string, NoiseReading>();
                    for (const [room, reading] of Object.entries(message.data)) {
                        rooms.set(room, reading as NoiseReading);
                    }
                    setState((prev) => ({ ...prev, rooms }));
                } else if (message.type === "update") {
                    // Actualizacion de un aula
                    const reading = message.data as NoiseReading;
                    setState((prev) => {
                        const newRooms = new Map(prev.rooms);
                        newRooms.set(reading.room, reading);
                        return { ...prev, rooms: newRooms };
                    });

                    // Actualizar sparkline
                    const current = sparklineData.current.get(reading.room) || [];
                    current.push(reading.db);
                    if (current.length > MAX_SPARKLINE_POINTS) {
                        current.shift();
                    }
                    sparklineData.current.set(reading.room, current);
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
            const rooms = new Map<string, NoiseReading>();
            for (const room of data.rooms) {
                rooms.set(room.room, room);
            }
            setState((prev) => ({ ...prev, rooms }));
        } catch (err) {
            console.error("[API] Error cargando aulas:", err);
        }
    }, []);

    // Cargar historico de un aula
    const loadHistory = useCallback(async (roomId: string, from?: number, to?: number) => {
        setState((prev) => ({ ...prev, selectedRoom: roomId, loading: true }));
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from.toString());
            if (to) params.set("to", to.toString());

            const res = await fetch(`${API_URL}/api/rooms/${roomId}/history?${params}`);
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

    // Cerrar detalle
    const closeHistory = useCallback(() => {
        setState((prev) => ({ ...prev, selectedRoom: null, history: [] }));
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
        history: state.history,
        selectedRoom: state.selectedRoom,
        loading: state.loading,
        loadHistory,
        closeHistory,
        getSparkline,
    };
}
