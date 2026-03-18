@echo off
REM ============================================
REM Arrancar servidor completo (sin Docker)
REM Backend (con broker MQTT integrado) + Frontend
REM ============================================

title Monitor de Ruido - Launcher

echo.
echo ========================================
echo   Monitor de Ruido en Aulas - SERVER
echo ========================================
echo.

set "PATH=C:\Users\Departamento\nodejs\node-v22.14.0-win-x64;%PATH%"

REM ---- Verificar Node.js ----
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no encontrado.
    pause
    exit /b 1
)

REM ---- Matar procesos node previos ----
taskkill /IM node.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul

REM ---- Instalar dependencias si faltan ----
if not exist "%~dp0backend\node_modules" (
    echo [SETUP] Instalando dependencias del backend...
    cd /d "%~dp0backend"
    call npm install
)
if not exist "%~dp0frontend\node_modules" (
    echo [SETUP] Instalando dependencias del frontend...
    cd /d "%~dp0frontend"
    call npm install
)

REM ---- Arrancar ----
echo [1/2] Arrancando backend + broker MQTT...
start "" "%~dp0scripts\run_backend.bat"
timeout /t 4 /nobreak >nul

echo [2/2] Arrancando frontend...
start "" "%~dp0scripts\run_frontend.bat"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   SERVIDOR LISTO!
echo.
echo   Dashboard: http://localhost:3000
echo   API:       http://localhost:3001/api/rooms
echo   MQTT:      localhost:1883
echo.
echo   Pulsa cualquier tecla para PARAR todo.
echo ========================================
echo.
pause

echo Parando servicios...
taskkill /IM node.exe /F >nul 2>&1
echo Servicios parados.
