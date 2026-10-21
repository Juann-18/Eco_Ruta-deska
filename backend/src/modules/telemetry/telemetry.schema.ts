import { z } from "zod";

// Coordenadas geográficas flexibles (soporta lat/lng y latitude/longitude)
const locationSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .transform((loc) => ({
    latitude: loc.latitude ?? loc.lat ?? 0,
    longitude: loc.longitude ?? loc.lng ?? 0,
  }));

// Telemetría de Contenedor Inteligente
export const containerTelemetrySchema = z.object({
  container_code: z.string().min(1, "El código del contenedor es requerido"),
  recycle_point_id: z.string().optional(),
  fill_percentage: z.number().min(0).max(100, "El porcentaje debe estar entre 0 y 100"),
  weight_kg: z.number().min(0, "El peso no puede ser negativo").default(0),
  battery_percentage: z.number().min(0).max(100).default(100),
  temperature_celsius: z.number().min(-30).max(100).default(20),
  location: locationSchema,
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

export type ContainerTelemetryInput = z.infer<typeof containerTelemetrySchema>;

// Telemetría de Camión Recolector
export const truckTelemetrySchema = z.object({
  truck_id: z.string().min(1, "El identificador del camión es requerido"),
  plate: z.string().min(1, "La placa es requerida"),
  status: z
    .enum(["IDLE", "EN_CAMINO", "RECOLECTANDO", "DESCARGANDO", "EN_BASE", "patrolling", "collecting"])
    .transform((val) => val.toUpperCase()),
  current_load_kg: z.number().min(0, "La carga no puede ser negativa").default(0),
  max_capacity_kg: z.number().min(100).default(5000),
  speed_kmh: z.number().min(0).default(0),
  fuel_percentage: z.number().min(0).max(100).default(100),
  location: locationSchema,
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

export type TruckTelemetryInput = z.infer<typeof truckTelemetrySchema>;
