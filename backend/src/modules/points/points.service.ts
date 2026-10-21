import { randomUUID } from "node:crypto";
import {
  CreatePointInput,
  GetPointsQuery,
  UpdatePointInput,
  WasteType,
} from "./points.schema.js";
import { telemetryService } from "../telemetry/telemetry.service.js";
import { prisma } from "../../config/prisma.js";

export interface StoredRecyclePoint {
  id: string;
  code: string;
  name: string;
  address: string;
  comuna: number;
  latitude: number;
  longitude: number;
  wasteType: WasteType;
  capacityKg: number;
  currentFillPercentage: number;
  isActive: boolean;
  lastEmptiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedRecyclePoint extends StoredRecyclePoint {
  isCritical: boolean;
  batteryPercentage: number;
  temperatureCelsius: number;
  currentWeightKg: number;
  hasLiveTelemetry: boolean;
}

export class PointsService {
  private points: Map<string, StoredRecyclePoint> = new Map();

  constructor() {
    this.seedDefaultPoints();
  }

  private seedDefaultPoints() {
    const seedData: Array<Omit<StoredRecyclePoint, "id" | "createdAt" | "updatedAt">> = [
      {
        code: "#CNT-0001",
        name: "Punto Verde Plaza Cívica Boyacá",
        address: "Cra 26 con Calle 27",
        comuna: 1,
        latitude: 4.0847,
        longitude: -76.1954,
        wasteType: "PAPEL_CARTON",
        capacityKg: 150.0,
        currentFillPercentage: 45.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0002",
        name: "Punto Ecológico Parque Infantil",
        address: "Calle 28 con Cra 20",
        comuna: 1,
        latitude: 4.0862,
        longitude: -76.1915,
        wasteType: "PLASTICO",
        capacityKg: 120.0,
        currentFillPercentage: 88.5, // Crítico
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0003",
        name: "Estación Terminal de Transportes",
        address: "Calle 25 # 20-30",
        comuna: 2,
        latitude: 4.0815,
        longitude: -76.1892,
        wasteType: "VIDRIO",
        capacityKg: 200.0,
        currentFillPercentage: 35.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0004",
        name: "Contenedor Parque Bolívar",
        address: "Calle 26 con Cra 25",
        comuna: 2,
        latitude: 4.0838,
        longitude: -76.1978,
        wasteType: "METAL",
        capacityKg: 120.0,
        currentFillPercentage: 62.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0005",
        name: "Punto Complejo Deportivo Alvernia",
        address: "Cra 38 con Calle 24",
        comuna: 3,
        latitude: 4.0792,
        longitude: -76.2045,
        wasteType: "PLASTICO",
        capacityKg: 150.0,
        currentFillPercentage: 92.0, // Crítico
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0006",
        name: "Centro Comercial La 14",
        address: "Calle 27 # 33-15",
        comuna: 3,
        latitude: 4.0855,
        longitude: -76.2082,
        wasteType: "PAPEL_CARTON",
        capacityKg: 200.0,
        currentFillPercentage: 20.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0007",
        name: "Punto Limpio Mercado Central",
        address: "Cra 21 # 28-50",
        comuna: 4,
        latitude: 4.0885,
        longitude: -76.1942,
        wasteType: "ORGANICO",
        capacityKg: 200.0,
        currentFillPercentage: 78.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0008",
        name: "Punto Parque de la Guadua",
        address: "Calle 44 # 25-10",
        comuna: 4,
        latitude: 4.0921,
        longitude: -76.1985,
        wasteType: "VIDRIO",
        capacityKg: 120.0,
        currentFillPercentage: 15.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0009",
        name: "Sector Hospital Tomás Uribe",
        address: "Calle 27 # 44-50",
        comuna: 5,
        latitude: 4.0811,
        longitude: -76.2155,
        wasteType: "ESCOMBRO",
        capacityKg: 300.0,
        currentFillPercentage: 82.0, // Crítico
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0010",
        name: "Plaza San Juan Bosco",
        address: "Cra 28 # 36-20",
        comuna: 5,
        latitude: 4.0754,
        longitude: -76.2110,
        wasteType: "PLASTICO",
        capacityKg: 120.0,
        currentFillPercentage: 50.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0011",
        name: "Campus UCEVA",
        address: "Cra 27 A # 48-144",
        comuna: 6,
        latitude: 4.0965,
        longitude: -76.2025,
        wasteType: "PAPEL_CARTON",
        capacityKg: 180.0,
        currentFillPercentage: 30.0,
        isActive: true,
        lastEmptiedAt: null,
      },
      {
        code: "#CNT-0012",
        name: "Parque Lineal Juan María Céspedes",
        address: "Calle 34 # 21-15",
        comuna: 6,
        latitude: 4.0910,
        longitude: -76.1905,
        wasteType: "METAL",
        capacityKg: 120.0,
        currentFillPercentage: 65.0,
        isActive: true,
        lastEmptiedAt: null,
      },
    ];

    const now = new Date().toISOString();
    for (const item of seedData) {
      const id = randomUUID();
      this.points.set(id, {
        ...item,
        id,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  private enrichPoint(point: StoredRecyclePoint): EnrichedRecyclePoint {
    const liveTelemetry = telemetryService.getContainer(point.code);

    const fillPercentage = liveTelemetry
      ? liveTelemetry.fill_percentage
      : point.currentFillPercentage;

    const isCritical = fillPercentage >= 80.0;
    const batteryPercentage = liveTelemetry ? liveTelemetry.battery_percentage : 95.0;
    const temperatureCelsius = liveTelemetry ? liveTelemetry.temperature_celsius : 23.5;
    const currentWeightKg = Math.round((fillPercentage / 100.0) * point.capacityKg * 10) / 10;

    return {
      ...point,
      currentFillPercentage: fillPercentage,
      isCritical,
      batteryPercentage,
      temperatureCelsius,
      currentWeightKg,
      hasLiveTelemetry: Boolean(liveTelemetry),
    };
  }

  public findAll(query: GetPointsQuery): EnrichedRecyclePoint[] {
    const results: EnrichedRecyclePoint[] = [];

    for (const point of this.points.values()) {
      if (!point.isActive) continue;

      // Filtro por comuna
      if (query.comuna && point.comuna !== query.comuna) {
        continue;
      }

      // Filtro por tipo de residuo
      if (query.wasteType && point.wasteType !== query.wasteType) {
        continue;
      }

      // Filtro por búsqueda de texto
      if (query.search) {
        const term = query.search.toLowerCase();
        const matchesName = point.name.toLowerCase().includes(term);
        const matchesAddress = point.address.toLowerCase().includes(term);
        const matchesCode = point.code.toLowerCase().includes(term);
        if (!matchesName && !matchesAddress && !matchesCode) {
          continue;
        }
      }

      const enriched = this.enrichPoint(point);

      // Filtro por estado crítico (>80%)
      if (query.isCritical !== undefined && enriched.isCritical !== query.isCritical) {
        continue;
      }

      results.push(enriched);
    }

    return results;
  }

  public findById(idOrCode: string): EnrichedRecyclePoint | null {
    // Buscar por ID directo
    let point = this.points.get(idOrCode);

    // Si no coincide, buscar por código de contenedor (#CNT-0001)
    if (!point) {
      for (const p of this.points.values()) {
        if (p.code.toLowerCase() === idOrCode.toLowerCase()) {
          point = p;
          break;
        }
      }
    }

    if (!point) {
      return null;
    }

    return this.enrichPoint(point);
  }

  public create(data: CreatePointInput): EnrichedRecyclePoint {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newPoint: StoredRecyclePoint = {
      id,
      code: data.code,
      name: data.name,
      address: data.address,
      comuna: data.comuna,
      latitude: data.latitude,
      longitude: data.longitude,
      wasteType: data.wasteType,
      capacityKg: data.capacityKg,
      currentFillPercentage: 0.0,
      isActive: true,
      lastEmptiedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.points.set(id, newPoint);

    // Persistir en base de datos si está disponible
    prisma.recyclePoint
      .create({
        data: {
          id,
          code: data.code,
          name: data.name,
          address: data.address,
          comuna: data.comuna,
          latitude: data.latitude,
          longitude: data.longitude,
          wasteType: data.wasteType,
          capacityKg: data.capacityKg,
          currentFillPercentage: 0.0,
          isActive: true,
        },
      })
      .catch(() => {});

    return this.enrichPoint(newPoint);
  }

  public update(id: string, data: UpdatePointInput): EnrichedRecyclePoint | null {
    const existing = this.points.get(id);
    if (!existing) {
      return null;
    }

    const updated: StoredRecyclePoint = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.points.set(id, updated);

    // Persistir en base de datos
    prisma.recyclePoint
      .update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.address && { address: data.address }),
          ...(data.comuna !== undefined && { comuna: data.comuna }),
          ...(data.latitude !== undefined && { latitude: data.latitude }),
          ...(data.longitude !== undefined && { longitude: data.longitude }),
          ...(data.wasteType && { wasteType: data.wasteType }),
          ...(data.capacityKg !== undefined && { capacityKg: data.capacityKg }),
        },
      })
      .catch(() => {});

    return this.enrichPoint(updated);
  }

  public delete(id: string): boolean {
    const existing = this.points.get(id);
    if (!existing) {
      return false;
    }

    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();

    prisma.recyclePoint
      .update({
        where: { id },
        data: { isActive: false },
      })
      .catch(() => {});

    return true;
  }

  public emptyPoint(idOrCode: string): boolean {
    for (const point of this.points.values()) {
      if (point.id === idOrCode || point.code === idOrCode) {
        point.currentFillPercentage = 0.0;
        const now = new Date();
        point.lastEmptiedAt = now.toISOString();
        point.updatedAt = now.toISOString();

        prisma.recyclePoint
          .update({
            where: { id: point.id },
            data: {
              currentFillPercentage: 0.0,
              lastEmptiedAt: now,
            },
          })
          .catch(() => {});

        return true;
      }
    }
    return false;
  }

  public async syncFromDatabase(): Promise<void> {
    try {
      const dbPoints = await prisma.recyclePoint.findMany();
      if (dbPoints.length > 0) {
        this.points.clear();
        for (const p of dbPoints) {
          this.points.set(p.id, {
            id: p.id,
            code: p.code,
            name: p.name,
            address: p.address,
            comuna: p.comuna,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            wasteType: p.wasteType as WasteType,
            capacityKg: Number(p.capacityKg),
            currentFillPercentage: Number(p.currentFillPercentage),
            isActive: p.isActive,
            lastEmptiedAt: p.lastEmptiedAt ? p.lastEmptiedAt.toISOString() : null,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          });
        }
        console.log(`♻️ Sincronizados ${dbPoints.length} puntos de reciclaje desde PostgreSQL.`);
      }
    } catch {
      // Ignora si no hay conexión a base de datos
    }
  }
}

export const pointsService = new PointsService();
