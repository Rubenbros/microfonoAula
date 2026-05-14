"use client";

import { useEffect, useRef, useState } from "react";
import { MicReading } from "@/lib/useNoiseData";

interface RoomFloorplanProps {
    roomId: string;
    mics: MicReading[];
    onSelectMic: (micId: string) => void;
}

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

interface RoomLayout {
    walls: Rect;
    door: Point;
    blackboard: Point;
    mics: Record<string, Point>;
}

// Constantes del viewBox y elementos
const VIEW_W = 1000;
const VIEW_H = 560;
const DOOR_W = 65;
const DOOR_H = 80;
const BLACKBOARD_W = 25;
const BLACKBOARD_H = 140;
const WALL_MIN_W = 300;
const WALL_MIN_H = 240;
const MIC_INSET = 35; // margen del micro respecto a la pared

const CENTRAL_MIC_ID = "mic_central";

const DEFAULT_MIC_POSITIONS: Record<string, Point> = {
    mic_01: { x: 110, y: 110 },
    mic_02: { x: 340, y: 130 },
    mic_03: { x: 540, y: 130 },
    mic_06: { x: 540, y: 290 },
    mic_05: { x: 360, y: 440 },
    mic_04: { x: 540, y: 440 },
    mic_central: { x: 830, y: 290 },
};

function defaultLayout(): RoomLayout {
    return {
        walls: { x: 20, y: 20, w: 960, h: 520 },
        door: { x: 20, y: 460 },
        blackboard: { x: 955, y: 210 },
        mics: { ...DEFAULT_MIC_POSITIONS },
    };
}

function storageKey(roomId: string): string {
    return `mic-layout:${roomId}`;
}

function loadLayout(roomId: string): RoomLayout {
    if (typeof window === "undefined") return defaultLayout();
    try {
        const raw = window.localStorage.getItem(storageKey(roomId));
        if (!raw) return defaultLayout();
        const parsed = JSON.parse(raw);
        const base = defaultLayout();
        // Formato nuevo
        if (parsed && typeof parsed === "object" && parsed.walls && parsed.mics) {
            return {
                walls: { ...base.walls, ...parsed.walls },
                door: { ...base.door, ...parsed.door },
                blackboard: { ...base.blackboard, ...parsed.blackboard },
                mics: { ...base.mics, ...parsed.mics },
            };
        }
        // Formato antiguo: solo posiciones de micros
        if (parsed && typeof parsed === "object") {
            return { ...base, mics: { ...base.mics, ...parsed } };
        }
        return base;
    } catch {
        return defaultLayout();
    }
}

function saveLayout(roomId: string, layout: RoomLayout) {
    if (typeof window === "undefined") return;
    const slim: RoomLayout = {
        walls: {
            x: Math.round(layout.walls.x),
            y: Math.round(layout.walls.y),
            w: Math.round(layout.walls.w),
            h: Math.round(layout.walls.h),
        },
        door: { x: Math.round(layout.door.x), y: Math.round(layout.door.y) },
        blackboard: { x: Math.round(layout.blackboard.x), y: Math.round(layout.blackboard.y) },
        mics: Object.fromEntries(
            Object.entries(layout.mics).map(([id, p]) => [id, { x: Math.round(p.x), y: Math.round(p.y) }])
        ),
    };
    window.localStorage.setItem(storageKey(roomId), JSON.stringify(slim));
}

function dbColor(db: number): string {
    if (db < 50) return "#22c55e";
    if (db < 60) return "#eab308";
    if (db < 70) return "#f97316";
    return "#ef4444";
}

function micLabel(id: string): string {
    if (id === CENTRAL_MIC_ID) return "C";
    const n = id.replace("mic_", "");
    return String(parseInt(n, 10));
}

// Tipo discriminado para saber qué se está arrastrando
type DragTarget =
    | { type: "mic"; id: string }
    | { type: "door" }
    | { type: "blackboard" }
    | { type: "wall-corner"; corner: "tl" | "tr" | "bl" | "br" };

