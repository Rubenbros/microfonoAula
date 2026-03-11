@echo off
REM ============================================
REM Instalador completo - Monitor de Ruido
REM Ejecutar en cualquier PC con Node.js + Python + Docker
REM ============================================

echo.
echo ========================================
echo   Instalando Monitor de Ruido en Aulas
echo ========================================
echo.

REM Verificar requisitos
echo [1/5] Verificando requisitos...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Node.js no instalado. Descarga en https://nodejs.org
    pause
    exit /b 1
)
echo   Node.js OK

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Python no instalado. Descarga en https://python.org
    pause
    exit /b 1
)
echo   Python OK

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   AVISO: Docker no instalado. El broker MQTT no arrancara con Docker.
    echo   Puedes instalar Mosquitto manualmente: winget install EclipseFoundation.Mosquitto
) else (
    echo   Docker OK
)

REM Instalar dependencias Python (PlatformIO + pyserial)
echo.
echo [2/5] Instalando PlatformIO y pyserial...
pip install -r requirements.txt --quiet
echo   PlatformIO OK

REM Instalar dependencias backend
echo.
echo [3/5] Instalando dependencias del backend...
cd backend
call npm install --silent
if not exist .env copy .env.example .env
cd ..
echo   Backend OK

REM Instalar dependencias simulador
echo.
echo [4/5] Instalando dependencias del simulador...
cd simulator
call npm install --silent
cd ..
echo   Simulador OK

REM Instalar dependencias frontend
echo.
echo [5/5] Instalando dependencias del frontend...
cd frontend
call npm install --silent
cd ..
echo   Frontend OK

echo.
echo ========================================
echo   INSTALACION COMPLETADA!
echo ========================================
echo.
echo   Siguiente paso - Elige una opcion:
echo.
echo   A) Probar con micro real:
echo      1. Enchufa el ATOM Echo S3R por USB
echo      2. cd firmware
echo      3. python flash.py --wifi TU_SSID TU_PASSWORD
echo      4. python flash.py aula_01
echo.
echo   B) Probar con simulador (sin hardware):
echo      1. docker compose up -d mosquitto
echo      2. cd backend ^&^& npm start
echo      3. cd simulator ^&^& node simulate.js
echo      4. cd frontend ^&^& npm run dev
echo      5. Abre http://localhost:3000
echo.
echo   Para flashear varios micros:
echo      python firmware/flash.py aula_01
echo      (desenchufa, enchufa otro)
echo      python firmware/flash.py aula_02
echo      python firmware/flash.py lab_informatica
echo      ...
echo.
pause
