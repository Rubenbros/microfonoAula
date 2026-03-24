@echo off
title Frontend - Monitor de Ruido
REM Buscar Node.js local del proyecto o en ruta conocida
set "NODE_LOCAL=%~dp0..\nodejs\node-v22.14.0-win-x64"
if exist "%NODE_LOCAL%\node.exe" (
    set "PATH=%NODE_LOCAL%;%PATH%"
) else (
    set "PATH=C:\Users\Departamento\nodejs\node-v22.14.0-win-x64;%PATH%"
)
cd /d %~dp0..\frontend
echo Arrancando frontend...
call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: El frontend no pudo arrancar.
    echo.
)
pause
