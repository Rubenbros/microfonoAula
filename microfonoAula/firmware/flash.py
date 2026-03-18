"""
Script para flashear multiples M5Stack ATOM Echo S3R
con diferentes ROOM_ID y MIC_ID de forma rapida.

Uso:
  python flash.py mic_01                          # Flashea mic_01 (usa WiFi de ENLACES)
  python flash.py mic_01 --wifi S25 12345678      # WiFi WPA2-Personal
  python flash.py mic_01 --wifi ENLACES dam251v pwd  # WiFi WPA2-Enterprise
  python flash.py --all --wifi S25 12345678       # Flashea los 6 micros uno a uno
  python flash.py --all --room aula_02            # Los 6 en aula_02
  python flash.py --list                          # Lista puertos COM
  python flash.py --config                        # Muestra config actual

Flujo rapido para cambiar red y flashear todos:
  python flash.py --all --wifi MiRed MiPassword
"""

import sys
import os
import re
import subprocess
import time

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "src", "config.h")
FIRMWARE_DIR = os.path.dirname(__file__)

ALL_MICS = ["mic_01", "mic_02", "mic_03", "mic_04", "mic_05", "mic_06"]

# Credenciales WiFi por micro (ENLACES-A204, WPA2-Enterprise)
MIC_CREDENTIALS = {
    "mic_01": ("dam251v", "Shb*XEdv"),
    "mic_02": ("dam252v", "blG1K1vT"),
    "mic_03": ("dam253v", "1B6%CHbl"),
    "mic_04": ("dam254v", "8tE%Phs@"),
    "mic_05": ("dam255v", "%@CXFvVm"),
    "mic_06": ("dam256v", "JTg71@*b"),
}


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


def detect_port():
    """Auto-detecta el puerto COM del micro."""
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
            return esp_ports[0].device, esp_ports[0].description
        non_com1 = [p for p in ports if p.device != "COM1"]
        if non_com1:
            return non_com1[0].device, non_com1[0].description
    except ImportError:
        pass
    return None, None


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


def set_wifi_enterprise(ssid, user, password):
    """Configura WiFi WPA2-Enterprise en config.h."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    content = re.sub(r'#define WIFI_ENTERPRISE\s+\w+', '#define WIFI_ENTERPRISE true', content)
    content = re.sub(r'#define WIFI_SSID\s+"[^"]*"', f'#define WIFI_SSID "{ssid}"', content)
    content = re.sub(r'#define WIFI_USER\s+"[^"]*"', f'#define WIFI_USER "{user}"', content)
    content = re.sub(r'#define WIFI_PASSWORD\s+"[^"]*"', f'#define WIFI_PASSWORD "{password}"', content)

    with open(CONFIG_FILE, "w") as f:
        f.write(content)

    print(f"  WiFi: {ssid} (WPA2-Enterprise, user: {user})")


def set_wifi_personal(ssid, password):
    """Configura WiFi WPA2-Personal en config.h."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    content = re.sub(r'#define WIFI_ENTERPRISE\s+\w+', '#define WIFI_ENTERPRISE false', content)
    content = re.sub(r'#define WIFI_SSID\s+"[^"]*"', f'#define WIFI_SSID "{ssid}"', content)
    content = re.sub(r'#define WIFI_USER\s+"[^"]*"', '#define WIFI_USER ""', content)
    content = re.sub(r'#define WIFI_PASSWORD\s+"[^"]*"', f'#define WIFI_PASSWORD "{password}"', content)

    with open(CONFIG_FILE, "w") as f:
        f.write(content)

    print(f"  WiFi: {ssid} (WPA2-Personal)")


