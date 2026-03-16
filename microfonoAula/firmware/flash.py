"""
Script para flashear multiples M5Stack ATOM Echo S3R
con diferentes ROOM_ID y MIC_ID de forma rapida.

Uso:
  python flash.py mic_01                    # Flashea mic_01 en aula_01
  python flash.py mic_02                    # Flashea mic_02 en aula_01
  python flash.py mic_03 --room aula_02     # mic_03 en aula_02
  python flash.py mic_01 COM5               # Especifica puerto COM
  python flash.py --list                    # Lista puertos COM disponibles

Flujo para 6 micros de un aula:
  1. Enchufa micro 1 → python flash.py mic_01
  2. Desenchufa, enchufa micro 2 → python flash.py mic_02
  3. Repite hasta mic_06
"""

import sys
import os
import re
import subprocess
import time

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "src", "config.h")
FIRMWARE_DIR = os.path.dirname(__file__)


def list_ports():
    """Lista puertos COM disponibles."""
    try:
        import serial.tools.list_ports
        ports = serial.tools.list_ports.comports()
        if not ports:
            print("  No se detectan puertos COM.")
            print("  Asegurate de que el micro esta enchufado.")
            return []
        for p in ports:
            print(f"  {p.device} - {p.description}")
        return ports
    except ImportError:
        # Fallback sin pyserial
        print("  (pyserial no instalado, usando metodo alternativo)")
        result = subprocess.run(
            ["reg", "query", "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM"],
            capture_output=True, text=True
        )
        if result.stdout:
            for line in result.stdout.strip().split("\n"):
                if "COM" in line:
                    print(f"  {line.strip()}")
        else:
            print("  No se detectan puertos COM.")
        return []


def set_config_value(key, value):
    """Cambia un #define en config.h."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    old = re.search(rf'#define {key}\s+"([^"]*)"', content)
    if old:
        print(f"  {key}: {old.group(1)} -> {value}")
    else:
        print(f"  {key}: -> {value}")

    content = re.sub(
        rf'#define {key}\s+"[^"]*"',
        f'#define {key} "{value}"',
        content
    )

    with open(CONFIG_FILE, "w") as f:
        f.write(content)


def set_wifi(ssid, user, password):
    """Cambia WiFi SSID, user y password en config.h."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    content = re.sub(
        r'#define WIFI_SSID\s+"[^"]*"',
        f'#define WIFI_SSID "{ssid}"',
        content
    )
    content = re.sub(
        r'#define WIFI_USER\s+"[^"]*"',
        f'#define WIFI_USER "{user}"',
        content
    )
    content = re.sub(
        r'#define WIFI_PASSWORD\s+"[^"]*"',
        f'#define WIFI_PASSWORD "{password}"',
        content
    )

    with open(CONFIG_FILE, "w") as f:
        f.write(content)

    print(f"  WiFi: {ssid} (user: {user})")


