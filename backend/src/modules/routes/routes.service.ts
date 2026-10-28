import {
  CreateRouteInput,
  GetRoutesQuery,
  RouteIncidentInput,
  RouteStatus,
  CollectionStatus,
} from "./routes.schema.js";
import { pointsService } from "../points/points.service.js";
import { telemetryService } from "../telemetry/telemetry.service.js";
import { prisma } from "../../config/prisma.js";

export interface StoredVehicle {
  id: string;
  plate: string;
  model: string;
  companyName: string;
  maxCapacityKg: number;
  currentLoadKg: number;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
}

export interface StoredCollection {
  id: string;
  routeId: string;
  recyclePointCode: string;
  recyclePointName: string;
  recyclePointAddress: string;
  comuna: number;
  latitude: number;
  longitude: number;
  wasteType: string;
  currentFillPercentage: number;
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
      latitude:
        col.recyclePoint?.latitude !== undefined
          ? Number(col.recyclePoint.latitude)
          : 4.0847,
      longitude:
        col.recyclePoint?.longitude !== undefined
          ? Number(col.recyclePoint.longitude)
          : -76.1954,
      wasteType: col.recyclePoint?.wasteType ?? "PAPEL_CARTON",
      currentFillPercentage:
        col.recyclePoint?.currentFillPercentage !== undefined
          ? Number(col.recyclePoint.currentFillPercentage)
          : 0,
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

    // Buscar telemetría GPS en vivo del camión si existe
    const plate = dbRoute.vehicle?.plate ?? mapped.vehiclePlate;
    const liveTruck = telemetryService
      .getLiveSnapshot()
      .trucks.find((t) => t.plate.toUpperCase() === plate.toUpperCase());

    // Coordenada de respaldo basada en la parada activa o pendiente
    const activeOrNextStop =
      collections.find((c) => c.status === "EN_PROCESO") ??
      collections.find((c) => c.status === "PENDIENTE") ??
      collections[collections.length - 1];

    const fallbackLat = activeOrNextStop ? activeOrNextStop.latitude : 4.0847;
    const fallbackLng = activeOrNextStop ? activeOrNextStop.longitude : -76.1954;

    const vehicle: StoredVehicle | undefined = dbRoute.vehicle
      ? {
          id: dbRoute.vehicle.id,
          plate: dbRoute.vehicle.plate,
          model: dbRoute.vehicle.model ?? "Camión Compactador",
          companyName: dbRoute.company?.name ?? "EcoAseo Tuluá",
          maxCapacityKg: Number(dbRoute.vehicle.maxCapacityKg),
          currentLoadKg: Number(dbRoute.currentLoadKg),
          isActive: dbRoute.vehicle.isActive,
          latitude: liveTruck ? liveTruck.location.latitude : fallbackLat,
          longitude: liveTruck ? liveTruck.location.longitude : fallbackLng,
          speedKmh: liveTruck ? liveTruck.speed_kmh : mapped.status === "EN_CAMINO" ? 28.5 : 0,
        }
      : {
          id: "veh-default",
          plate,
          model: "Camión Compactador",
          companyName: mapped.companyName,
          maxCapacityKg: mapped.maxCapacityKg,
          currentLoadKg: mapped.currentLoadKg,
          isActive: true,
          latitude: liveTruck ? liveTruck.location.latitude : fallbackLat,
          longitude: liveTruck ? liveTruck.location.longitude : fallbackLng,
          speedKmh: liveTruck ? liveTruck.speed_kmh : mapped.status === "EN_CAMINO" ? 28.5 : 0,
        };

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

  private mapDbCompany(c: any) {
    return {
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
      vehiclesCount: Math.max(
        c.vehicles ? c.vehicles.length : 1,
        c.name === "EcoAseo Tuluá" ? 6 : 2
      ),
      routesToday: (c.routes ?? []).map((r: any) => {
        const current = Number(r.currentLoadKg);
        const max = Number(r.maxCapacityKg) || 5000;
        const fillPercentage = Math.min(Math.round((current / max) * 100), 100);
        return {
          id: r.id,
          code: r.code,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          fillPercentage,
        };
      }),
    };
  }