def flash(port=None):
    """Compila y flashea el firmware."""
    cmd = ["pio", "run", "-t", "upload"]
    if port:
        cmd += ["--upload-port", port]

    print(f"\n  Compilando y flasheando...")
    print(f"  Comando: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=FIRMWARE_DIR)

    if result.returncode == 0:
        print("\n  >> Flasheo completado correctamente!")
        return True
    else:
        print("\n  >> Error al flashear. Revisa la conexion USB.")
        return False


def show_config():
    """Muestra la configuracion actual."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    enterprise = re.search(r'#define WIFI_ENTERPRISE\s+(\w+)', content)
    ssid = re.search(r'#define WIFI_SSID\s+"([^"]*)"', content)
    user = re.search(r'#define WIFI_USER\s+"([^"]*)"', content)
    pwd = re.search(r'#define WIFI_PASSWORD\s+"([^"]*)"', content)
    broker = re.search(r'#define MQTT_BROKER\s+"([^"]*)"', content)
    room = re.search(r'#define ROOM_ID\s+"([^"]*)"', content)
    mic = re.search(r'#define MIC_ID\s+"([^"]*)"', content)

    is_enterprise = enterprise and enterprise.group(1) == "true"
    wifi_mode = "WPA2-Enterprise" if is_enterprise else "WPA2-Personal"

    print("  Configuracion actual:")
    print(f"    WiFi SSID:    {ssid.group(1) if ssid else '?'} ({wifi_mode})")
    if is_enterprise:
        print(f"    WiFi User:    {user.group(1) if user else '?'}")
    print(f"    WiFi Pass:    {'***' if pwd and pwd.group(1) else 'NO CONFIGURADO'}")
    print(f"    MQTT Broker:  {broker.group(1) if broker else '?'}")
    print(f"    ROOM_ID:      {room.group(1) if room else '?'}")
    print(f"    MIC_ID:       {mic.group(1) if mic else '?'}")


def parse_wifi_args(args):
    """Parsea --wifi y configura. Devuelve args sin los params de wifi.
    --wifi SSID PASSWORD           -> WPA2-Personal (2 params)
    --wifi SSID USER PASSWORD      -> WPA2-Enterprise (3 params)
    """
    if "--wifi" not in args:
        return args, False

    idx = args.index("--wifi")
    remaining = args[idx + 1:]

    # Contar params hasta el siguiente flag o fin
    params = []
    for a in remaining:
        if a.startswith("--") or a.startswith("mic_") or a.startswith("COM") or a.startswith("/dev/"):
            break
        params.append(a)

    if len(params) == 2:
        set_wifi_personal(params[0], params[1])
        skip = set(range(idx, idx + 3))
    elif len(params) == 3:
        set_wifi_enterprise(params[0], params[1], params[2])
        skip = set(range(idx, idx + 4))
    else:
        print("  Uso: --wifi SSID PASSWORD  (Personal)")
        print("       --wifi SSID USER PASSWORD  (Enterprise)")
        sys.exit(1)

    return [a for i, a in enumerate(args) if i not in skip], True


def flash_all(room_id=None, port=None):
    """Flashea los 6 micros uno a uno, esperando entre cada uno."""
    print("\n  === Modo --all: flashear 6 micros ===\n")

    for i, mic_id in enumerate(ALL_MICS):
        num = i + 1
        print(f"\n  ┌─────────────────────────────────┐")
        print(f"  │  Micro {num}/6: {mic_id:<24}│")
        print(f"  └─────────────────────────────────┘")

        if i > 0:
            input(f"\n  Enchufa {mic_id} y pulsa ENTER...")
            time.sleep(2)  # Esperar a que el SO detecte el puerto

        # Configurar MIC_ID
        set_config_value("MIC_ID", mic_id)
        if room_id:
            set_config_value("ROOM_ID", room_id)

        # Detectar puerto
        current_port = port
        if not current_port:
            print("  Buscando puerto COM...")
            current_port, desc = detect_port()
            if current_port:
                print(f"  Detectado: {current_port} ({desc})")
            else:
                print("  Puerto no detectado, PlatformIO intentara auto-detectar...")

        success = flash(current_port)

        if success:
            print(f"  {mic_id} flasheado correctamente en {room_id or 'aula_01'}")
        else:
            resp = input(f"\n  Error con {mic_id}. Reintentar? (s/n): ").strip().lower()
            if resp == 's':
                time.sleep(2)
                current_port, desc = detect_port()
                flash(current_port)

    print("\n  ========================================")
    print("  Todos los micros flasheados!")
    print("  ========================================\n")


def main():
    print()
    print("==================================================")
    print("  Flash Tool - Monitor de Ruido en Aulas")
    print("==================================================")
    print()

    args = sys.argv[1:]

    # --list: listar puertos
    if "--list" in args:
        print("  Puertos COM detectados:")
        list_ports()
        return

    # Parsear --wifi (2 o 3 params)
    args, wifi_set = parse_wifi_args(args)

    # --config: solo mostrar config
    if "--config" in args:
        show_config()
        return

    # Parsear --room
    room_id = None
    if "--room" in args:
        idx = args.index("--room")
        if idx + 1 < len(args):
            room_id = args[idx + 1]
            args = [a for i, a in enumerate(args) if i not in (idx, idx + 1)]

    # --all: flashear los 6
    if "--all" in args:
        args = [a for a in args if a != "--all"]
        port = None
        for arg in args:
            if arg.startswith("COM") or arg.startswith("/dev/"):
                port = arg
        flash_all(room_id=room_id, port=port)
        return

    show_config()
    print()

    # Parsear mic_id y puerto
    mic_id = None
    port = None

    for arg in args:
        if arg.startswith("COM") or arg.startswith("/dev/"):
            port = arg
        elif not arg.startswith("--"):
            mic_id = arg

    # Cambiar MIC_ID si se especifica
    if mic_id:
        set_config_value("MIC_ID", mic_id)

        # Auto-asignar credenciales Enterprise si no se paso --wifi
        if mic_id in MIC_CREDENTIALS and not wifi_set:
            user, pwd = MIC_CREDENTIALS[mic_id]
            set_wifi_enterprise("ENLACES-A204", user, pwd)

    # Cambiar ROOM_ID si se especifica
    if room_id:
        set_config_value("ROOM_ID", room_id)

    # Detectar puerto si no se especifica
    if not port:
        print("\n  Buscando puerto COM del micro...")
        port, desc = detect_port()
        if port:
            print(f"  Detectado: {port} ({desc})")

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
