"""
Script para flashear multiples M5Stack ATOM Echo S3R
con diferentes ROOM_ID de forma rapida.

Uso:
  python flash.py                  # Flashea con config.h tal cual
  python flash.py aula_01          # Cambia ROOM_ID y flashea
  python flash.py aula_01 COM5     # Especifica puerto COM
  python flash.py --list           # Lista puertos COM disponibles

Flujo para varios micros:
  1. Enchufa micro 1 → python flash.py aula_101
  2. Desenchufa, enchufa micro 2 → python flash.py aula_102
  3. Desenchufa, enchufa micro 3 → python flash.py lab_informatica
  ... repite para cada micro
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


def set_room_id(room_id):
    """Cambia el ROOM_ID en config.h."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    old_room = re.search(r'#define ROOM_ID\s+"([^"]*)"', content)
    if old_room:
        print(f"  ROOM_ID: {old_room.group(1)} → {room_id}")
    else:
        print(f"  ROOM_ID: → {room_id}")

    content = re.sub(
        r'#define ROOM_ID\s+"[^"]*"',
        f'#define ROOM_ID "{room_id}"',
        content
    )

    with open(CONFIG_FILE, "w") as f:
        f.write(content)


def set_wifi(ssid, password):
    """Cambia WiFi SSID y password en config.h."""
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    content = re.sub(
        r'#define WIFI_SSID\s+"[^"]*"',
        f'#define WIFI_SSID "{ssid}"',
        content
    )
    content = re.sub(
        r'#define WIFI_PASSWORD\s+"[^"]*"',
        f'#define WIFI_PASSWORD "{password}"',
        content
    )

    with open(CONFIG_FILE, "w") as f:
        f.write(content)

    print(f"  WiFi: {ssid}")


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
    pwd = re.search(r'#define WIFI_PASSWORD\s+"([^"]*)"', content)
    broker = re.search(r'#define MQTT_BROKER\s+"([^"]*)"', content)
    room = re.search(r'#define ROOM_ID\s+"([^"]*)"', content)

    print("  Configuracion actual:")
    print(f"    WiFi SSID:    {ssid.group(1) if ssid else '?'}")
    print(f"    WiFi Pass:    {'***' if pwd and pwd.group(1) else 'NO CONFIGURADO'}")
    print(f"    MQTT Broker:  {broker.group(1) if broker else '?'}")
    print(f"    ROOM_ID:      {room.group(1) if room else '?'}")


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

    # --wifi SSID PASSWORD: configurar wifi
    if "--wifi" in args:
        idx = args.index("--wifi")
        if idx + 2 < len(args):
            ssid = args[idx + 1]
            password = args[idx + 2]
            set_wifi(ssid, password)
            args = [a for i, a in enumerate(args) if i not in (idx, idx+1, idx+2)]
        else:
            print("  Uso: python flash.py --wifi SSID PASSWORD [room_id] [COM_PORT]")
            return

    # --config: solo mostrar config
    if "--config" in args:
        show_config()
        return

    show_config()
    print()

    # Parsear room_id y puerto
    room_id = None
    port = None

    for arg in args:
        if arg.startswith("COM") or arg.startswith("/dev/"):
            port = arg
        elif not arg.startswith("--"):
            room_id = arg

    # Cambiar ROOM_ID si se especifica
    if room_id:
        set_room_id(room_id)

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

    if success and room_id:
        print(f"\n  Micro configurado como: {room_id}")
        print(f"  Desenchufa y enchufa el siguiente micro.")
        print(f"  Luego ejecuta: python flash.py <siguiente_room_id>\n")


if __name__ == "__main__":
    main()
