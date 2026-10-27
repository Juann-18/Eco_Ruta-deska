import { ContainerTelemetryInput, TruckTelemetryInput } from "./telemetry.schema.js";
import { prisma } from "../../config/prisma.js";

export interface TelemetryAlert {
  id: string;
  source_type: "CONTAINER" | "TRUCK";
  source_code: string;
  type: "CRITICAL_FILL" | "FIRE_HAZARD" | "TRUCK_OVERLOAD";
  message: string;
  timestamp: string;
}

export interface StoredContainerTelemetry extends ContainerTelemetryInput {
  is_critical: boolean;
  fire_hazard: boolean;
  last_updated: string;
}

export interface StoredTruckTelemetry extends TruckTelemetryInput {
  load_percentage: number;
  is_near_capacity: boolean;
  last_updated: string;
}

export class TelemetryService {
  private containers = new Map<string, StoredContainerTelemetry>();
  private trucks = new Map<string, StoredTruckTelemetry>();
  private alerts: TelemetryAlert[] = [];

  public async processContainerTelemetry(
    data: ContainerTelemetryInput
  ): Promise<StoredContainerTelemetry> {
    const isCritical = data.fill_percentage >= 80.0;
    const fireHazard = data.temperature_celsius >= 55.0;
    const now = new Date().toISOString();

    const record: StoredContainerTelemetry = {
      ...data,
      is_critical: isCritical,
      fire_hazard: fireHazard,
      last_updated: now,
    };

    this.containers.set(data.container_code, record);

    // Sincronizar nivel de llenado en PostgreSQL
    try {
      await prisma.recyclePoint.updateMany({
        where: { code: { equals: data.container_code, mode: "insensitive" } },
        data: {
          currentFillPercentage: data.fill_percentage,
          ...(data.fill_percentage <= 1.0 && { lastEmptiedAt: new Date() }),
        },
      });
    } catch {
      // Ignorar si el código es de un sensor de prueba no registrado
    }

    if (isCritical) {
      this.addAlert({
        id: `ALERT-FILL-${data.container_code}-${Date.now()}`,
        source_type: "CONTAINER",
        source_code: data.container_code,
        type: "CRITICAL_FILL",
        message: `El contenedor ${data.container_code} superó el umbral crítico con ${data.fill_percentage}% de llenado.`,
        timestamp: now,
      });
    }

    if (fireHazard) {
      this.addAlert({
        id: `ALERT-FIRE-${data.container_code}-${Date.now()}`,
        source_type: "CONTAINER",
        source_code: data.container_code,
        type: "FIRE_HAZARD",
        message: `ALERTA DE INCENDIO: Contenedor ${data.container_code} registra ${data.temperature_celsius}°C.`,
        timestamp: now,
      });
    }

    return record;
  }

  public resetContainerFill(code: string): void {
    const existing = this.containers.get(code);
    if (existing) {
      existing.fill_percentage = 0.0;
      existing.weight_kg = 0.0;
      existing.is_critical = false;
      existing.last_updated = new Date().toISOString();
    }
  }

  public processTruckTelemetry(data: TruckTelemetryInput): StoredTruckTelemetry {
    const loadPercentage =
      data.max_capacity_kg > 0
        ? Math.round((data.current_load_kg / data.max_capacity_kg) * 1000) / 10
        : 0;
    const isNearCapacity = loadPercentage >= 90.0;
    const now = new Date().toISOString();

    const record: StoredTruckTelemetry = {
      ...data,
      load_percentage: loadPercentage,
      is_near_capacity: isNearCapacity,
      last_updated: now,
    };

    this.trucks.set(data.truck_id, record);

    if (isNearCapacity) {
      this.addAlert({
        id: `ALERT-TRUCK-${data.truck_id}-${Date.now()}`,
        source_type: "TRUCK",
        source_code: data.plate,
        type: "TRUCK_OVERLOAD",
        message: `Camión ${data.plate} al ${loadPercentage}% de capacidad (${data.current_load_kg}/${data.max_capacity_kg} kg). Requiere desvío a planta de acopio.`,
        timestamp: now,
      });
    }

    return record;
  }

  public getLiveSnapshot() {
    return {
      containers_count: this.containers.size,
      trucks_count: this.trucks.size,
      containers: Array.from(this.containers.values()),
      trucks: Array.from(this.trucks.values()),
      active_alerts: this.alerts.slice(-20),
    };
  }

  public getContainer(code: string): StoredContainerTelemetry | undefined {
    return this.containers.get(code);
  }

  public getTruck(id: string): StoredTruckTelemetry | undefined {
    return this.trucks.get(id);
  }

  private addAlert(alert: TelemetryAlert) {
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) {
      this.alerts.pop();
    }
  }

  public clear() {
    this.containers.clear();
    this.trucks.clear();
    this.alerts = [];
  }
}

export const telemetryService = new TelemetryService();
