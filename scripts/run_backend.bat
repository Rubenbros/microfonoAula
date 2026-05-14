@echo off
title Backend - Monitor de Ruido
REM Buscar Node.js local del proyecto o en ruta conocida
set "NODE_LOCAL=%~dp0..\nodejs\node-v22.14.0-win-x64"
if exist "%NODE_LOCAL%\node.exe" (
    set "PATH=%NODE_LOCAL%;%PATH%"
) else (
    set "PATH=C:\Users\Departamento\nodejs\node-v22.14.0-win-x64;%PATH%"
)
REM Lee configuracion de ..\.env si existe (MQTT_BROKER, MQTT_PORT, etc).
REM Si no hay .env, el backend usa defaults (broker.hivemq.com).
cd /d %~dp0..\backend
echo Arrancando backend (modo local, sin Docker)...
node src\index.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El backend no pudo arrancar.
    echo.
)
pause
