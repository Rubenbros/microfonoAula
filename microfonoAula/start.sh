#!/bin/bash
# ============================================
# Arrancar servidor completo (sin Docker)
# Backend (con broker MQTT integrado) + Frontend
# ============================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "========================================"
echo "  Monitor de Ruido en Aulas - SERVER"
echo "========================================"
echo ""

# Buscar Node.js (portable o en PATH)
if ! command -v node &>/dev/null; then
    NODE_PORTABLE="/c/Users/Departamento/nodejs/node-v22.14.0-win-x64"
    if [ -f "$NODE_PORTABLE/node.exe" ]; then
        export PATH="$NODE_PORTABLE:$PATH"
        echo "[NODE] Usando Node.js portable"
    else
        echo "[ERROR] Node.js no encontrado."
        exit 1
    fi
fi

echo "[NODE] $(node --version)"

# Matar procesos node previos
taskkill //IM node.exe //F 2>/dev/null

# Instalar dependencias si faltan
if [ ! -d "$PROJECT_DIR/backend/node_modules" ]; then
    echo "[SETUP] Instalando dependencias del backend..."
    cd "$PROJECT_DIR/backend" && npm install --silent
fi
if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    echo "[SETUP] Instalando dependencias del frontend..."
    cd "$PROJECT_DIR/frontend" && npm install --silent
fi

# Limpiar al salir
cleanup() {
    echo ""
    echo "Parando servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    taskkill //IM node.exe //F 2>/dev/null
    echo "Servicios parados."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Backend con broker MQTT integrado
echo "[1/2] Arrancando backend + broker MQTT..."
cd "$PROJECT_DIR/backend"
USE_INTERNAL_BROKER=true node src/index.js &
BACKEND_PID=$!
sleep 3

# Frontend
echo "[2/2] Arrancando frontend..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  SERVIDOR LISTO!"
echo ""
echo "  Dashboard: http://localhost:3000"
echo "  API:       http://localhost:3001/api/rooms"
echo "  WebSocket: ws://localhost:3002"
echo "  MQTT:      localhost:1883"
echo ""
echo "  Ctrl+C para parar todo"
echo "========================================"
echo ""

wait
