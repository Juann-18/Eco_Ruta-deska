"""
Módulo de navegación y enrutamiento del simulador.
Calcula rutas viales reales mediante OSRM (Open Source Routing Machine)
con degradación suave (fallback) a interpolación geográfica local.
"""

import math
import json
import urllib.request
import urllib.error

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodésica exacta en metros entre dos puntos."""
    R = 6371000.0  # Radio terrestre en metros
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def get_osrm_route(start_lat: float, start_lng: float, dest_lat: float, dest_lng: float, timeout_sec: float = 2.0):
    """
    Consulta la API pública de OSRM para obtener la traza de calles reales.
    Retorna una lista de coordenadas [[lat, lng], [lat, lng], ...] o None si falla.
    """
    url = (
        f"http://router.project-osrm.org/route/v1/driving/"
        f"{start_lng:.6f},{start_lat:.6f};{dest_lng:.6f},{dest_lat:.6f}"
        f"?overview=full&geometries=geojson"
    )
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "EcoRuta-Simulator/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if "routes" in data and len(data["routes"]) > 0:
                    coords = data["routes"][0]["geometry"]["coordinates"]
                    # OSRM retorna [lng, lat], convertimos a [lat, lng]
                    return [[pt[1], pt[0]] for pt in coords]
    except Exception:
        # Fallback silencioso si no hay conexión a internet o el servidor OSRM está saturado
        return None
    return None

def interpolate_line(start_lat: float, start_lng: float, dest_lat: float, dest_lng: float, num_points: int = 15):
    """Genera waypoints lineales uniformes si OSRM no está disponible."""
    points = []
    for step in range(1, num_points + 1):
        fraction = step / float(num_points)
        lat = start_lat + (dest_lat - start_lat) * fraction
        lng = start_lng + (dest_lng - start_lng) * fraction
        points.append([round(lat, 6), round(lng, 6)])
    return points

def calculate_route_waypoints(start_lat: float, start_lng: float, dest_lat: float, dest_lng: float):
    """
    Retorna la lista ordenada de waypoints geográficos para que el camión navegue
    desde el origen hasta el destino.
    """
    # Intentar OSRM primero para traza de calles realistas
    osrm_points = get_osrm_route(start_lat, start_lng, dest_lat, dest_lng)
    if osrm_points and len(osrm_points) > 1:
        return osrm_points

    # Fallback determinista local
    dist = haversine_distance_meters(start_lat, start_lng, dest_lat, dest_lng)
    # 1 punto por cada ~50 metros
    num_pts = max(6, int(dist / 40.0))
    return interpolate_line(start_lat, start_lng, dest_lat, dest_lng, num_pts)
