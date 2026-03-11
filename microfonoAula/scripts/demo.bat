@echo off
REM ============================================
REM Demo rapida - Monitor de Ruido en Aulas
REM Para Windows (Git Bash recomendado)
REM ============================================

echo.
echo ========================================
echo   Monitor de Ruido en Aulas - DEMO
echo ========================================
echo.

set PROJECT_DIR=%~dp0..

REM ---- Paso 1: Broker MQTT ----
echo [1/4] Arrancando broker MQTT...
cd /d "%PROJECT_DIR%"
docker compose up -d mosquitto
timeout /t 3 /nobreak >nul

REM ---- Paso 2: Backend ----
echo [2/4] Arrancando backend...
cd /d "%PROJECT_DIR%\backend"
call npm install --silent 2>nul
if not exist .env copy .env.example .env
start "Backend" /min cmd /c "node src/index.js"
timeout /t 2 /nobreak >nul

REM ---- Paso 3: Simulador ----
echo [3/4] Arrancando simulador (6 aulas)...
cd /d "%PROJECT_DIR%\simulator"
call npm install --silent 2>nul
start "Simulador" cmd /c "node simulate.js --rooms 6 --interval 2000"
timeout /t 1 /nobreak >nul

REM ---- Paso 4: Frontend ----
echo [4/4] Arrancando frontend...
cd /d "%PROJECT_DIR%\frontend"
call npm install --silent 2>nul
start "Frontend" /min cmd /c "npm run dev"

echo.
echo ========================================
echo   DEMO LISTA!
echo.
echo   Dashboard: http://localhost:3000
echo   API:       http://localhost:3001/api/rooms
echo   WebSocket: ws://localhost:3002
echo.
echo   Cierra esta ventana para parar
echo ========================================
echo.
pause