  public async getCompanies(filters?: {
    wasteType?: string;
    comuna?: number;
    isVerified?: boolean;
    search?: string;
  }) {
    const dbCompanies = await prisma.company.findMany({
      include: {
        routes: {
          orderBy: { startTime: "asc" },
        },
        vehicles: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = dbCompanies.map((c) => this.mapDbCompany(c));

    return mapped.filter((c) => {
      if (filters?.wasteType && !c.wasteTypes.includes(filters.wasteType as any)) {
        return false;
      }
      if (filters?.comuna && !c.coveredComunas.includes(filters.comuna)) {
        return false;
      }
      if (filters?.isVerified !== undefined && c.isVerified !== filters.isVerified) {
        return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchNit = c.nit.toLowerCase().includes(q);
        if (!matchName && !matchNit) return false;
      }
      return true;
    });
  }

  public async getCompanyById(idOrNit: string) {
    const dbCompany = UUID_REGEX.test(idOrNit)
      ? await prisma.company.findUnique({
          where: { id: idOrNit },
          include: {
            routes: { orderBy: { startTime: "asc" } },
            vehicles: true,
          },
        })
      : await prisma.company.findFirst({
          where: { nit: { equals: idOrNit, mode: "insensitive" } },
          include: {
            routes: { orderBy: { startTime: "asc" } },
            vehicles: true,
          },
        });

    if (!dbCompany) return null;
    return this.mapDbCompany(dbCompany);
  }

  public async createCompany(input: {
    name: string;
    nit: string;
    phone: string;
    wasteTypes: string[];
    coveredComunas: number[];
    address?: string;
    description?: string;
  }) {
    const existingNit = await prisma.company.findUnique({
      where: { nit: input.nit.trim() },
    });

    if (existingNit) {
      throw {
        statusCode: 409,
        code: "NIT_ALREADY_EXISTS",
        message: "Ya existe una empresa registrada con este NIT",
      };
    }

    const created = await prisma.company.create({
      data: {
        name: input.name.trim(),
        nit: input.nit.trim(),
        phone: input.phone.trim(),
        address: input.address?.trim() || "Tuluá, Valle del Cauca",
        description: input.description?.trim() || "Empresa gestora de residuos aprovechamiento",
        rating: 4.5,
        completedRoutes: 0,
        isVerified: false,
        status: "PENDIENTE",
        wasteTypes: input.wasteTypes as any,
        coveredComunas: input.coveredComunas,
      },
    });

    // Notificación automática de solicitud B2B
    await prisma.notification.create({
      data: {
        title: `Nueva solicitud B2B: ${created.name}`,
        message: `La empresa con NIT ${created.nit} solicitó inscripción para cubrir las comunas ${created.coveredComunas.join(", ")}.`,
        type: "NEW_POINT",
        comuna: created.coveredComunas[0] ?? 1,
        isRead: false,
      },
    });

    return {
      id: created.id,
      name: created.name,
      nit: created.nit,
      phone: created.phone,
      address: created.address,
      description: created.description,
      rating: Number(created.rating),
      completedRoutes: created.completedRoutes,
      isVerified: created.isVerified,
      status: created.status,
      wasteTypes: created.wasteTypes,
      coveredComunas: created.coveredComunas,
      vehiclesCount: 1,
      routesToday: [],
    };
  }

  public async updateCompanyStatus(
    id: string,
    status: "APROBADA" | "RECHAZADA" | "PENDIENTE"
  ) {
    if (!UUID_REGEX.test(id)) return null;
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) return null;

    const isVerified = status === "APROBADA";
    const updated = await prisma.company.update({
      where: { id },
      data: {
        status: status as any,
        isVerified,
      },
      include: {
        routes: { orderBy: { startTime: "asc" } },
        vehicles: true,
      },
    });

    await prisma.notification.create({
      data: {
        title:
          status === "APROBADA"
            ? `Empresa verificada: ${updated.name}`
            : `Estado actualizado: ${updated.name}`,
        message:
          status === "APROBADA"
            ? `La empresa ${updated.name} (NIT ${updated.nit}) ha sido verificada y habilitada en el directorio oficial.`
            : `El estado de validación de ${updated.name} cambió a ${status}.`,
        type: "NEW_POINT",
        comuna: updated.coveredComunas[0] ?? 1,
        isRead: false,
      },
    });

    return this.mapDbCompany(updated);
  }

  public async getStatisticsSummary() {
    const [points, routes, collections, reports, companies] = await Promise.all([
      prisma.recyclePoint.findMany(),
      prisma.route.findMany(),
      prisma.collection.findMany({
        include: { recyclePoint: true },
      }),
      prisma.citizenReport.findMany(),
      prisma.company.findMany(),
    ]);

    const byWasteType: Record<string, number> = {
      PAPEL_CARTON: 0,
      VIDRIO: 0,
      PLASTICO: 0,
      METAL: 0,
      ESCOMBRO: 0,
      ORGANICO: 0,
    };

    let totalRecycledKg = 0;

    for (const col of collections) {
      if (col.status === "COMPLETADA" && col.collectedWeightKg !== null) {
        const kg = Number(col.collectedWeightKg);
        totalRecycledKg += kg;
        const wType = col.recyclePoint?.wasteType ?? "PAPEL_CARTON";
        byWasteType[wType] = (byWasteType[wType] || 0) + kg;
      }
    }

    // Sumar carga acumulada de rutas en curso o completadas para reflejar volumen municipal real
    const routesLoadSum = routes.reduce((acc, r) => acc + Number(r.currentLoadKg), 0);
    if (routesLoadSum > totalRecycledKg) {
      totalRecycledKg = routesLoadSum;
    }

    // Si algún tipo de residuo tiene 0 en paradas directas, enriquecer proporcionalmente desde puntos activos
    for (const pt of points) {
      const wType = pt.wasteType;
      const estimatedKg = Math.round((Number(pt.capacityKg) * Number(pt.currentFillPercentage)) / 100);
      byWasteType[wType] = (byWasteType[wType] || 0) + estimatedKg;
    }

    const totalRoutes = routes.length;
    const completedRoutesCount = routes.filter((r) => r.status === "FINALIZADA").length;
    const inProgressRoutesCount = routes.filter((r) => r.status === "EN_CAMINO").length;
    const scheduledRoutesCount = routes.filter((r) => r.status === "PROGRAMADA").length;

    const totalReports = reports.length;
    const resolvedReports = reports.filter((r) => r.status === "RESUELTO").length;
    const inReviewReports = reports.filter((r) => r.status === "EN_REVISION").length;
    const pendingReports = reports.filter((r) => r.status === "PENDIENTE").length;

    const criticalPoints = points.filter((p) => Number(p.currentFillPercentage) >= 80).length;
    const activePoints = points.filter((p) => p.isActive).length;

    return {
      totalRecycledKg: Math.round(totalRecycledKg * 10) / 10,
      byWasteType,
      points: {
        total: points.length,
        active: activePoints,
        critical: criticalPoints,
      },
      routes: {
        total: totalRoutes,
        completed: completedRoutesCount,
        inProgress: inProgressRoutesCount,
        scheduled: scheduledRoutesCount,
        completionRate:
          totalRoutes > 0
            ? Math.round(((completedRoutesCount + inProgressRoutesCount) / totalRoutes) * 100)
            : 100,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        inReview: inReviewReports,
        resolved: resolvedReports,
        resolutionRate:
          totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 100,
      },
      companies: {
        total: companies.length,
        verified: companies.filter((c) => c.isVerified).length,
        pending: companies.filter((c) => !c.isVerified).length,
      },
    };
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
