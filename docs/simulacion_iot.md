# Gemelo Digital & Simulación de Telemetría IoT — Eco_Ruta

## 1. Justificación y Enfoque

En el desarrollo de soluciones de ciudades inteligentes (*Smart Cities*) y optimización de rutas de recolección de residuos (VRP / TSP), la adquisición e instalación de cientos de sensores ultrasónicos físicos y dispositivos GPS vehiculares representa una barrera de costos e infraestructura inicial.

Para solucionar este desafío sin detener el desarrollo, **Eco_Ruta** incorpora una arquitectura de **Gemelo Digital (Digital Twin)**:
- Simula en software el comportamiento de la red de contenedores inteligentes (*RecyclePoints*) y la flota de camiones (*Vehicles / Routes*).
- El backend y el frontend consumen los mismos contratos de datos JSON y protocolos (HTTP REST / WebSockets) que utilizarían los sensores físicos.
- Permite realizar pruebas de estrés, demostraciones interactivas a clientes/autoridades y validación algorítmica de rutas en tiempo real.

---

## 2. Arquitectura del Simulador

El motor de simulación se encuentra ubicado en la carpeta `/simulator` y no requiere dependencias externas pesadas (utiliza la biblioteca estándar de Python y Leaflet.js para el mapa):

```
simulator/
├── config.py       # Coordenadas de Tuluá, parámetros de simulación y URLs
├── models.py       # Clases de dominio (SimulatedContainer, SimulatedTruck)
├── routing.py      # Enrutamiento vial real (OSRM) + fallback geodésico
├── engine.py       # Motor estocástico de llenado, despacho y recolección
├── server.py       # Servidor HTTP local con API de control y estado
├── main.py         # Punto de entrada CLI (Web o Headless)
└── web/
    └── index.html  # Panel de control y mapa interactivo en vivo (Leaflet)
```

### Comportamiento del Motor
1. **Llenado Estocástico y Ritmo Circadiano:**
   - Los contenedores incrementan su nivel de llenado según una tasa estocástica con horas pico municipales (12:00–14:00 y 19:00–22:00).
   - Generan variables de temperatura ambiente (con detección de incendios si supera 60°C) y drenaje paulatino de batería.
2. **Navegación Vial Real:**
   - Los camiones consultan la API de OSRM (*Open Source Routing Machine*) para seguir calles reales de Tuluá hacia su destino. Si no hay conexión o se satura el servicio, recurre automáticamente a interpolación de trayectorias.
3. **Despacho Automático & Vaciado:**
   - Cuando un contenedor supera el **80% de capacidad**, emite una alerta crítica.
   - El motor asigna el camión libre más cercano.
   - Al aproximarse a menos de 45 metros, el camión pasa a estado `RECOLECTANDO`, vacía el contenedor (0%), suma el peso a su tolva y reanuda el patrullaje.
   - Si el camión alcanza el **90% de su capacidad máxima (5,000 kg)**, se desvía automáticamente a la *Planta de Acopio Municipal* para descargar.

---

## 3. Instrucciones de Uso

### 3.1 Modo Web Interactivo (Recomendado)
Inicia el simulador con panel visual y mapa en tiempo real:

```bash
python simulator/main.py
```

Luego abre tu navegador en:
**http://localhost:8080**

**Funcionalidades del Panel Web:**
- **Mapa en tiempo real:** Visualiza contenedores clasificados por color (Verde <50%, Amarillo 50–80%, Rojo >80% parpadeante) y camiones en movimiento.
- **Controles de simulación:** Botón de Pausa/Reanudación, aceleración de tiempo (1x, 2x, 5x, 10x).
- **Prueba de Estrés:** Botón *"⚡ Llenar Contenedores al 95%"* para forzar alertas masivas y comprobar la reacción de la flota.
- **Sincronización:** Botón para activar/desactivar el envío de peticiones POST hacia el backend de Eco_Ruta.
- **Registro en vivo:** Terminal interactiva con el feed cronológico de eventos.

### 3.2 Modo Headless (Línea de Comandos)
Para entornos de integración continua (CI/CD) o pruebas en segundo plano:

```bash
python simulator/main.py --headless --containers 20 --trucks 3 --speed 5.0
```

### 3.3 Argumentos CLI Disponibles

| Parámetro | Default | Descripción |
| :--- | :--- | :--- |
| `--port` | `8080` | Puerto HTTP para el panel web del simulador. |
| `--containers` | `18` | Número de contenedores virtuales a desplegar. |
| `--trucks` | `2` | Número de camiones en la flota. |
| `--speed` | `1.0` | Factor multiplicador de velocidad (1.0 = tiempo real). |
| `--sync-backend` | `False` | Habilita el envío automático de telemetría por HTTP POST. |
| `--backend-url` | `http://localhost:3000/api` | Dirección del API REST de Eco_Ruta. |

---

## 4. Contratos de Telemetría (JSON Payloads)

El simulador emite datos hacia los siguientes endpoints:

### 4.1 Telemetría de Contenedores (`POST /api/telemetry/container`)
```json
{
  "container_code": "#CNT-0001",
  "recycle_point_id": "0e848919-853e-4bc1-b2f6-9544df3254a5",
  "fill_percentage": 87.5,
  "weight_kg": 105.0,
  "battery_percentage": 94.2,
  "temperature_celsius": 24.3,
  "location": {
    "latitude": 4.084712,
    "longitude": -76.195431
  },
  "timestamp": "2026-10-20T17:00:00Z"
}
```

### 4.2 Telemetría de Camiones (`POST /api/telemetry/truck`)
```json
{
  "truck_id": "TRUCK-01",
  "plate": "TUL-482",
  "status": "EN_CAMINO",
  "current_load_kg": 1420.5,
  "max_capacity_kg": 5000.0,
  "speed_kmh": 32.4,
  "fuel_percentage": 88.6,
  "location": {
    "latitude": 4.086110,
    "longitude": -76.193240
  },
  "timestamp": "2026-10-20T17:00:00Z"
}
```

---

## 5. Hoja de Ruta para Migración a Hardware Físico

Cuando se adquiera el hardware para un piloto de campo:

```
[ Sensor Físico HC-SR04 ] ---> [ ESP32 Microcontroller ] ---> (WiFi / 4G / LoRaWAN)
                                                                       │
                                                                       ▼
                                                          [ API REST: Eco_Ruta ]
                                                                       ▲
                                                                       │
                                                       [ Simulador Gemelo Digital ]
```

1. **Prototipo con ESP32 + Sensor Ultrasónico (HC-SR04 / JSN-SR04T):**
   - El sensor mide la distancia desde la tapa superior hasta el nivel de la basura ($d$).
   - Porcentaje de llenado: $\text{fill\_percentage} = \frac{\text{Altura Contenedor} - d}{\text{Altura Contenedor}} \times 100$.
   - El ESP32 envía por HTTP POST o MQTT el mismo payload JSON con su `container_code` correspondiente.
2. **Convivencia Híbrida:**
   - La base de datos y la interfaz gráfica no diferencian entre un dato generado por el script de simulación y un dato proveniente de un sensor real, garantizando una transición inmediata y sin refactorizaciones en la aplicación.
