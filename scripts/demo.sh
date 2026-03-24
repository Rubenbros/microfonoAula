#!/bin/bash
# ============================================
# Demo rapida - Monitor de Ruido en Aulas
# Arranca todo lo necesario para ver el sistema
# funcionando con datos simulados
# ============================================

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🎤 Monitor de Ruido en Aulas - DEMO       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Directorio raiz del proyecto
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ---- Paso 1: Broker MQTT ----
echo -e "${YELLOW}[1/4]${NC} Arrancando broker MQTT (Mosquitto)..."
if command -v docker &> /dev/null; then
    docker-compose up -d mosquitto 2>/dev/null || docker compose up -d mosquitto 2>/dev/null
    echo -e "${GREEN}  ✅ Mosquitto arrancado en puerto 1883${NC}"
else
    echo -e "${RED}  ❌ Docker no encontrado. Instala Docker o arranca un broker MQTT manualmente.${NC}"
    echo "     Alternativa sin Docker: npm install -g aedes-cli && aedes --port 1883"
    exit 1
fi

# Esperar a que Mosquitto este listo
sleep 2

# ---- Paso 2: Backend ----
echo -e "${YELLOW}[2/4]${NC} Instalando e iniciando backend..."
cd "$PROJECT_DIR/backend"
npm install --silent 2>/dev/null
cp -n .env.example .env 2>/dev/null || true
node src/index.js &
BACKEND_PID=$!
echo -e "${GREEN}  ✅ Backend en http://localhost:3001 (PID: $BACKEND_PID)${NC}"

sleep 2

# ---- Paso 3: Simulador ----
echo -e "${YELLOW}[3/4]${NC} Arrancando simulador (6 aulas virtuales)..."
cd "$PROJECT_DIR/simulator"
npm install --silent 2>/dev/null
node simulate.js --rooms 6 --interval 2000 &
SIMULATOR_PID=$!
echo -e "${GREEN}  ✅ Simulador activo (PID: $SIMULATOR_PID)${NC}"

sleep 1

# ---- Paso 4: Frontend ----
echo -e "${YELLOW}[4/4]${NC} Instalando e iniciando frontend..."
cd "$PROJECT_DIR/frontend"
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}  ✅ Frontend en http://localhost:3000${NC}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🎉 ¡Demo lista!                           ║"
echo "║                                              ║"
echo "║   Dashboard: http://localhost:3000            ║"
echo "║   API:       http://localhost:3001/api/rooms  ║"
echo "║   WebSocket: ws://localhost:3002              ║"
echo "║                                              ║"
echo "║   Ctrl+C para parar todo                     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Trap para limpiar procesos al salir
cleanup() {
    echo ""
    echo "Parando servicios..."
    kill $BACKEND_PID 2>/dev/null
    kill $SIMULATOR_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    echo "✅ Todo parado."
}
trap cleanup EXIT INT TERM

# Mantener el script vivo
wait
