"""
Configuración global para el Simulador de Telemetría IoT de Eco_Ruta.
Basado en la geolocalización de Tuluá, Valle del Cauca, Colombia.
"""

# Coordenadas de referencia (Tuluá, Colombia)
DEFAULT_CENTER_LAT = 4.0847
DEFAULT_CENTER_LNG = -76.1954
GEO_SPAN_LAT = 0.025
GEO_SPAN_LNG = 0.025

# Ubicación del vertedero / centro de acopio y descarga municipal
DISPOSAL_STATION = {
    "name": "Planta de Tratamiento y Acopio Municipal Tuluá",
    "lat": 4.0685,
    "lng": -76.2120
}

# Cochera / Garaje inicial de camiones
DEPOT_LOCATION = {
    "name": "Cochera Operativa EcoAseo",
    "lat": 4.0950,
    "lng": -76.1820
}

# Parámetros operativos
DEFAULT_NUM_CONTAINERS = 18
DEFAULT_NUM_TRUCKS = 2
TICK_INTERVAL_SECONDS = 2.0  # Frecuencia del ciclo del motor en segundos

# Umbrales
CRITICAL_FILL_THRESHOLD = 80.0     # Nivel para marcar alerta y despachar camión (%)
COLLECTION_PROXIMITY_METERS = 45.0 # Distancia a la que el camión vacía el contenedor (m)
EMPTYING_DURATION_TICKS = 2        # Cuántos ticks tarda el camión cargando la basura

# Tipos de residuos compatibles con schema.prisma
WASTE_TYPES = [
    "PAPEL_CARTON",
    "VIDRIO",
    "PLASTICO",
    "METAL",
    "ESCOMBRO",
    "ORGANICO"
]

# Comunas de Tuluá
COMUNAS = [1, 2, 3, 4, 5, 6]

# Conexión con el Backend de Eco_Ruta
API_BACKEND_URL = "http://localhost:3000/api"
FORWARD_TO_BACKEND_DEFAULT = True  # Sincronización activa por defecto con PostgreSQL/Backend
HTTP_TIMEOUT_SECONDS = 1.5

# Servidor Web interno del Simulador
SIMULATOR_WEB_HOST = "127.0.0.1"
SIMULATOR_WEB_PORT = 8080