interface MicDotProps {
    x: number;
    y: number;
    mic: MicReading;
    isCentral: boolean;
    editMode: boolean;
    dragging: boolean;
    onClick: () => void;
    onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function MicDot({ x, y, mic, isCentral, editMode, dragging, onClick, onPointerDown }: MicDotProps) {
    const isOnline = mic.online !== false;
    const color = isOnline ? dbColor(mic.db) : "#4b5563";
    const halo = isOnline ? dbColor(mic.db) : "#374151";
    const radius = isCentral ? 42 : 32;

    return (
        <g
            transform={`translate(${x},${y})`}
            onClick={editMode ? undefined : onClick}
            onPointerDown={editMode ? onPointerDown : undefined}
            style={{ cursor: editMode ? (dragging ? "grabbing" : "grab") : "pointer", touchAction: editMode ? "none" : undefined }}
            className="mic-dot"
        >
            {isOnline && !editMode && (
                <circle r={radius + 4} fill={halo} opacity="0.25" style={{ pointerEvents: "none" }}>
                    <animate attributeName="r" values={`${radius + 4};${radius + 18};${radius + 4}`} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0;0.35" dur="2.2s" repeatCount="indefinite" />
                </circle>
            )}

            {editMode && (
                <circle
                    r={radius + 6}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    opacity={dragging ? 1 : 0.7}
                    style={{ pointerEvents: "none" }}
                />
            )}

            <circle r={radius} fill={color} stroke={isCentral ? "#a855f7" : "#ffffff"} strokeWidth={isCentral ? 3 : 2} />

            <text
                textAnchor="middle"
                dy={isCentral ? "-0.2em" : "-0.15em"}
                fontSize={isCentral ? 22 : 16}
                fontWeight="700"
                fill="white"
                style={{ userSelect: "none", pointerEvents: "none" }}
            >
                {micLabel(mic.mic)}
            </text>

            <text
                textAnchor="middle"
                dy={isCentral ? "1.4em" : "1.2em"}
                fontSize={isCentral ? 13 : 11}
                fontWeight="600"
                fill="white"
                style={{ userSelect: "none", pointerEvents: "none" }}
            >
                {isOnline ? `${mic.db.toFixed(1)} dB` : "--"}
            </text>

            {!isOnline && (
                <text textAnchor="middle" dy="2.8em" fontSize={10} fill="#9ca3af" style={{ pointerEvents: "none" }}>
                    offline
                </text>
            )}
        </g>
    );
}

export default function RoomFloorplan({ roomId, mics, onSelectMic }: RoomFloorplanProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [layout, setLayout] = useState<RoomLayout>(() => loadLayout(roomId));
    const [editMode, setEditMode] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [drag, setDrag] = useState<DragTarget | null>(null);
    const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

    useEffect(() => {
        setLayout(loadLayout(roomId));
        setEditMode(false);
        setDirty(false);
        setDrag(null);
    }, [roomId]);

    const micMap = new Map(mics.map(m => [m.mic, m]));

    const toSvgCoords = (clientX: number, clientY: number): Point | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const local = pt.matrixTransform(ctm.inverse());
        return { x: local.x, y: local.y };
    };

    const clampMicInsideWalls = (x: number, y: number, walls: Rect): Point => ({
        x: Math.max(walls.x + MIC_INSET, Math.min(walls.x + walls.w - MIC_INSET, x)),
        y: Math.max(walls.y + MIC_INSET, Math.min(walls.y + walls.h - MIC_INSET, y)),
    });

    const clampPointToView = (x: number, y: number, w: number, h: number): Point => ({
        x: Math.max(0, Math.min(VIEW_W - w, x)),
        y: Math.max(0, Math.min(VIEW_H - h, y)),
    });

    const resizeWallsByCorner = (
        walls: Rect,
        corner: "tl" | "tr" | "bl" | "br",
        cursor: Point
    ): Rect => {
        const left = walls.x;
        const top = walls.y;
        const right = walls.x + walls.w;
        const bottom = walls.y + walls.h;
        let newLeft = left;
        let newTop = top;
        let newRight = right;
        let newBottom = bottom;

        if (corner === "tl") {
            newLeft = Math.min(cursor.x, right - WALL_MIN_W);
            newTop = Math.min(cursor.y, bottom - WALL_MIN_H);
        } else if (corner === "tr") {
            newRight = Math.max(cursor.x, left + WALL_MIN_W);
            newTop = Math.min(cursor.y, bottom - WALL_MIN_H);
        } else if (corner === "bl") {
            newLeft = Math.min(cursor.x, right - WALL_MIN_W);
            newBottom = Math.max(cursor.y, top + WALL_MIN_H);
        } else if (corner === "br") {
            newRight = Math.max(cursor.x, left + WALL_MIN_W);
            newBottom = Math.max(cursor.y, top + WALL_MIN_H);
        }

        // Clamp al viewBox
        newLeft = Math.max(0, newLeft);
        newTop = Math.max(0, newTop);
        newRight = Math.min(VIEW_W, newRight);
        newBottom = Math.min(VIEW_H, newBottom);

        return { x: newLeft, y: newTop, w: newRight - newLeft, h: newBottom - newTop };
    };