def flash(port=None):
    """Compila y flashea el firmware."""
    cmd = ["pio", "run", "-t", "upload"]
    if port:
        cmd += ["--upload-port", port]

    print(f"\n  Compilando y flasheando...")
    print(f"  Comando: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=FIRMWARE_DIR)

    if result.returncode == 0:
        print("\n  ✅ Flasheo completado correctamente!")
        return True
    else:
        print("\n  ❌ Error al flashear. Revisa la conexion USB.")
        return False


def show_config():
    """Muestra la configuracion actual."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    ssid = re.search(r'#define WIFI_SSID\s+"([^"]*)"', content)
    user = re.search(r'#define WIFI_USER\s+"([^"]*)"', content)
    pwd = re.search(r'#define WIFI_PASSWORD\s+"([^"]*)"', content)
    broker = re.search(r'#define MQTT_BROKER\s+"([^"]*)"', content)
    room = re.search(r'#define ROOM_ID\s+"([^"]*)"', content)
    mic = re.search(r'#define MIC_ID\s+"([^"]*)"', content)

    print("  Configuracion actual:")
    print(f"    WiFi SSID:    {ssid.group(1) if ssid else '?'}")
    print(f"    WiFi User:    {user.group(1) if user else '?'}")
    print(f"    WiFi Pass:    {'***' if pwd and pwd.group(1) else 'NO CONFIGURADO'}")
    print(f"    MQTT Broker:  {broker.group(1) if broker else '?'}")
    print(f"    ROOM_ID:      {room.group(1) if room else '?'}")
    print(f"    MIC_ID:       {mic.group(1) if mic else '?'}")


def main():
    print()
    print("╔══════════════════════════════════════════════╗")
    print("║  🎤 Flash Tool - Monitor de Ruido en Aulas  ║")
    print("╚══════════════════════════════════════════════╝")
    print()

    args = sys.argv[1:]

    # --list: listar puertos
    if "--list" in args:
        print("  Puertos COM detectados:")
        list_ports()
        return

    # Credenciales WiFi por micro (ENLACES-A204, WPA2-Enterprise)
    MIC_CREDENTIALS = {
        "mic_01": ("dam251v", "Shb*XEdv"),
        "mic_02": ("dam252v", "blG1K1vT"),
        "mic_03": ("dam253v", "1B6%CHbl"),
        "mic_04": ("dam254v", "8tE%Phs@"),
        "mic_05": ("dam255v", "%@CXFvVm"),
        "mic_06": ("dam256v", "JTg71@*b"),
    }

    # --wifi SSID USER PASSWORD: configurar wifi manualmente
    if "--wifi" in args:
        idx = args.index("--wifi")
        if idx + 3 <= len(args):
            ssid = args[idx + 1]
            user = args[idx + 2]
            password = args[idx + 3]
            set_wifi(ssid, user, password)
            args = [a for i, a in enumerate(args) if i not in (idx, idx+1, idx+2, idx+3)]
        else:
            print("  Uso: python flash.py --wifi SSID USER PASSWORD [mic_id]")
            return

    # --config: solo mostrar config
    if "--config" in args:
        show_config()
        return

    show_config()
    print()

    # Parsear mic_id, --room y puerto
    mic_id = None
    room_id = None
    port = None

    if "--room" in args:
        idx = args.index("--room")
        if idx + 1 < len(args):
            room_id = args[idx + 1]
            args = [a for i, a in enumerate(args) if i not in (idx, idx+1)]

    for arg in args:
        if arg.startswith("COM") or arg.startswith("/dev/"):
            port = arg
        elif not arg.startswith("--"):
            mic_id = arg

    # Cambiar MIC_ID si se especifica
    if mic_id:
        set_config_value("MIC_ID", mic_id)

        # Auto-asignar credenciales WiFi si el mic tiene credenciales definidas
        if mic_id in MIC_CREDENTIALS and "--wifi" not in sys.argv:
            user, pwd = MIC_CREDENTIALS[mic_id]
            set_wifi("ENLACES-A204", user, pwd)

    # Cambiar ROOM_ID si se especifica
    if room_id:
        set_config_value("ROOM_ID", room_id)

    # Detectar puerto si no se especifica
    if not port:
        print("\n  Buscando puerto COM del micro...")
        try:
            import serial.tools.list_ports
            ports = list(serial.tools.list_ports.comports())
            esp_ports = [p for p in ports if "USB" in p.description.upper()
                        or "ESP" in p.description.upper()
                        or "CP210" in p.description.upper()
                        or "CH340" in p.description.upper()
                        or "JTAG" in p.description.upper()
                        or "Serial" in p.description]
            if esp_ports:
                port = esp_ports[0].device
                print(f"  Detectado: {port} ({esp_ports[0].description})")
            elif ports:
                # Filtrar COM1 que suele ser el puerto serie nativo
                non_com1 = [p for p in ports if p.device != "COM1"]
                if non_com1:
                    port = non_com1[0].device
                    print(f"  Usando: {port} ({non_com1[0].description})")
        except ImportError:
            pass

    if not port:
        print("  Puerto no detectado, PlatformIO intentara auto-detectar...")

    # Flashear
    success = flash(port)

    if success and mic_id:
        print(f"\n  Micro configurado como: {mic_id} en {room_id or 'aula_01'}")
        print(f"  Desenchufa y enchufa el siguiente micro.")
        print(f"  Luego ejecuta: python flash.py mic_XX\n")


if __name__ == "__main__":
    main()
