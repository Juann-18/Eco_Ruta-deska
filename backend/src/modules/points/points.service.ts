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
  companyName?: string;
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PointsService {
  private mapDbPoint(p: any): StoredRecyclePoint {
    return {
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
      companyName: p.company?.name ?? "EcoAseo Tuluá",
      isActive: p.isActive,
      lastEmptiedAt: p.lastEmptiedAt ? p.lastEmptiedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
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

  public async findAll(query: GetPointsQuery): Promise<EnrichedRecyclePoint[]> {
    const dbPoints = await prisma.recyclePoint.findMany({
      where: {
        isActive: true,
        ...(query.comuna !== undefined && { comuna: query.comuna }),
        ...(query.wasteType && { wasteType: query.wasteType }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { address: { contains: query.search, mode: "insensitive" } },
            { code: { contains: query.search, mode: "insensitive" } },
          ],
        }),
      },
      include: { company: true },
      orderBy: { code: "asc" },
    });

    const results: EnrichedRecyclePoint[] = [];
    for (const p of dbPoints) {
      const enriched = this.enrichPoint(this.mapDbPoint(p));
      if (query.isCritical !== undefined && enriched.isCritical !== query.isCritical) {
        continue;
      }
      results.push(enriched);
    }

    return results;
  }

  public async findById(idOrCode: string): Promise<EnrichedRecyclePoint | null> {
    const isUuid = UUID_REGEX.test(idOrCode);
    const dbPoint = isUuid
      ? await prisma.recyclePoint.findUnique({
          where: { id: idOrCode },
          include: { company: true },
        })
      : await prisma.recyclePoint.findFirst({
          where: { code: { equals: idOrCode, mode: "insensitive" } },
          include: { company: true },
        });

    if (!dbPoint) {
      return null;
    }

    return this.enrichPoint(this.mapDbPoint(dbPoint));
  }

  public async create(data: CreatePointInput): Promise<EnrichedRecyclePoint> {
    const created = await prisma.recyclePoint.upsert({
      where: { code: data.code },
      update: {
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
      create: {
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
      include: { company: true },
    });

    return this.enrichPoint(this.mapDbPoint(created));
  }

  public async update(idOrCode: string, data: UpdatePointInput): Promise<EnrichedRecyclePoint | null> {
    const existing = await this.findById(idOrCode);
    if (!existing) {
      return null;
    }

    const updated = await prisma.recyclePoint.update({
      where: { id: existing.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address && { address: data.address }),
        ...(data.comuna !== undefined && { comuna: data.comuna }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.wasteType && { wasteType: data.wasteType }),
        ...(data.capacityKg !== undefined && { capacityKg: data.capacityKg }),
      },
      include: { company: true },
    });

    return this.enrichPoint(this.mapDbPoint(updated));
  }

  public async delete(idOrCode: string): Promise<boolean> {
    const existing = await this.findById(idOrCode);
    if (!existing) {
      return false;
    }

    await prisma.recyclePoint.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    return true;
  }

  public async emptyPoint(idOrCode: string): Promise<boolean> {
    const existing = await this.findById(idOrCode);
    if (!existing) {
      return false;
    }

    const now = new Date();
    await prisma.recyclePoint.update({
      where: { id: existing.id },
      data: {
        currentFillPercentage: 0.0,
        lastEmptiedAt: now,
      },
    });

    telemetryService.resetContainerFill(existing.code);
    return true;
  }

  public async updateFillFromTelemetry(code: string, fillPercentage: number): Promise<void> {
    await prisma.recyclePoint
      .updateMany({
        where: { code: { equals: code, mode: "insensitive" } },
        data: {
          currentFillPercentage: fillPercentage,
          ...(fillPercentage <= 1.0 && { lastEmptiedAt: new Date() }),
        },
      })
      .catch(() => {});
  }

  public async syncFromDatabase(): Promise<void> {
    const count = await prisma.recyclePoint.count();
    console.log(`♻️ Conectados ${count} puntos de reciclaje activos en PostgreSQL.`);
  }
}

export const pointsService = new PointsService();
