#!/bin/bash
# Lead Hunter — Script de arranque
# Arranca backend + tunnel + actualiza Vercel automáticamente

CLOUDFLARED="/c/Users/Rubenbros/AppData/Local/Microsoft/WinGet/Packages/Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe/cloudflared.exe"
PROJECT_DIR="/c/Users/Rubenbros/ClaudeProjects/lead-hunter"
WEB_DIR="$PROJECT_DIR/web"
LOG_DIR="$PROJECT_DIR/data"
TUNNEL_LOG="$LOG_DIR/tunnel.log"

echo "🚀 Lead Hunter — Arrancando sistema..."

# 1. Matar procesos anteriores
echo "⏹️  Limpiando procesos anteriores..."
pkill -f "node src/index.js" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
sleep 1

# 2. Arrancar backend
echo "🔧 Arrancando backend..."
cd "$PROJECT_DIR"
nohup node src/index.js > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

# Verificar backend
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Backend OK"
else
  echo "❌ Backend no responde. Revisa $LOG_DIR/backend.log"
  exit 1
fi

# 3. Arrancar Cloudflare quick tunnel
echo "🌐 Arrancando tunnel..."
nohup "$CLOUDFLARED" tunnel --url http://localhost:3000 > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

# Esperar a que el tunnel genere URL
echo "   Esperando URL del tunnel..."
for i in $(seq 1 15); do
  TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 2
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ No se pudo obtener URL del tunnel. Revisa $TUNNEL_LOG"
  exit 1
fi

echo "✅ Tunnel: $TUNNEL_URL"

# Verificar que el tunnel funciona
if curl -s "$TUNNEL_URL/api/health" > /dev/null 2>&1; then
  echo "✅ Tunnel verificado (health check OK)"
else
  echo "⚠️  Tunnel creado pero health check no responde aún. Puede tardar unos segundos."
fi

# 4. Actualizar BACKEND_URL en Vercel
echo "☁️  Actualizando Vercel..."
cd "$WEB_DIR"
vercel env rm BACKEND_URL production --yes > /dev/null 2>&1
echo "$TUNNEL_URL" | vercel env add BACKEND_URL production > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ BACKEND_URL actualizada en Vercel"
else
  echo "⚠️  Error actualizando Vercel. Hazlo manual: vercel env add BACKEND_URL production"
fi

# 5. Redeploy
echo "🚀 Redesplegando panel..."
vercel --prod > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Panel redesplegado"
else
  echo "⚠️  Error en redeploy. Ejecuta: cd web && vercel --prod"
fi

echo ""
echo "========================================="
echo "🎯 Lead Hunter v2.0 — Sistema arrancado"
echo "========================================="
echo "Backend:  http://localhost:3000 (PID $BACKEND_PID)"
echo "Tunnel:   $TUNNEL_URL (PID $TUNNEL_PID)"
echo "Panel:    https://panel.t800labs.com"
echo "Login:    password configurado en Vercel"
echo "========================================="
echo ""
echo "Para parar todo: pkill -f 'node src/index.js' && pkill -f cloudflared"
