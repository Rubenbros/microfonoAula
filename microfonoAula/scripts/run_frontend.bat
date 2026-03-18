@echo off
title Frontend - Monitor de Ruido
set "PATH=C:\Users\Departamento\nodejs\node-v22.14.0-win-x64;%PATH%"
cd /d %~dp0..\frontend
echo Arrancando frontend...
call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El frontend no pudo arrancar.
    echo.
)
pause
