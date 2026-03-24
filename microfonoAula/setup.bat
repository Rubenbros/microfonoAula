@echo off
REM ============================================
REM Instalador completo - Monitor de Ruido
REM Instala TODO lo necesario automaticamente
REM ============================================

echo.
echo ========================================
echo   Instalando Monitor de Ruido en Aulas
echo ========================================
echo.

REM Guardar directorio raiz del proyecto
set "PROJECT_DIR=%~dp0"
set "NODE_VERSION=22.14.0"
set "NODE_DIR=%PROJECT_DIR%nodejs"
set "NODE_ZIP=node-v%NODE_VERSION%-win-x64.zip"
set "NODE_FOLDER=node-v%NODE_VERSION%-win-x64"

REM ============================================
REM [1/6] Node.js - descargar si no existe
REM ============================================
echo [1/6] Verificando Node.js...

REM Primero intentar Node.js local del proyecto
if exist "%NODE_DIR%\%NODE_FOLDER%\node.exe" (
    set "PATH=%NODE_DIR%\%NODE_FOLDER%;%PATH%"
    echo   Node.js local encontrado.
    goto :node_ok
)

REM Intentar Node.js en PATH del sistema
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   Node.js del sistema encontrado.
    goto :node_ok
)

REM Descargar Node.js portable
echo   Node.js no encontrado. Descargando v%NODE_VERSION%...
if not exist "%NODE_DIR%" mkdir "%NODE_DIR%"

REM Intentar con curl (disponible en Windows 10+)
curl -L -o "%NODE_DIR%\%NODE_ZIP%" "https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%" 2>nul
if %errorlevel% neq 0 (
    REM Intentar con PowerShell como fallback
    echo   Usando PowerShell para descargar...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%' -OutFile '%NODE_DIR%\%NODE_ZIP%'"
)

if not exist "%NODE_DIR%\%NODE_ZIP%" (
    echo   ERROR: No se pudo descargar Node.js.
    echo   Descargalo manualmente en https://nodejs.org y ponlo en %NODE_DIR%
    pause
    exit /b 1
)

echo   Descomprimiendo Node.js...
powershell -Command "Expand-Archive -Path '%NODE_DIR%\%NODE_ZIP%' -DestinationPath '%NODE_DIR%' -Force"
del "%NODE_DIR%\%NODE_ZIP%"

if not exist "%NODE_DIR%\%NODE_FOLDER%\node.exe" (
    echo   ERROR: No se pudo descomprimir Node.js.
    pause
    exit /b 1
)

set "PATH=%NODE_DIR%\%NODE_FOLDER%;%PATH%"
echo   Node.js v%NODE_VERSION% instalado en %NODE_DIR%

:node_ok
for /f "tokens=*" %%v in ('node --version') do echo   Version: %%v

REM ============================================
REM [2/6] Python (opcional - solo para firmware)
REM ============================================
echo.
echo [2/6] Verificando Python (opcional)...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   AVISO: Python no instalado. Solo es necesario para flashear firmware.
    echo   Si lo necesitas: https://python.org
    goto :skip_python
)
echo   Python OK

REM Instalar dependencias Python
pip install -r "%PROJECT_DIR%requirements.txt" --quiet 2>nul
if %errorlevel% neq 0 (
    echo   AVISO: No se pudieron instalar dependencias Python.
) else (
    echo   PlatformIO + pyserial OK
)
:skip_python

REM ============================================
REM [3/6] Docker (opcional - solo para MQTT externo)
REM ============================================
echo.
echo [3/6] Verificando Docker (opcional)...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   AVISO: Docker no instalado. El backend incluye broker MQTT integrado, no es necesario.
) else (
    echo   Docker OK
)

REM ============================================
REM [4/6] Dependencias backend
REM ============================================
echo.
echo [4/6] Instalando dependencias del backend...
cd /d "%PROJECT_DIR%backend"
call npm install --silent
if %errorlevel% neq 0 (
    echo   ERROR: Fallo al instalar dependencias del backend.
    pause
    exit /b 1
)
if not exist .env if exist .env.example copy .env.example .env
echo   Backend OK

REM ============================================
REM [5/6] Dependencias simulador
REM ============================================
echo.
echo [5/6] Instalando dependencias del simulador...
cd /d "%PROJECT_DIR%simulator"
call npm install --silent
echo   Simulador OK

REM ============================================
REM [6/6] Dependencias frontend
REM ============================================
echo.
echo [6/6] Instalando dependencias del frontend...
cd /d "%PROJECT_DIR%frontend"
call npm install --silent
if %errorlevel% neq 0 (
    echo   ERROR: Fallo al instalar dependencias del frontend.
    pause
    exit /b 1
)
echo   Frontend OK

REM Volver al directorio raiz
cd /d "%PROJECT_DIR%"

echo.
echo ========================================
echo   INSTALACION COMPLETADA!
echo ========================================
echo.
echo   Para arrancar el servidor:
echo      start.bat
echo.
echo   Esto abre el dashboard en http://localhost:3000
echo.
echo   Para flashear micros (requiere Python):
echo      1. Enchufa el ATOM Echo S3R por USB
echo      2. cd firmware
echo      3. python flash.py --wifi TU_SSID TU_PASSWORD
echo      4. python flash.py aula_01
echo.
pause
