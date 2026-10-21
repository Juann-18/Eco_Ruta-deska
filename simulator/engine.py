"""
Motor central de simulación para Eco_Ruta.
Gestiona el gemelo digital, despacho de camiones, recolección y sincronización.
"""

import time
import math
import random
import threading
import urllib.request
import urllib.error
import json
from datetime import datetime

from simulator.config import (
    DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG, GEO_SPAN_LAT, GEO_SPAN_LNG,
    DISPOSAL_STATION, DEPOT_LOCATION, DEFAULT_NUM_CONTAINERS, DEFAULT_NUM_TRUCKS,
    CRITICAL_FILL_THRESHOLD, COLLECTION_PROXIMITY_METERS, WASTE_TYPES, COMUNAS,
    API_BACKEND_URL, HTTP_TIMEOUT_SECONDS
)
from simulator.models import SimulatedContainer, SimulatedTruck
from simulator.routing import calculate_route_waypoints, haversine_distance_meters

class SimulationEngine:
    def __init__(self, num_containers: int = DEFAULT_NUM_CONTAINERS, num_trucks: int = DEFAULT_NUM_TRUCKS):
        self.lock = threading.Lock()
        self.running = False
        self.paused = False
        self.time_acceleration = 1.0  # 1x, 2x, 5x, 10x
        self.forward_to_backend = False
        self.backend_url = API_BACKEND_URL

        self.containers = []
        self.trucks = []
        self.events = []
        self.simulated_hour = 8  # Comienza a las 08:00 AM
        self.simulated_minute = 0
        self.tick_count = 0

        self._init_containers(num_containers)
        self._init_trucks(num_trucks)

    def _init_containers(self, count: int):
        # Direcciones y barrios emblemáticos de Tuluá para realismo
        nombres_puntos = [
            ("Plaza Cívica Batalla de Boyacá", "Cra 26 con Calle 27", 1),
            ("Parque Infantil Julia Escarpeta", "Calle 28 con Cra 20", 1),
            ("Terminal de Transportes", "Calle 25 # 20-30", 2),
            ("Parque Bolívar", "Calle 26 con Cra 25", 2),
            ("Complejo Deportivo Alvernia", "Cra 38 con Calle 24", 3),
            ("Centro Comercial La 14", "Calle 27 # 33-15", 3),
            ("Mercado Central de Tuluá", "Cra 21 # 28-50", 4),
            ("Parque de la Guadua Guillermo Ponce", "Calle 44 # 25-10", 4),
            ("Hospital Departamental Tomás Uribe", "Calle 27 # 44-50", 5),
            ("Plaza San Juan Bosco", "Cra 28 # 36-20", 5),
            ("Parque Lineal Juan María Céspedes", "Calle 34 # 21-15", 6),
            ("Campus UCEVA (Universidad Central)", "Cra 27 A # 48-144", 6),
            ("Colegio Gimnasio del Pacífico", "Calle 32 # 27-40", 2),
            ("Barrio Victoria - Zona Comercial", "Cra 34 # 26-10", 3),
            ("Estación Ferrocarril Tuluá", "Calle 26 # 18-10", 1),
            ("Sector Chiminangos", "Transversal 12 # 20-05", 5),
            ("Zona Rosa Calle 26", "Calle 26 # 35-12", 3),
            ("Barrio Sajonia", "Cra 30 # 42-18", 4),
        ]

        for i in range(count):
            ref = nombres_puntos[i % len(nombres_puntos)]
            code = f"#CNT-{(i + 1):04d}"
            name = f"{ref[0]} #{i + 1}"
            address = ref[1]
            comuna = ref[2]
            waste_type = WASTE_TYPES[i % len(WASTE_TYPES)]

            # Dispersión en el mapa urbano de Tuluá
            lat = DEFAULT_CENTER_LAT + random.uniform(-GEO_SPAN_LAT, GEO_SPAN_LAT)
            lng = DEFAULT_CENTER_LNG + random.uniform(-GEO_SPAN_LNG, GEO_SPAN_LNG)

            container = SimulatedContainer(
                code=code,
                name=name,
                address=address,
                comuna=comuna,
                waste_type=waste_type,
                lat=lat,
                lng=lng,
                capacity_kg=random.choice([120.0, 150.0, 200.0]),
                initial_fill=round(random.uniform(15.0, 75.0), 1)
            )
            self.containers.append(container)

    def _init_trucks(self, count: int):
        placas = ["TUL-482", "TUL-719", "TUL-903", "TUL-115"]
        modelos = ["Chevrolet FTR Compactador", "Hino 500 Basurero", "International Durastar", "Kenworth T370"]

        for i in range(count):
            truck_id = f"TRUCK-{(i + 1):02d}"
            plate = placas[i % len(placas)]
            model = modelos[i % len(modelos)]
            # Inician en la cochera operativa
            lat = DEPOT_LOCATION["lat"] + (i * 0.001)
            lng = DEPOT_LOCATION["lng"] + (i * 0.001)

            truck = SimulatedTruck(
                truck_id=truck_id,
                plate=plate,
                model=model,
                start_lat=lat,
                start_lng=lng,
                max_capacity_kg=5000.0
            )
            self.trucks.append(truck)

    def log_event(self, message: str, event_type: str = "INFO"):
        """Registra un evento en el historial en memoria."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = {
            "time": timestamp,
            "type": event_type,
            "message": message
        }
        self.events.insert(0, entry)
        if len(self.events) > 60:
            self.events.pop()
        try:
            print(f"[{timestamp}] [{event_type}] {message}")
        except UnicodeEncodeError:
            clean_message = message.encode('ascii', errors='replace').decode('ascii')
            print(f"[{timestamp}] [{event_type}] {clean_message}")

    def _dispatch_truck_to_container(self, truck: SimulatedTruck, container: SimulatedContainer):
        waypoints = calculate_route_waypoints(
            truck.latitude, truck.longitude,
            container.latitude, container.longitude
        )
        truck.set_route(waypoints, target_id=container.id, target_name=container.code, status="EN_CAMINO")
        self.log_event(
            f"🚛 Camión {truck.plate} despachado hacia contenedor {container.code} ({container.name}) - Llenado: {container.fill_percentage}%",
            "DISPATCH"
        )

    def _dispatch_truck_to_disposal(self, truck: SimulatedTruck):
        waypoints = calculate_route_waypoints(
            truck.latitude, truck.longitude,
            DISPOSAL_STATION["lat"], DISPOSAL_STATION["lng"]
        )
        truck.set_route(waypoints, target_id="DISPOSAL", target_name=DISPOSAL_STATION["name"], status="EN_CAMINO")
        self.log_event(
            f"⚠️ Camión {truck.plate} lleno ({truck.current_load_kg:.1f} kg / {truck.max_capacity_kg} kg). En ruta a descarga en {DISPOSAL_STATION['name']}.",
            "ALERT"
        )

    def _send_http_payload(self, path: str, payload: dict):
        """Envía telemetría al backend REST si la sincronización está habilitada."""
        if not self.forward_to_backend:
            return
        url = f"{self.backend_url}{path}"
        try:
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json", "User-Agent": "EcoRutaSimulator/1.0"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
                pass
        except Exception:
            # Fallback silencioso para no bloquear el bucle si el backend aún no está escuchando
            pass

    def tick(self):
        """Ejecuta un paso discreto de la simulación."""
        with self.lock:
            if self.paused:
                return

            self.tick_count += 1

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

                # Notificar si cruzó el umbral crítico
                if prev_fill < CRITICAL_FILL_THRESHOLD <= container.fill_percentage:
                    self.log_event(
                        f"🚨 ALERTA: Contenedor {container.code} ha alcanzado nivel crítico ({container.fill_percentage}%).",
                        "CRITICAL"
                    )

                # Telemetría de contenedor al backend
                if self.tick_count % 3 == 0:
                    self._send_http_payload("/telemetry/container", container.to_telemetry_payload())

            # 2. Asignar camiones y resolver movimiento
            assigned_target_ids = {t.target_container_id for t in self.trucks if t.target_container_id}

            for truck in self.trucks:
                # Comprobar si el camión ya está casi lleno (>= 90%)
                if truck.current_load_kg >= (truck.max_capacity_kg * 0.90) and truck.target_container_id != "DISPOSAL":
                    self._dispatch_truck_to_disposal(truck)
                    continue

                # Si el camión está libre (IDLE), buscar el contenedor crítico más cercano no asignado
                if truck.status == "IDLE":
                    urgentes = [
                        c for c in self.containers
                        if c.fill_percentage >= CRITICAL_FILL_THRESHOLD and c.id not in assigned_target_ids
                    ]

                    if urgentes:
                        # Seleccionar el que esté más lleno
                        urgentes.sort(key=lambda c: c.fill_percentage, reverse=True)
                        target_container = urgentes[0]
                        assigned_target_ids.add(target_container.id)
                        self._dispatch_truck_to_container(truck, target_container)

                # Mover el camión
                step_result = truck.step()

                # Manejar llegada a destino
                if step_result == "ARRIVED":
                    if truck.target_container_id == "DISPOSAL":
                        # Llegó al vertedero
                        truck.dwell_ticks = 3
                        truck.status = "DESCARGANDO"
                        descargado = truck.unload()
                        self.log_event(
                            f"♻️ Camión {truck.plate} completó la descarga de {descargado:.1f} kg en la Planta de Acopio.",
                            "SUCCESS"
                        )
                        truck.target_container_id = None
                        truck.target_name = None
                    elif truck.target_container_id:
                        # Buscar el contenedor
                        target_container = next((c for c in self.containers if c.id == truck.target_container_id), None)
                        if target_container:
                            truck.dwell_ticks = 2
                            truck.status = "RECOLECTANDO"
                            recolectado_kg = target_container.empty()
                            truck.current_load_kg += recolectado_kg
                            self.log_event(
                                f"✅ Camión {truck.plate} vació el contenedor {target_container.code} ({target_container.name}). Recogido: {recolectado_kg:.1f} kg. Carga actual camión: {truck.current_load_kg:.1f} kg",
                                "SUCCESS"
                            )
                        truck.target_container_id = None
                        truck.target_name = None

                # Enviar telemetría vehicular al backend
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
                "events": self.events[:25]
            }

    def force_fill_all(self, percentage: float = 95.0):
        """Forzar llenado para simular situación de emergencia."""
        with self.lock:
            for c in self.containers:
                c.force_fill(percentage)
            self.log_event(f"⚡ Simulación forzada: Todos los contenedores fijados al {percentage}%", "CONTROL")

    def empty_all_containers(self):
        """Vaciar todos los contenedores manualmente."""
        with self.lock:
            for c in self.containers:
                c.fill_percentage = 0.0
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
