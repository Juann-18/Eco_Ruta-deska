"""
Modelos de dominio para el Gemelo Digital de Eco_Ruta.
Representan Contenedores Inteligentes (RecyclePoint) y Camiones Recolectores (Vehicle).
"""

import uuid
import random
from datetime import datetime
from simulator.config import WASTE_TYPES, COMUNAS

class SimulatedContainer:
    """Representa un contenedor de reciclaje público equipado con telemetría virtual."""

    def __init__(self, code: str, name: str, address: str, comuna: int,
                 waste_type: str, lat: float, lng: float, capacity_kg: float = 120.0,
                 initial_fill: float = None):
        self.id = str(uuid.uuid4())
        self.code = code
        self.name = name
        self.address = address
        self.comuna = comuna
        self.waste_type = waste_type
        self.latitude = round(lat, 6)
        self.longitude = round(lng, 6)
        self.capacity_kg = capacity_kg
        self.fill_percentage = initial_fill if initial_fill is not None else round(random.uniform(10.0, 70.0), 1)
        self.battery_percentage = round(random.uniform(85.0, 100.0), 1)
        self.temperature_celsius = round(random.uniform(21.0, 26.0), 1)
        self.fill_rate_factor = random.uniform(0.3, 1.8) # Variación de afluencia vecinal
        self.is_active = True
        self.last_emptied_at = None

    def tick(self, time_acceleration: float = 1.0, is_peak_hour: bool = False):
        """Simula el paso del tiempo, acumulación de residuos y desgaste de batería."""
        # Multiplicador según hora pico de basura
        peak_mult = 1.8 if is_peak_hour else 0.8
        noise = random.uniform(0.7, 1.3)
        increment = self.fill_rate_factor * peak_mult * noise * (time_acceleration / 5.0)

        self.fill_percentage = min(100.0, round(self.fill_percentage + increment, 1))

        # Drenaje realista de batería del sensor (muy lento)
        self.battery_percentage = max(1.0, round(self.battery_percentage - 0.005 * time_acceleration, 2))

        # Fluctuación de temperatura ambiente
        self.temperature_celsius = round(22.0 + random.uniform(-1.0, 3.5), 1)

    def empty(self) -> float:
        """Vacía el contenedor y retorna los kilogramos recogidos."""
        collected_kg = round((self.fill_percentage / 100.0) * self.capacity_kg, 1)
        self.fill_percentage = 0.0
        self.last_emptied_at = datetime.utcnow().isoformat() + "Z"
        return collected_kg

    def force_fill(self, percentage: float):
        """Método de prueba para pruebas de estrés y forzado de alertas."""
        self.fill_percentage = max(0.0, min(100.0, float(percentage)))

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "address": self.address,
            "comuna": self.comuna,
            "waste_type": self.waste_type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "capacity_kg": self.capacity_kg,
            "current_weight_kg": round((self.fill_percentage / 100.0) * self.capacity_kg, 1),
            "fill_percentage": self.fill_percentage,
            "battery_percentage": self.battery_percentage,
            "temperature_celsius": self.temperature_celsius,
            "is_critical": self.fill_percentage >= 80.0,
            "is_active": self.is_active,
            "last_emptied_at": self.last_emptied_at
        }

    def to_telemetry_payload(self):
        """Contrato de telemetría IoT compatible con Prisma y endpoints REST."""
        return {
            "container_code": self.code,
            "recycle_point_id": self.id,
            "fill_percentage": self.fill_percentage,
            "weight_kg": round((self.fill_percentage / 100.0) * self.capacity_kg, 1),
            "battery_percentage": self.battery_percentage,
            "temperature_celsius": self.temperature_celsius,
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


class SimulatedTruck:
    """Representa un vehículo compactador de residuos con GPS y telemetría de carga."""

    def __init__(self, truck_id: str, plate: str, model: str, start_lat: float, start_lng: float,
                 max_capacity_kg: float = 5000.0):
        self.id = truck_id
        self.plate = plate
        self.model = model
        self.latitude = round(start_lat, 6)
        self.longitude = round(start_lng, 6)
        self.max_capacity_kg = max_capacity_kg
        self.current_load_kg = 0.0
        self.fuel_percentage = 95.0
        self.speed_kmh = 0.0
        self.status = "IDLE"  # IDLE, EN_CAMINO, RECOLECTANDO, DESCARGANDO, EN_BASE
        self.target_container_id = None
        self.target_name = None
        self.waypoints = []
        self.dwell_ticks = 0  # Tiempo que permanece quieto ejecutando una acción

    def set_route(self, waypoints: list, target_id: str = None, target_name: str = None, status: str = "EN_CAMINO"):
        """Asigna una nueva ruta de waypoints a seguir."""
        self.waypoints = waypoints
        self.target_container_id = target_id
        self.target_name = target_name
        self.status = status
        self.speed_kmh = random.uniform(25.0, 38.0)

    def step(self):
        """Avanza un paso en la simulación."""
        if self.dwell_ticks > 0:
            self.dwell_ticks -= 1
            self.speed_kmh = 0.0
            return "DWELLING"

        if not self.waypoints:
            self.speed_kmh = 0.0
            if self.status not in ["IDLE", "EN_BASE"]:
                self.status = "IDLE"
            return "ARRIVED"

        # Avanzar al siguiente waypoint
        next_point = self.waypoints.pop(0)
        self.latitude = next_point[0]
        self.longitude = next_point[1]
        self.speed_kmh = round(random.uniform(20.0, 40.0), 1)

        # Consumo leve de combustible
        self.fuel_percentage = max(5.0, round(self.fuel_percentage - 0.008, 2))

        if not self.waypoints:
            return "ARRIVED"

        return "MOVING"

    def unload(self):
        """Descarga toda la basura recogida en el vertedero/planta."""
        unloaded = self.current_load_kg
        self.current_load_kg = 0.0
        return unloaded

    def to_dict(self):
        return {
            "id": self.id,
            "plate": self.plate,
            "model": self.model,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current_load_kg": round(self.current_load_kg, 1),
            "max_capacity_kg": self.max_capacity_kg,
            "load_percentage": round((self.current_load_kg / self.max_capacity_kg) * 100.0, 1),
            "fuel_percentage": self.fuel_percentage,
            "speed_kmh": self.speed_kmh,
            "status": self.status,
            "target_container_id": self.target_container_id,
            "target_name": self.target_name,
            "remaining_waypoints_count": len(self.waypoints)
        }

    def to_telemetry_payload(self):
        """Contrato de telemetría GPS vehicular compatible con el backend."""
        return {
            "truck_id": self.id,
            "plate": self.plate,
            "status": self.status,
            "current_load_kg": round(self.current_load_kg, 1),
            "max_capacity_kg": self.max_capacity_kg,
            "speed_kmh": self.speed_kmh,
            "fuel_percentage": self.fuel_percentage,
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
