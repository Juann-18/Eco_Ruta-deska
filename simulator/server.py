"""
Servidor HTTP integrado para el Simulador de Eco_Ruta.
Sirve la interfaz web interactiva (Leaflet) y proporciona endpoints REST
para consultar el estado y controlar la simulación sin dependencias externas.
"""

import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from simulator.config import SIMULATOR_WEB_HOST, SIMULATOR_WEB_PORT

class SimulatorHTTPHandler(BaseHTTPRequestHandler):
    engine = None  # Inyectado desde main.py
    web_dir = os.path.join(os.path.dirname(__file__), "web")

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            file_path = os.path.join(self.web_dir, "index.html")
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    self._set_headers(200, "text/html; charset=utf-8")
                    self.wfile.write(f.read())
            else:
                self._set_headers(404, "text/plain")
                self.wfile.write(b"Archivo no encontrado")
            return

        if self.path == "/api/state":
            if self.engine:
                state = self.engine.get_state()
                self._set_headers(200, "application/json")
                self.wfile.write(json.dumps(state).encode("utf-8"))
            else:
                self._set_headers(500)
                self.wfile.write(b'{"error": "Motor no inicializado"}')
            return

        self._set_headers(404, "text/plain")
        self.wfile.write(b"Ruta no encontrada")

    def do_POST(self):
        if self.path == "/api/control":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body) if body else {}

            action = data.get("action")
            value = data.get("value")

            if not self.engine:
                self._set_headers(500)
                return

            if action == "toggle_pause":
                paused = self.engine.toggle_pause()
                res = {"success": True, "paused": paused}
            elif action == "set_speed":
                self.engine.set_speed(float(value))
                res = {"success": True, "speed": float(value)}
            elif action == "force_fill":
                self.engine.force_fill_all(float(value or 95.0))
                res = {"success": True}
            elif action == "empty_all":
                self.engine.empty_all_containers()
                res = {"success": True}
            elif action == "toggle_backend":
                active = self.engine.toggle_backend_forwarding()
                res = {"success": True, "active": active}
            else:
                self._set_headers(400)
                self.wfile.write(b'{"error": "Accion desconocida"}')
                return

            self._set_headers(200, "application/json")
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        self._set_headers(404, "text/plain")
        self.wfile.write(b"Endpoint POST no encontrado")

    def log_message(self, format, *args):
        # Desactivar logging de cada petición HTTP en consola para mantenerla limpia
        return

def run_server(engine, host=SIMULATOR_WEB_HOST, port=SIMULATOR_WEB_PORT):
    SimulatorHTTPHandler.engine = engine
    server = HTTPServer((host, port), SimulatorHTTPHandler)
    server.serve_forever()
