"""
Script para flashear M5Stack Core2 v1.1 (microfono central)

Uso:
  python flash_core2.py                              # Flashea mic_central en aula_01
  python flash_core2.py --room aula_02               # Flashea en aula_02
  python flash_core2.py --wifi IOT IOT_Enlaces_205   # Cambiar red WiFi (WPA2-Personal)
  python flash_core2.py --wifi ENLACES dam250v pwd   # WiFi WPA2-Enterprise
  python flash_core2.py --list                       # Lista puertos COM
  python flash_core2.py --config                     # Muestra config actual
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
            print("  Asegurate de que el Core2 esta enchufado.")
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
    """Auto-detecta el puerto COM del Core2."""
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

    print(f"\n  Compilando y flasheando Core2...")
    print(f"  Comando: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=FIRMWARE_DIR)

    if result.returncode == 0:
        print("\n  >> Core2 flasheado correctamente!")
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

    print("  Configuracion actual (Core2):")
    print(f"    WiFi SSID:    {ssid.group(1) if ssid else '?'} ({wifi_mode})")
    if is_enterprise:
        print(f"    WiFi User:    {user.group(1) if user else '?'}")
    print(f"    WiFi Pass:    {'***' if pwd and pwd.group(1) else 'NO CONFIGURADO'}")
    print(f"    MQTT Broker:  {broker.group(1) if broker else '?'}")
    print(f"    ROOM_ID:      {room.group(1) if room else '?'}")
    print(f"    MIC_ID:       {mic.group(1) if mic else '?'}")


def parse_wifi_args(args):
    """Parsea --wifi y configura."""
    if "--wifi" not in args:
        return args, False

    idx = args.index("--wifi")
    remaining = args[idx + 1:]

    params = []
    for a in remaining:
        if a.startswith("--") or a.startswith("COM") or a.startswith("/dev/"):
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


def main():
    print()
    print("==================================================")
    print("  Flash Tool - M5Stack Core2 (Micro Central)")
    print("==================================================")
    print()

    args = sys.argv[1:]

    # --list: listar puertos
    if "--list" in args:
        print("  Puertos COM detectados:")
        list_ports()
        return

    # Parsear --wifi
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

    show_config()
    print()

    # MIC_ID siempre es mic_central
    set_config_value("MIC_ID", "mic_central")

    # Cambiar ROOM_ID si se especifica
    if room_id:
        set_config_value("ROOM_ID", room_id)

    # Parsear puerto manual
    port = None
    for arg in args:
        if arg.startswith("COM") or arg.startswith("/dev/"):
            port = arg

    # Detectar puerto si no se especifica
    if not port:
        print("\n  Buscando puerto COM del Core2...")
        port, desc = detect_port()
        if port:
            print(f"  Detectado: {port} ({desc})")

    if not port:
        print("  Puerto no detectado, PlatformIO intentara auto-detectar...")

    # Flashear
    success = flash(port)

    if success:
        print(f"\n  Core2 configurado como: mic_central en {room_id or 'aula_01'}")
        print(f"  El micro central esta listo!\n")


if __name__ == "__main__":
    main()
