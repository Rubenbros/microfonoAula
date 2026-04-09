@echo off
title Backend - Monitor de Ruido
REM Buscar Node.js local del proyecto o en ruta conocida
set "NODE_LOCAL=%~dp0..\nodejs\node-v22.14.0-win-x64"
if exist "%NODE_LOCAL%\node.exe" (
    set "PATH=%NODE_LOCAL%;%PATH%"
) else (
    set "PATH=C:\Users\Departamento\nodejs\node-v22.14.0-win-x64;%PATH%"
)
REM Broker MQTT externo (mismo que el firmware)
set "MQTT_BROKER=mqtt://broker.hivemq.com"
set "MQTT_PORT=1883"
set "USE_INTERNAL_BROKER=false"
cd /d %~dp0..\backend
echo Arrancando backend (MQTT: broker.hivemq.com)...
node src\index.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El backend no pudo arrancar.
    echo.
)
pause
