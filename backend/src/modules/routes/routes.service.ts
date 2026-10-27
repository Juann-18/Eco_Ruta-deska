import {
  CreateRouteInput,
  GetRoutesQuery,
  RouteIncidentInput,
  RouteStatus,
  CollectionStatus,
} from "./routes.schema.js";
import { pointsService } from "../points/points.service.js";
import { prisma } from "../../config/prisma.js";

export interface StoredVehicle {
  id: string;
  plate: string;
  model: string;
  companyName: string;
  maxCapacityKg: number;
  currentLoadKg: number;
  isActive: boolean;
}

export interface StoredCollection {
  id: string;
  routeId: string;
  recyclePointCode: string;
  recyclePointName: string;
  recyclePointAddress: string;
  comuna: number;
  order: number;
  status: CollectionStatus;
  collectedWeightKg: number | null;
  collectedAt: string | null;
  notes?: string;
}

export interface StoredRouteIncident {
  id: string;
  collectionId: string;
  reporterUserId: string;
  reason: string;
  description?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface StoredRoute {
  id: string;
  code: string;
  name: string;
  comuna: number;
  companyName: string;
  vehiclePlate: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  currentLoadKg: number;
  maxCapacityKg: number;
  fillPercentage: number;
  status: RouteStatus;
  wasteColor?: "green" | "grey" | "blue";
  etaText?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedRoute extends StoredRoute {
  collections: StoredCollection[];
  vehicle?: StoredVehicle;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RoutesService {
  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  private mapDbRoute(r: any): StoredRoute {
    const currentLoadKg = Number(r.currentLoadKg);
    const maxCapacityKg = Number(r.maxCapacityKg);
    const fillPercentage =
      maxCapacityKg > 0 ? Math.round((currentLoadKg / maxCapacityKg) * 100) : 0;

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      comuna: r.comuna,
      companyName: r.company?.name ?? "EcoAseo Tuluá",
      vehiclePlate: r.vehicle?.plate ?? "TUL-482",
      scheduledDate: r.scheduledDate.toISOString().split("T")[0],
      startTime: r.startTime,
      endTime: r.endTime,
      currentLoadKg,
      maxCapacityKg,
      fillPercentage,
      status: r.status as RouteStatus,
      wasteColor: r.comuna === 1 ? "green" : r.comuna === 2 ? "blue" : "grey",
      etaText:
        r.status === "EN_CAMINO" ? "Llega a tu sector en ~25 min" : undefined,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapDbCollection(col: any): StoredCollection {
    return {
      id: col.id,
      routeId: col.routeId,
      recyclePointCode: col.recyclePoint?.code ?? "",
      recyclePointName: col.recyclePoint?.name ?? "",
      recyclePointAddress: col.recyclePoint?.address ?? "",
      comuna: col.recyclePoint?.comuna ?? 1,
      order: col.order,
      status: col.status as CollectionStatus,
      collectedWeightKg:
        col.collectedWeightKg !== null && col.collectedWeightKg !== undefined
          ? Number(col.collectedWeightKg)
          : null,
      collectedAt: col.collectedAt ? col.collectedAt.toISOString() : null,
      notes: col.notes ?? undefined,
    };
  }

  private async resolveRouteRecord(idOrCode: string) {
    const legacyMatch = /^rta-(\d{4})-uuid$/i.exec(idOrCode);
    const normalizedCode = legacyMatch ? `#RTA-${legacyMatch[1]}` : idOrCode;

    if (UUID_REGEX.test(idOrCode)) {
      return prisma.route.findUnique({
        where: { id: idOrCode },
        include: {
          company: true,
          vehicle: true,
          collections: {
            include: { recyclePoint: true },
            orderBy: { order: "asc" },
          },
        },
      });
    }

    return prisma.route.findFirst({
      where: { code: { equals: normalizedCode, mode: "insensitive" } },
      include: {
        company: true,
        vehicle: true,
        collections: {
          include: { recyclePoint: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  private async resolveCollectionRecord(collectionId: string) {
    if (UUID_REGEX.test(collectionId)) {
      return prisma.collection.findUnique({
        where: { id: collectionId },
        include: {
          recyclePoint: true,
          route: { include: { company: true, vehicle: true } },
        },
      });
    }

    const legacyMatch = /^col-00(\d+)$/i.exec(collectionId);
    if (legacyMatch) {
      const order = Number(legacyMatch[1]);
      return prisma.collection.findFirst({
        where: {
          order,
          route: { code: "#RTA-0012" },
        },
        include: {
          recyclePoint: true,
          route: { include: { company: true, vehicle: true } },
        },
      });
    }

    return null;
  }

  public async findAll(query: GetRoutesQuery): Promise<StoredRoute[]> {
    const dbRoutes = await prisma.route.findMany({
      where: {
        ...(query.comuna !== undefined && { comuna: query.comuna }),
        ...(query.status && { status: query.status }),
      },
      include: { company: true, vehicle: true },
    });

    const today = this.getTodayDateString();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split("T")[0];

    const list: StoredRoute[] = [];
    for (const r of dbRoutes) {
      const mapped = this.mapDbRoute(r);
      if (query.period === "hoy" && mapped.scheduledDate !== today) {
        continue;
      }
      if (query.period === "manana" && mapped.scheduledDate !== tomorrow) {
        continue;
      }
      list.push(mapped);
    }

    const orderMap: Record<RouteStatus, number> = {
      EN_CAMINO: 1,
      PROGRAMADA: 2,
      FINALIZADA: 3,
      CANCELADA: 4,
    };

    return list.sort((a, b) => {
      const pA = orderMap[a.status] || 99;
      const pB = orderMap[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  public async findFeatured(comuna: number = 1): Promise<StoredRoute | null> {
    const allToday = await this.findAll({ period: "hoy" });

    const activeInComuna = allToday.find(
      (r) => r.comuna === comuna && r.status === "EN_CAMINO"
    );
    if (activeInComuna) return activeInComuna;

    const scheduledInComuna = allToday.find(
      (r) => r.comuna === comuna && r.status === "PROGRAMADA"
    );
    if (scheduledInComuna) return scheduledInComuna;

    const activeGlobal = allToday.find((r) => r.status === "EN_CAMINO");
    if (activeGlobal) return activeGlobal;

    return allToday[0] ?? null;
  }

  public async findById(idOrCode: string): Promise<EnrichedRoute | null> {
    const dbRoute = await this.resolveRouteRecord(idOrCode);
    if (!dbRoute) {
      return null;
    }

    const mapped = this.mapDbRoute(dbRoute);
    const collections = dbRoute.collections.map((c) => this.mapDbCollection(c));

    const vehicle: StoredVehicle | undefined = dbRoute.vehicle
      ? {
          id: dbRoute.vehicle.id,
          plate: dbRoute.vehicle.plate,
          model: dbRoute.vehicle.model ?? "Camión Compactador",
          companyName: dbRoute.company?.name ?? "EcoAseo Tuluá",
          maxCapacityKg: Number(dbRoute.vehicle.maxCapacityKg),
          currentLoadKg: Number(dbRoute.currentLoadKg),
          isActive: dbRoute.vehicle.isActive,
        }
      : undefined;

    return {
      ...mapped,
      collections,
      vehicle,
    };
  }

  public async create(data: CreateRouteInput): Promise<StoredRoute> {
    let company = await prisma.company.findFirst({
      where: { name: { contains: data.companyName, mode: "insensitive" } },
    });
    if (!company) {
      company = await prisma.company.findFirst();
    }
    if (!company) {
      throw {
        statusCode: 400,
        code: "COMPANY_NOT_FOUND",
        message: "No existe una empresa operadora registrada para asociar la ruta",
      };
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { plate: data.vehiclePlate },
    });

    const createdRoute = await prisma.route.create({
      data: {
        companyId: company.id,
        vehicleId: vehicle?.id ?? null,
        code: data.code,
        name: data.name,
        comuna: data.comuna,
        scheduledDate: new Date(data.scheduledDate),
        startTime: data.startTime,
        endTime: data.endTime,
        currentLoadKg: 0,
        maxCapacityKg: data.maxCapacityKg,
        status: "PROGRAMADA",
      },
      include: { company: true, vehicle: true },
    });

    let order = 1;
    for (const code of data.recyclePointCodes) {
      const point = await prisma.recyclePoint.findFirst({
        where: { code: { equals: code, mode: "insensitive" } },
      });
      if (point) {
        await prisma.collection.create({
          data: {
            routeId: createdRoute.id,
            recyclePointId: point.id,
            order: order++,
            status: "PENDIENTE",
          },
        });
      }
    }

    return this.mapDbRoute(createdRoute);
  }

  public async updateStatus(idOrCode: string, status: RouteStatus): Promise<StoredRoute | null> {
    const dbRoute = await this.resolveRouteRecord(idOrCode);
    if (!dbRoute) return null;

    const now = new Date();
    const updated = await prisma.route.update({
      where: { id: dbRoute.id },
      data: {
        status,
        ...(status === "EN_CAMINO" && !dbRoute.startedAt && { startedAt: now }),
        ...(status === "FINALIZADA" && { completedAt: now }),
      },
      include: { company: true, vehicle: true },
    });

    return this.mapDbRoute(updated);
  }

  public async checkinCollection(collectionId: string): Promise<StoredCollection | null> {
    const col = await this.resolveCollectionRecord(collectionId);
    if (!col) return null;

    const updated = await prisma.collection.update({
      where: { id: col.id },
      data: { status: "EN_PROCESO" },
      include: { recyclePoint: true },
    });

    return this.mapDbCollection(updated);
  }

  public async completeCollection(
    collectionId: string,
    collectedWeightKg: number,
    notes?: string
  ): Promise<{ collection: StoredCollection; route: StoredRoute | null } | null> {
    const col = await this.resolveCollectionRecord(collectionId);
    if (!col) return null;

    const now = new Date();
    const updatedCol = await prisma.collection.update({
      where: { id: col.id },
      data: {
        status: "COMPLETADA",
        collectedWeightKg,
        collectedAt: now,
        ...(notes && { notes }),
      },
      include: { recyclePoint: true },
    });

    // 1. Vaciar el contenedor inteligente en PostgreSQL y telemetría
    if (col.recyclePoint?.code) {
      await pointsService.emptyPoint(col.recyclePoint.code);
    }

    // 2. Incrementar el peso cargado en la ruta en PostgreSQL
    const currentLoad = Number(col.route.currentLoadKg);
    const maxCap = Number(col.route.maxCapacityKg);
    const newLoad = Math.min(maxCap, currentLoad + collectedWeightKg);

    const updatedRoute = await prisma.route.update({
      where: { id: col.routeId },
      data: { currentLoadKg: newLoad },
      include: { company: true, vehicle: true },
    });

    return {
      collection: this.mapDbCollection(updatedCol),
      route: this.mapDbRoute(updatedRoute),
    };
  }

  public async reportIncident(
    collectionId: string,
    reporterUserId: string,
    data: RouteIncidentInput
  ): Promise<StoredRouteIncident | null> {
    const col = await this.resolveCollectionRecord(collectionId);
    if (!col) return null;

    await prisma.collection.update({
      where: { id: col.id },
      data: { status: "OMITIDA" },
    });

    let validReporterId = reporterUserId;
    if (!UUID_REGEX.test(validReporterId)) {
      const collectorUser =
        (await prisma.user.findFirst({ where: { role: "RECOLECTOR" } })) ??
        (await prisma.user.findFirst());
      if (collectorUser) {
        validReporterId = collectorUser.id;
      }
    }

    const created = await prisma.routeIncident.create({
      data: {
        collectionId: col.id,
        reportedByUserId: validReporterId,
        reason: data.reason,
        description: data.description,
        photoUrl: data.photoUrl,
      },
    });

    return {
      id: created.id,
      collectionId: created.collectionId,
      reporterUserId: created.reportedByUserId,
      reason: created.reason,
      description: created.description ?? undefined,
      photoUrl: created.photoUrl ?? undefined,
      createdAt: created.createdAt.toISOString(),
    };
  }

  public async getVehicles(): Promise<StoredVehicle[]> {
    const dbVehicles = await prisma.vehicle.findMany({
      include: {
        company: true,
        routes: {
          where: { status: "EN_CAMINO" },
          take: 1,
        },
      },
      orderBy: { plate: "asc" },
    });

    return dbVehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      model: v.model ?? "Camión Recolector",
      companyName: v.company.name,
      maxCapacityKg: Number(v.maxCapacityKg),
      currentLoadKg: v.routes[0] ? Number(v.routes[0].currentLoadKg) : 0,
      isActive: v.isActive,
    }));
  }

  public async getCompanies() {
    const dbCompanies = await prisma.company.findMany({
      orderBy: { completedRoutes: "desc" },
    });

    return dbCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      nit: c.nit,
      phone: c.phone,
      address: c.address,
      description: c.description,
      rating: Number(c.rating),
      completedRoutes: c.completedRoutes,
      isVerified: c.isVerified,
      status: c.status,
      wasteTypes: c.wasteTypes,
      coveredComunas: c.coveredComunas,
    }));
  }

  public async getNotifications(comuna?: number) {
    const dbNotifs = await prisma.notification.findMany({
      where: comuna ? { OR: [{ comuna }, { comuna: null }] } : undefined,
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return dbNotifs.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      comuna: n.comuna,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  public async markAllNotificationsRead(comuna?: number) {
    await prisma.notification.updateMany({
      where: comuna ? { OR: [{ comuna }, { comuna: null }] } : undefined,
      data: { isRead: true },
    });
    return this.getNotifications(comuna);
  }

  public async markNotificationRead(id: string) {
    if (!UUID_REGEX.test(id)) return null;
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return {
      id: updated.id,
      title: updated.title,
      message: updated.message,
      type: updated.type,
      comuna: updated.comuna,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  public async syncFromDatabase(): Promise<void> {
    const routeCount = await prisma.route.count();
    const colCount = await prisma.collection.count();
    console.log(`🗺️ Conectadas ${routeCount} rutas y ${colCount} paradas desde PostgreSQL.`);
  }
}

export const routesService = new RoutesService();
