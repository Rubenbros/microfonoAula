@echo off
REM ============================================
REM Wrapper para flash.py - no cierra la ventana
REM ============================================
cd /d "%~dp0"

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Python no esta en el PATH.
    echo   Instala Python desde https://python.org
    echo   y marca "Add to PATH" durante la instalacion.
    echo.
    pause
    exit /b 1
)

REM Verificar PlatformIO
python -m platformio --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   PlatformIO no encontrado. Instalando...
    python -m pip install platformio pyserial
)

echo.
echo   Lanzando: flash.py --all --wifi IOT IOT_Enlaces_205
echo.

python flash.py --all --wifi IOT IOT_Enlaces_205

echo.
echo   ========================================
echo   Pulsa una tecla para cerrar la ventana.
echo   ========================================
pause
