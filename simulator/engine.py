"""
Motor central de simulación para Eco_Ruta.
Gestiona el gemelo digital, despacho de camiones, recolección y sincronización dinámica con PostgreSQL vía Backend REST.
"""

import random
import threading
import urllib.request
import urllib.error
import json
from datetime import datetime

from simulator.config import (
    DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG, GEO_SPAN_LAT, GEO_SPAN_LNG,
    DISPOSAL_STATION, DEPOT_LOCATION, DEFAULT_NUM_CONTAINERS, DEFAULT_NUM_TRUCKS,
    CRITICAL_FILL_THRESHOLD, WASTE_TYPES,
    API_BACKEND_URL, FORWARD_TO_BACKEND_DEFAULT, HTTP_TIMEOUT_SECONDS
)
from simulator.models import SimulatedContainer, SimulatedTruck
from simulator.routing import calculate_route_waypoints


class SimulationEngine:
    def __init__(
        self,
        num_containers: int = DEFAULT_NUM_CONTAINERS,
        num_trucks: int = DEFAULT_NUM_TRUCKS,
        backend_url: str = API_BACKEND_URL,
        forward_to_backend: bool = FORWARD_TO_BACKEND_DEFAULT,
    ):
        self.lock = threading.Lock()
        self.running = False
        self.paused = False
        self.time_acceleration = 1.0  # 1x, 2x, 5x, 10x
        self.forward_to_backend = forward_to_backend
        self.backend_url = backend_url
        self.synced_from_backend = False

        self.containers = []
        self.trucks = []
        self.events = []
        self.simulated_hour = 8  # Comienza a las 08:00 AM
        self.simulated_minute = 0
        self.tick_count = 0

        # Intentar cargar contenedores y vehículos reales desde el Backend / PostgreSQL
        if not self.sync_from_backend():
            self._init_containers_fallback(num_containers)
            self._init_trucks_fallback(num_trucks)

    def sync_from_backend(self) -> bool:
        """Consulta los puntos de reciclaje y camiones reales desde PostgreSQL vía API REST."""
        try:
            puntos_url = f"{self.backend_url}/puntos"
            req = urllib.request.Request(
                puntos_url,
                headers={"Accept": "application/json", "User-Agent": "EcoRutaSimulator/1.0"},
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
                db_points = payload.get("data", [])

            if not db_points:
                return False

            loaded_containers = []
            for p in db_points:
                container = SimulatedContainer(
                    container_id=p.get("id"),
                    code=p.get("code"),
                    name=p.get("name"),
                    address=p.get("address"),
                    comuna=int(p.get("comuna", 1)),
                    waste_type=p.get("wasteType", "PLASTICO"),
                    lat=float(p.get("latitude", DEFAULT_CENTER_LAT)),
                    lng=float(p.get("longitude", DEFAULT_CENTER_LNG)),
                    capacity_kg=float(p.get("capacityKg", 150.0)),
                    initial_fill=float(p.get("currentFillPercentage", 25.0)),
                )
                loaded_containers.append(container)

            loaded_trucks = []
            try:
                veh_url = f"{self.backend_url}/rutas/vehiculos"
                veh_req = urllib.request.Request(
                    veh_url,
                    headers={"Accept": "application/json", "User-Agent": "EcoRutaSimulator/1.0"},
                    method="GET",
                )
                with urllib.request.urlopen(veh_req, timeout=HTTP_TIMEOUT_SECONDS) as v_resp:
                    v_payload = json.loads(v_resp.read().decode("utf-8"))
                    db_vehicles = v_payload.get("data", [])

                for idx, v in enumerate(db_vehicles):
                    lat = DEPOT_LOCATION["lat"] + (idx * 0.001)
                    lng = DEPOT_LOCATION["lng"] + (idx * 0.001)
                    truck = SimulatedTruck(
                        truck_id=f"TRUCK-{(idx + 1):02d}",
                        plate=v.get("plate", f"TUL-{100 + idx}"),
                        model=v.get("model", "Compactador Municipal"),
                        start_lat=lat,
                        start_lng=lng,
                        max_capacity_kg=float(v.get("maxCapacityKg", 5000.0)),
                    )
                    loaded_trucks.append(truck)
            except Exception:
                pass

            self.containers = loaded_containers
            if loaded_trucks:
                self.trucks = loaded_trucks
            elif not self.trucks:
                self._init_trucks_fallback(DEFAULT_NUM_TRUCKS)

            self.synced_from_backend = True
            self.log_event(
                f"🔄 Sincronizados {len(self.containers)} contenedores y {len(self.trucks)} camiones desde PostgreSQL.",
                "CONTROL",
            )
            return True
        except Exception:
            return False

    def _init_containers_fallback(self, count: int):
        nombres_puntos = [
            ("Punto Verde Plaza Cívica Boyacá", "Cra 26 con Calle 27", 1, 4.0847, -76.1954, "PAPEL_CARTON"),
            ("Punto Ecológico Parque Infantil", "Calle 28 con Cra 20", 1, 4.0862, -76.1915, "PLASTICO"),
            ("Estación Terminal de Transportes", "Calle 25 # 20-30", 2, 4.0815, -76.1892, "VIDRIO"),
            ("Contenedor Parque Bolívar", "Calle 26 con Cra 25", 2, 4.0838, -76.1978, "METAL"),
            ("Punto Complejo Deportivo Alvernia", "Cra 38 con Calle 24", 3, 4.0792, -76.2045, "PLASTICO"),
            ("Centro Comercial La 14", "Calle 27 # 33-15", 3, 4.0855, -76.2082, "PAPEL_CARTON"),
            ("Punto Limpio Mercado Central", "Cra 21 # 28-50", 4, 4.0885, -76.1942, "ORGANICO"),
            ("Punto Parque de la Guadua", "Calle 44 # 25-10", 4, 4.0921, -76.1985, "VIDRIO"),
            ("Sector Hospital Tomás Uribe", "Calle 27 # 44-50", 5, 4.0811, -76.2155, "ESCOMBRO"),
            ("Plaza San Juan Bosco", "Cra 28 # 36-20", 5, 4.0754, -76.2110, "PLASTICO"),
            ("Campus UCEVA", "Cra 27 A # 48-144", 6, 4.0965, -76.2025, "PAPEL_CARTON"),
            ("Parque Lineal Juan María Céspedes", "Calle 34 # 21-15", 6, 4.0910, -76.1905, "METAL"),
            ("Estación Ferrocarril Centro", "Calle 26 # 18-10", 1, 4.0832, -76.1938, "VIDRIO"),
            ("Pasaje Comercial Carrera 25", "Cra 25 # 26-40", 1, 4.0853, -76.1965, "ORGANICO"),
            ("Colegio Gimnasio del Pacífico", "Calle 32 # 27-40", 2, 4.0875, -76.1972, "PAPEL_CARTON"),
            ("Barrio Victoria Zona Comercial", "Cra 34 # 26-10", 3, 4.0825, -76.2035, "VIDRIO"),
            ("Parque Barrio Sajonia", "Cra 30 # 42-18", 4, 4.0912, -76.2010, "PLASTICO"),
            ("Sector Chiminangos Norte", "Transversal 12 # 20-05", 5, 4.0785, -76.2130, "METAL"),
        ]

        self.containers = []
        for i in range(count):
            ref = nombres_puntos[i % len(nombres_puntos)]
            code = f"#CNT-{(i + 1):04d}"
            container = SimulatedContainer(
                code=code,
                name=ref[0],
                address=ref[1],
                comuna=ref[2],
                waste_type=ref[5],
                lat=ref[3],
                lng=ref[4],
                capacity_kg=random.choice([120.0, 150.0, 200.0]),
                initial_fill=round(random.uniform(20.0, 75.0), 1),
            )
            self.containers.append(container)

    def _init_trucks_fallback(self, count: int):
        placas = ["TUL-482", "TUL-105", "TUL-880", "TUL-903"]
        modelos = [
            "Chevrolet FVR Compactador",
            "Hino 500 Ecológico",
            "International Durastar",
            "Kenworth T370",
        ]

        self.trucks = []
        for i in range(count):
            truck_id = f"TRUCK-{(i + 1):02d}"
            plate = placas[i % len(placas)]
            model = modelos[i % len(modelos)]
            lat = DEPOT_LOCATION["lat"] + (i * 0.001)
            lng = DEPOT_LOCATION["lng"] + (i * 0.001)

            truck = SimulatedTruck(
                truck_id=truck_id,
                plate=plate,
                model=model,
                start_lat=lat,
                start_lng=lng,
                max_capacity_kg=5000.0,
            )
            self.trucks.append(truck)

    def log_event(self, message: str, event_type: str = "INFO"):
        """Registra un evento en el historial en memoria."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = {
            "time": timestamp,
            "type": event_type,
            "message": message,
        }
        self.events.insert(0, entry)
        if len(self.events) > 60:
            self.events.pop()
        try:
            print(f"[{timestamp}] [{event_type}] {message}")
        except UnicodeEncodeError:
            clean_message = message.encode("ascii", errors="replace").decode("ascii")
            print(f"[{timestamp}] [{event_type}] {clean_message}")

    def _dispatch_truck_to_container(self, truck: SimulatedTruck, container: SimulatedContainer):
        waypoints = calculate_route_waypoints(
            truck.latitude, truck.longitude,
            container.latitude, container.longitude,
        )
        truck.set_route(waypoints, target_id=container.id, target_name=container.code, status="EN_CAMINO")
        self.log_event(
            f"🚛 Camión {truck.plate} despachado hacia contenedor {container.code} ({container.name}) - Llenado: {container.fill_percentage}%",
            "DISPATCH",
        )

    def _dispatch_truck_to_disposal(self, truck: SimulatedTruck):
        waypoints = calculate_route_waypoints(
            truck.latitude, truck.longitude,
            DISPOSAL_STATION["lat"], DISPOSAL_STATION["lng"],
        )
        truck.set_route(waypoints, target_id="DISPOSAL", target_name=DISPOSAL_STATION["name"], status="EN_CAMINO")
        self.log_event(
            f"⚠️ Camión {truck.plate} lleno ({truck.current_load_kg:.1f} kg / {truck.max_capacity_kg} kg). En ruta a descarga en {DISPOSAL_STATION['name']}.",
            "ALERT",
        )

    def _send_http_payload(self, path: str, payload: dict):
        """Envía telemetría al backend REST si la sincronización está habilitada."""
        if not self.forward_to_backend:
            return
        url = f"{self.backend_url}{path}"
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json", "User-Agent": "EcoRutaSimulator/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECONDS):
                pass
        except Exception:
            pass

    def tick(self):
        """Ejecuta un paso discreto de la simulación."""
        with self.lock:
            if self.paused:
                return

            self.tick_count += 1

            # Si el simulador inició antes que el backend, reintentar sincronización con PostgreSQL
            if not self.synced_from_backend and self.forward_to_backend and self.tick_count % 3 == 0:
                self.sync_from_backend()

            # Reloj simulado: cada tick avanza minutos simulados
            self.simulated_minute += int(1 * self.time_acceleration)
            if self.simulated_minute >= 60:
                self.simulated_hour = (self.simulated_hour + (self.simulated_minute // 60)) % 24
                self.simulated_minute = self.simulated_minute % 60

            # Horas pico de generación de basura: 12-14 y 19-22
            is_peak = (12 <= self.simulated_hour <= 14) or (19 <= self.simulated_hour <= 22)

            # 1. Actualizar contenedores
            for container in self.containers:
                prev_fill = container.fill_percentage
                container.tick(time_acceleration=self.time_acceleration, is_peak_hour=is_peak)

                if prev_fill < CRITICAL_FILL_THRESHOLD <= container.fill_percentage:
                    self.log_event(
                        f"🚨 ALERTA: Contenedor {container.code} ha alcanzado nivel crítico ({container.fill_percentage}%).",
                        "CRITICAL",
                    )

                if self.tick_count % 2 == 0:
                    self._send_http_payload("/telemetry/container", container.to_telemetry_payload())

            # 2. Asignar camiones y resolver movimiento
            assigned_target_ids = {t.target_container_id for t in self.trucks if t.target_container_id}

            for truck in self.trucks:
                if truck.current_load_kg >= (truck.max_capacity_kg * 0.90) and truck.target_container_id != "DISPOSAL":
                    self._dispatch_truck_to_disposal(truck)
                    continue

                if truck.status == "IDLE":
                    urgentes = [
                        c for c in self.containers
                        if c.fill_percentage >= CRITICAL_FILL_THRESHOLD and c.id not in assigned_target_ids
                    ]

                    if urgentes:
                        urgentes.sort(key=lambda c: c.fill_percentage, reverse=True)
                        target_container = urgentes[0]
                        assigned_target_ids.add(target_container.id)
                        self._dispatch_truck_to_container(truck, target_container)

                step_result = truck.step()

                if step_result == "ARRIVED":
                    if truck.target_container_id == "DISPOSAL":
                        truck.dwell_ticks = 3
                        truck.status = "DESCARGANDO"
                        descargado = truck.unload()
                        self.log_event(
                            f"♻️ Camión {truck.plate} completó la descarga de {descargado:.1f} kg en la Planta de Acopio.",
                            "SUCCESS",
                        )
                        truck.target_container_id = None
                        truck.target_name = None
                    elif truck.target_container_id:
                        target_container = next((c for c in self.containers if c.id == truck.target_container_id), None)
                        if target_container:
                            truck.dwell_ticks = 2
                            truck.status = "RECOLECTANDO"
                            recolectado_kg = target_container.empty()
                            truck.current_load_kg += recolectado_kg
                            # Notificar de inmediato al backend que el contenedor quedó en 0%
                            self._send_http_payload("/telemetry/container", target_container.to_telemetry_payload())
                            self.log_event(
                                f"✅ Camión {truck.plate} vació el contenedor {target_container.code} ({target_container.name}). Recogido: {recolectado_kg:.1f} kg. Carga actual camión: {truck.current_load_kg:.1f} kg",
                                "SUCCESS",
                            )
                        truck.target_container_id = None
                        truck.target_name = None

                if self.tick_count % 2 == 0:
                    self._send_http_payload("/telemetry/truck", truck.to_telemetry_payload())

    def get_state(self):
        """Retorna el estado completo del gemelo digital en JSON."""
        with self.lock:
            return {
                "simulated_time": f"{self.simulated_hour:02d}:{self.simulated_minute:02d}",
                "is_running": self.running,
                "is_paused": self.paused,
                "time_acceleration": self.time_acceleration,
                "forward_to_backend": self.forward_to_backend,
                "backend_url": self.backend_url,
                "depot": DEPOT_LOCATION,
                "disposal": DISPOSAL_STATION,
                "containers": [c.to_dict() for c in self.containers],
                "trucks": [t.to_dict() for t in self.trucks],
                "events": self.events[:25],
            }

    def force_fill_all(self, percentage: float = 95.0):
        """Forzar llenado para simular situación de emergencia."""
        with self.lock:
            for c in self.containers:
                c.force_fill(percentage)
                self._send_http_payload("/telemetry/container", c.to_telemetry_payload())
            self.log_event(f"⚡ Simulación forzada: Todos los contenedores fijados al {percentage}%", "CONTROL")

    def empty_all_containers(self):
        """Vaciar todos los contenedores manualmente."""
        with self.lock:
            for c in self.containers:
                c.fill_percentage = 0.0
                self._send_http_payload("/telemetry/container", c.to_telemetry_payload())
            self.log_event("🧹 Todos los contenedores vaciados manualmente.", "CONTROL")

    def toggle_pause(self):
        with self.lock:
            self.paused = not self.paused
            status = "PAUSADA" if self.paused else "REANUDADA"
            self.log_event(f"⏸️ Simulación {status}", "CONTROL")
            return self.paused

    def set_speed(self, speed: float):
        with self.lock:
            self.time_acceleration = max(0.5, min(20.0, float(speed)))
            self.log_event(f"⏩ Velocidad de simulación ajustada a {self.time_acceleration}x", "CONTROL")

    def toggle_backend_forwarding(self):
        with self.lock:
            self.forward_to_backend = not self.forward_to_backend
            status = "ACTIVADA" if self.forward_to_backend else "DESACTIVADA"
            self.log_event(f"📡 Sincronización con Backend REST {status} ({self.backend_url})", "CONTROL")
            return self.forward_to_backend