    const beginDrag = (target: DragTarget, origin: Point) => (e: React.PointerEvent<SVGElement>) => {
        if (!editMode) return;
        e.stopPropagation();
        const local = toSvgCoords(e.clientX, e.clientY);
        if (!local) return;
        dragOffset.current = { dx: local.x - origin.x, dy: local.y - origin.y };
        setDrag(target);
        try {
            (e.target as Element).setPointerCapture?.(e.pointerId);
        } catch {
            // algunos navegadores no soportan; ignorar
        }
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!drag) return;
        const local = toSvgCoords(e.clientX, e.clientY);
        if (!local) return;
        setLayout(prev => {
            if (drag.type === "mic") {
                const tx = local.x - dragOffset.current.dx;
                const ty = local.y - dragOffset.current.dy;
                const clamped = clampMicInsideWalls(tx, ty, prev.walls);
                return { ...prev, mics: { ...prev.mics, [drag.id]: clamped } };
            }
            if (drag.type === "door") {
                const tx = local.x - dragOffset.current.dx;
                const ty = local.y - dragOffset.current.dy;
                return { ...prev, door: clampPointToView(tx, ty, DOOR_W, DOOR_H + 15) };
            }
            if (drag.type === "blackboard") {
                const tx = local.x - dragOffset.current.dx;
                const ty = local.y - dragOffset.current.dy;
                return { ...prev, blackboard: clampPointToView(tx, ty, BLACKBOARD_W, BLACKBOARD_H) };
            }
            if (drag.type === "wall-corner") {
                const cursor = {
                    x: local.x - dragOffset.current.dx,
                    y: local.y - dragOffset.current.dy,
                };
                return { ...prev, walls: resizeWallsByCorner(prev.walls, drag.corner, cursor) };
            }
            return prev;
        });
        setDirty(true);
    };

    const handlePointerUp = () => {
        if (drag) setDrag(null);
    };

    const handleSave = () => {
        saveLayout(roomId, layout);
        setDirty(false);
        setEditMode(false);
    };

    const handleCancel = () => {
        setLayout(loadLayout(roomId));
        setDirty(false);
        setEditMode(false);
        setDrag(null);
    };

    const handleReset = () => {
        setLayout(defaultLayout());
        setDirty(true);
    };

    const { walls, door, blackboard, mics: micPositions } = layout;
    const cornerSize = 16;
    const corners: { id: "tl" | "tr" | "bl" | "br"; x: number; y: number; cursor: string }[] = [
        { id: "tl", x: walls.x, y: walls.y, cursor: "nwse-resize" },
        { id: "tr", x: walls.x + walls.w, y: walls.y, cursor: "nesw-resize" },
        { id: "bl", x: walls.x, y: walls.y + walls.h, cursor: "nesw-resize" },
        { id: "br", x: walls.x + walls.w, y: walls.y + walls.h, cursor: "nwse-resize" },
    ];

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">
                    Plano del aula
                </h3>

                <div className="flex items-center gap-3 flex-wrap">
                    {!editMode && (
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> &lt;50
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 50-60
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 60-70
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> &gt;70
                            </span>
                        </div>
                    )}

                    {editMode ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-300 italic mr-1">
                                Arrastra micros, puerta, pizarra o las esquinas de las paredes
                            </span>
                            <button
                                onClick={handleReset}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                                title="Restaurar layout por defecto"
                            >
                                Restaurar
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!dirty}
                                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                            title="Editar layout del aula"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar layout
                        </button>
                    )}
                </div>
            </div>

            <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full h-auto select-none"
                style={{ maxHeight: "520px", touchAction: editMode ? "none" : undefined }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <defs>
                    <pattern id="floorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                </defs>

                {/* Suelo */}
                <rect x={walls.x} y={walls.y} width={walls.w} height={walls.h} fill="url(#floorGrid)" />

                {/* Paredes */}
                <rect
                    x={walls.x}
                    y={walls.y}
                    width={walls.w}
                    height={walls.h}
                    fill="none"
                    stroke={editMode ? "#60a5fa" : "#6b7280"}
                    strokeWidth="4"
                    rx="8"
                />

                {/* PUERTA */}
                <g
                    transform={`translate(${door.x},${door.y})`}
                    onPointerDown={beginDrag({ type: "door" }, door)}
                    style={{ cursor: editMode ? (drag?.type === "door" ? "grabbing" : "grab") : "default", touchAction: editMode ? "none" : undefined }}
                >
                    {editMode && (
                        <rect
                            x={-6}
                            y={-6}
                            width={DOOR_W + 12}
                            height={DOOR_H + 24}
                            fill="rgba(96,165,250,0.08)"
                            stroke="#60a5fa"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            rx={4}
                        />
                    )}
                    {/* hueco de la puerta */}
                    <line x1={0} y1={0} x2={0} y2={DOOR_H} stroke="#1f2937" strokeWidth="6" />
                    {/* hoja de la puerta */}
                    <line x1={0} y1={0} x2={DOOR_W} y2={DOOR_H} stroke="#9ca3af" strokeWidth="2" />
                    {/* arco de apertura */}
                    <path d={`M 0 0 A 80 80 0 0 1 ${DOOR_W} ${DOOR_H}`} fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="3 3" />
                    <text x={5} y={DOOR_H + 15} fontSize="11" fill="#9ca3af" fontStyle="italic" style={{ pointerEvents: "none" }}>
                        Puerta
                    </text>
                </g>

                {/* PIZARRA */}
                <g
                    transform={`translate(${blackboard.x},${blackboard.y})`}
                    onPointerDown={beginDrag({ type: "blackboard" }, blackboard)}
                    style={{ cursor: editMode ? (drag?.type === "blackboard" ? "grabbing" : "grab") : "default", touchAction: editMode ? "none" : undefined }}
                >
                    {editMode && (
                        <rect
                            x={-6}
                            y={-6}
                            width={BLACKBOARD_W + 12}
                            height={BLACKBOARD_H + 12}
                            fill="rgba(96,165,250,0.08)"
                            stroke="#60a5fa"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            rx={4}
                        />
                    )}
                    <rect x={0} y={0} width={BLACKBOARD_W} height={BLACKBOARD_H} fill="#14532d" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" rx="2" />
                    <text
                        x={-15}
                        y={BLACKBOARD_H / 2}
                        fontSize="12"
                        fill="#9ca3af"
                        fontStyle="italic"
                        transform={`rotate(90 -15 ${BLACKBOARD_H / 2})`}
                        style={{ pointerEvents: "none" }}
                    >
                        Pizarra
                    </text>
                </g>

                {/* Micros */}
                {Object.entries(micPositions).map(([micId, pos]) => {
                    const mic = micMap.get(micId);
                    if (!mic) return null;
                    return (
                        <MicDot
                            key={micId}
                            x={pos.x}
                            y={pos.y}
                            mic={mic}
                            isCentral={micId === CENTRAL_MIC_ID}
                            editMode={editMode}
                            dragging={drag?.type === "mic" && drag.id === micId}
                            onClick={() => onSelectMic(micId)}
                            onPointerDown={beginDrag({ type: "mic", id: micId }, pos)}
                        />
                    );
                })}

                {/* Handles de esquina para redimensionar paredes (solo en edit mode) */}
                {editMode && corners.map(c => {
                    const isDragging = drag?.type === "wall-corner" && drag.corner === c.id;
                    return (
                        <rect
                            key={c.id}
                            x={c.x - cornerSize / 2}
                            y={c.y - cornerSize / 2}
                            width={cornerSize}
                            height={cornerSize}
                            fill={isDragging ? "#1d4ed8" : "#60a5fa"}
                            stroke="#0b1220"
                            strokeWidth={2}
                            rx={2}
                            style={{ cursor: c.cursor, touchAction: "none" }}
                            onPointerDown={beginDrag({ type: "wall-corner", corner: c.id }, { x: c.x, y: c.y })}
                        />
                    );
                })}
            </svg>

            <style jsx>{`
                :global(.mic-dot) {
                    transition: filter 0.15s ease;
                }
                :global(.mic-dot:hover) {
                    filter: brightness(1.25) drop-shadow(0 0 8px rgba(255,255,255,0.4));
                }
            `}</style>
        </div>
    );
}
