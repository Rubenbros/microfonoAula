@echo off
title Backend - Monitor de Ruido
set "PATH=C:\Users\Departamento\nodejs\node-v22.14.0-win-x64;%PATH%"
set "USE_INTERNAL_BROKER=true"
cd /d %~dp0..\backend
echo Arrancando backend...
node src\index.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El backend no pudo arrancar.
    echo.
)
pause
