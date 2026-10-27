"""
Punto de entrada principal para el Simulador de Eco_Ruta.
Permite ejecutar el gemelo digital en modo Web Interactivo o en modo Headless (Terminal).

Uso:
  python simulator/main.py
  python simulator/main.py --headless
  python simulator/main.py --port 8080 --containers 20 --trucks 3
"""

import os
import sys
import time
import argparse
import threading

# Asegurar que la raíz del proyecto esté en el path de importación
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Soporte para salida UTF-8 en consolas Windows (PowerShell y CMD)
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from simulator.config import (
    DEFAULT_NUM_CONTAINERS, DEFAULT_NUM_TRUCKS, TICK_INTERVAL_SECONDS,
    SIMULATOR_WEB_HOST, SIMULATOR_WEB_PORT, API_BACKEND_URL
)
from simulator.engine import SimulationEngine
from simulator.server import run_server

def main():
    parser = argparse.ArgumentParser(description="Eco_Ruta - Gemelo Digital & Simulador de Telemetría IoT")
    parser.add_argument("--headless", action="store_true", help="Ejecutar solo en terminal sin servidor web")
    parser.add_argument("--port", type=int, default=SIMULATOR_WEB_PORT, help="Puerto del servidor web interactivo")
    parser.add_argument("--containers", type=int, default=DEFAULT_NUM_CONTAINERS, help="Cantidad de contenedores")
    parser.add_argument("--trucks", type=int, default=DEFAULT_NUM_TRUCKS, help="Cantidad de camiones recolectores")
    parser.add_argument("--speed", type=float, default=1.0, help="Velocidad de simulación (1.0 = tiempo real)")
    parser.add_argument("--sync-backend", action="store_true", default=True, help="Habilitar envío automático de telemetría al backend (activo por defecto)")
    parser.add_argument("--no-sync", action="store_true", help="Deshabilitar sincronización con el backend")
    parser.add_argument("--backend-url", type=str, default=API_BACKEND_URL, help="URL base del API backend")

    args = parser.parse_args()
    sync_enabled = not args.no_sync

    print("=" * 65)
    print("🌱 ECO_RUTA — SIMULADOR DE TELEMETRÍA IOT & GEMELO DIGITAL")
    print("   Ubicación: Tuluá, Valle del Cauca, Colombia (Comunas 1–6)")
    print("=" * 65)

    # 1. Instanciar Motor de Simulación
    engine = SimulationEngine(
        num_containers=args.containers,
        num_trucks=args.trucks,
        backend_url=args.backend_url,
        forward_to_backend=sync_enabled,
    )
    engine.time_acceleration = args.speed

    print(f"📦 Contenedores inicializados: {len(engine.containers)}")
    print(f"🚛 Camiones inicializados:     {len(engine.trucks)}")
    print(f"⏩ Velocidad inicial:           {engine.time_acceleration}x")
    print(f"📡 Sincronización Backend:     {'ACTIVADA (' + args.backend_url + ')' if sync_enabled else 'DESACTIVADA'}")

    # 2. Hilo del bucle de simulación
    engine.running = True

    def engine_loop():
        while engine.running:
            try:
                engine.tick()
            except Exception as e:
                print(f"⚠️ Error en tick de simulación: {e}")
            time.sleep(TICK_INTERVAL_SECONDS)

    sim_thread = threading.Thread(target=engine_loop, daemon=True)
    sim_thread.start()

    # 3. Modo de Ejecución
    if not args.headless:
        print("\n🌐 Panel Web Interactivo Disponible:")
        print(f"👉 Abre en tu navegador: http://localhost:{args.port}")
        print("   (Presiona Ctrl+C en esta terminal para detener el simulador)\n")

        try:
            run_server(engine, host=SIMULATOR_WEB_HOST, port=args.port)
        except KeyboardInterrupt:
            print("\n🛑 Deteniendo simulador...")
            engine.running = False
    else:
        print("\n💻 Ejecutando en Modo Headless (Terminal). Presiona Ctrl+C para salir.\n")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Deteniendo simulador...")
            engine.running = False

    print("👋 Simulador finalizado con éxito.")

if __name__ == "__main__":
    main()
