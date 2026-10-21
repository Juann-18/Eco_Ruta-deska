import { randomUUID } from "node:crypto";
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

export class RoutesService {
  private routes: Map<string, StoredRoute> = new Map();
  private collections: Map<string, StoredCollection> = new Map();
  private vehicles: Map<string, StoredVehicle> = new Map();
  private incidents: Map<string, StoredRouteIncident> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  private seedDefaultData() {
    const today = this.getTodayDateString();
    const now = new Date().toISOString();

    // 1. Vehículos de la flota
    const veh1: StoredVehicle = {
      id: "veh-tul-482",
      plate: "TUL-482",
      model: "Chevrolet FVR Compactador",
      companyName: "EcoAseo Tuluá",
      maxCapacityKg: 5000,
      currentLoadKg: 3600,
      isActive: true,
    };
    const veh2: StoredVehicle = {
      id: "veh-tul-105",
      plate: "TUL-105",
      model: "Hino 500 Ecológico",
      companyName: "Tuluá Verde S.A.S.",
      maxCapacityKg: 4000,
      currentLoadKg: 1000,
      isActive: true,
    };
    const veh3: StoredVehicle = {
      id: "veh-tul-880",
      plate: "TUL-880",
      model: "International Durastar",
      companyName: "Reciclables del Valle",
      maxCapacityKg: 6000,
      currentLoadKg: 5700,
      isActive: true,
    };

    this.vehicles.set(veh1.plate, veh1);
    this.vehicles.set(veh2.plate, veh2);
    this.vehicles.set(veh3.plate, veh3);

    // 2. Ruta activa en camino (#RTA-0012)
    const route1Id = "rta-0012-uuid";
    const route1: StoredRoute = {
      id: route1Id,
      code: "#RTA-0012",
      name: "Ruta Principal Sector Centro",
      comuna: 1,
      companyName: "EcoAseo Tuluá",
      vehiclePlate: "TUL-482",
      scheduledDate: today,
      startTime: "17:00",
      endTime: "19:00",
      currentLoadKg: 3600,
      maxCapacityKg: 5000,
      fillPercentage: 72,
      status: "EN_CAMINO",
      wasteColor: "green",
      etaText: "Llega a tu sector en ~25 min",
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.routes.set(route1Id, route1);

    // Paradas de #RTA-0012
    const col1: StoredCollection = {
      id: "col-001",
      routeId: route1Id,
      recyclePointCode: "#CNT-0001",
      recyclePointName: "Punto Verde Plaza Cívica Boyacá",
      recyclePointAddress: "Cra 26 con Calle 27",
      comuna: 1,
      order: 1,
      status: "COMPLETADA",
      collectedWeightKg: 65,
      collectedAt: now,
    };
    const col2: StoredCollection = {
      id: "col-002",
      routeId: route1Id,
      recyclePointCode: "#CNT-0002",
      recyclePointName: "Punto Ecológico Parque Infantil",
      recyclePointAddress: "Calle 28 con Cra 20",
      comuna: 1,
      order: 2,
      status: "EN_PROCESO",
      collectedWeightKg: null,
      collectedAt: null,
    };
    const col3: StoredCollection = {
      id: "col-003",
      routeId: route1Id,
      recyclePointCode: "#CNT-0005",
      recyclePointName: "Polideportivo Comuna 1",
      recyclePointAddress: "Calle 25 # 22-10",
      comuna: 1,
      order: 3,
      status: "PENDIENTE",
      collectedWeightKg: null,
      collectedAt: null,
    };
    this.collections.set(col1.id, col1);
    this.collections.set(col2.id, col2);
    this.collections.set(col3.id, col3);

    // 3. Ruta programada (#RTA-0015)
    const route2Id = "rta-0015-uuid";
    const route2: StoredRoute = {
      id: route2Id,
      code: "#RTA-0015",
      name: "Ruta Reciclables Papel y Cartón",
      comuna: 1,
      companyName: "Tuluá Verde S.A.S.",
      vehiclePlate: "TUL-105",
      scheduledDate: today,
      startTime: "19:30",
      endTime: "21:00",
      currentLoadKg: 1000,
      maxCapacityKg: 4000,
      fillPercentage: 25,
      status: "PROGRAMADA",
      wasteColor: "green",
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.routes.set(route2Id, route2);

    // 4. Ruta programada (#RTA-0019)
    const route3Id = "rta-0019-uuid";
    const route3: StoredRoute = {
      id: route3Id,
      code: "#RTA-0019",
      name: "Ruta Nocturna Comercial",
      comuna: 1,
      companyName: "EcoAseo Tuluá",
      vehiclePlate: "TUL-482",
      scheduledDate: today,
      startTime: "21:30",
      endTime: "23:00",
      currentLoadKg: 500,
      maxCapacityKg: 5000,
      fillPercentage: 10,
      status: "PROGRAMADA",
      wasteColor: "grey",
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.routes.set(route3Id, route3);

    // 5. Ruta finalizada (#RTA-0004)
    const route4Id = "rta-0004-uuid";
    const route4: StoredRoute = {
      id: route4Id,
      code: "#RTA-0004",
      name: "Ruta Matutina Vidrio y Metales",
      comuna: 2,
      companyName: "Reciclables del Valle",
      vehiclePlate: "TUL-880",
      scheduledDate: today,
      startTime: "08:00",
      endTime: "10:00",
      currentLoadKg: 5700,
      maxCapacityKg: 6000,
      fillPercentage: 95,
      status: "FINALIZADA",
      wasteColor: "blue",
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.routes.set(route4Id, route4);

    // 6. Ruta para mañana (#RTA-0022)
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split("T")[0];

    const route5Id = "rta-0022-uuid";
    const route5: StoredRoute = {
      id: route5Id,
      code: "#RTA-0022",
      name: "Ruta Matutina Reciclables Centro",
      comuna: 1,
      companyName: "EcoAseo Tuluá",
      vehiclePlate: "TUL-482",
      scheduledDate: tomorrow,
      startTime: "09:00",
      endTime: "11:30",
      currentLoadKg: 0,
      maxCapacityKg: 5000,
      fillPercentage: 0,
      status: "PROGRAMADA",
      wasteColor: "green",
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.routes.set(route5Id, route5);
  }

  public findAll(query: GetRoutesQuery): StoredRoute[] {
    const list: StoredRoute[] = [];
    const today = this.getTodayDateString();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split("T")[0];

    for (const route of this.routes.values()) {
      if (query.comuna && route.comuna !== query.comuna) {
        continue;
      }
      if (query.status && route.status !== query.status) {
        continue;
      }
      if (query.period === "hoy" && route.scheduledDate !== today) {
        continue;
      }
      if (query.period === "manana" && route.scheduledDate !== tomorrow) {
        continue;
      }
      list.push(route);
    }

    // Ordenar: primero EN_CAMINO, luego PROGRAMADA, luego FINALIZADA
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

  public findFeatured(comuna: number = 1): StoredRoute | null {
    const today = this.getTodayDateString();
    // 1. Prioridad: Ruta en camino de esa comuna hoy
    for (const r of this.routes.values()) {
      if (r.comuna === comuna && r.status === "EN_CAMINO" && r.scheduledDate === today) {
        return r;
      }
    }
    // 2. Si no hay en camino, la primera programada de esa comuna hoy
    for (const r of this.routes.values()) {
      if (r.comuna === comuna && r.status === "PROGRAMADA" && r.scheduledDate === today) {
        return r;
      }
    }
    // 3. Fallback a la ruta activa global
    for (const r of this.routes.values()) {
      if (r.status === "EN_CAMINO" && r.scheduledDate === today) {
        return r;
      }
    }
    return null;
  }

  public findById(idOrCode: string): EnrichedRoute | null {
    let target: StoredRoute | undefined;
    for (const r of this.routes.values()) {
      if (r.id === idOrCode || r.code === idOrCode) {
        target = r;
        break;
      }
    }

    if (!target) {
      return null;
    }

    const collections: StoredCollection[] = [];
    for (const col of this.collections.values()) {
      if (col.routeId === target.id) {
        collections.push(col);
      }
    }
    collections.sort((a, b) => a.order - b.order);

    const vehicle = this.vehicles.get(target.vehiclePlate);

    return {
      ...target,
      collections,
      vehicle,
    };
  }

  public create(data: CreateRouteInput): StoredRoute {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newRoute: StoredRoute = {
      id,
      code: data.code,
      name: data.name,
      comuna: data.comuna,
      companyName: data.companyName,
      vehiclePlate: data.vehiclePlate,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
      currentLoadKg: 0,
      maxCapacityKg: data.maxCapacityKg,
      fillPercentage: 0,
      status: "PROGRAMADA",
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.routes.set(id, newRoute);

    // Crear paradas enlazadas
    let order = 1;
    for (const code of data.recyclePointCodes) {
      const colId = randomUUID();
      this.collections.set(colId, {
        id: colId,
        routeId: id,
        recyclePointCode: code,
        recyclePointName: `Punto ${code}`,
        recyclePointAddress: "Sector Comuna " + data.comuna,
        comuna: data.comuna,
        order: order++,
        status: "PENDIENTE",
        collectedWeightKg: null,
        collectedAt: null,
      });
    }

    return newRoute;
  }

  public updateStatus(idOrCode: string, status: RouteStatus): StoredRoute | null {
    let route: StoredRoute | undefined;
    for (const r of this.routes.values()) {
      if (r.id === idOrCode || r.code === idOrCode) {
        route = r;
        break;
      }
    }
    if (!route) return null;

    const now = new Date().toISOString();
    route.status = status;
    route.updatedAt = now;

    if (status === "EN_CAMINO" && !route.startedAt) {
      route.startedAt = now;
    } else if (status === "FINALIZADA") {
      route.completedAt = now;
    }

    return route;
  }

  public checkinCollection(collectionId: string): StoredCollection | null {
    const col = this.collections.get(collectionId);
    if (!col) return null;

    col.status = "EN_PROCESO";
    return col;
  }

  public completeCollection(
    collectionId: string,
    collectedWeightKg: number,
    notes?: string
  ): { collection: StoredCollection; route: StoredRoute | null } | null {
    const col = this.collections.get(collectionId);
    if (!col) return null;

    const now = new Date().toISOString();
    col.status = "COMPLETADA";
    col.collectedWeightKg = collectedWeightKg;
    col.collectedAt = now;
    if (notes) col.notes = notes;

    // 1. Vaciar el contenedor inteligente en PointsService
    pointsService.emptyPoint(col.recyclePointCode);

    // 2. Incrementar peso de la ruta y vehículo
    const route = this.routes.get(col.routeId) || null;
    if (route) {
      route.currentLoadKg = Math.min(
        route.maxCapacityKg,
        route.currentLoadKg + collectedWeightKg
      );
      route.fillPercentage = Math.round(
        (route.currentLoadKg / route.maxCapacityKg) * 100
      );
      route.updatedAt = now;

      // Actualizar también el vehículo
      const vehicle = this.vehicles.get(route.vehiclePlate);
      if (vehicle) {
        vehicle.currentLoadKg = route.currentLoadKg;
      }
    }

    return { collection: col, route };
  }

  public reportIncident(
    collectionId: string,
    reporterUserId: string,
    data: RouteIncidentInput
  ): StoredRouteIncident | null {
    const col = this.collections.get(collectionId);
    if (!col) return null;

    col.status = "OMITIDA";

    const incidentId = randomUUID();
    const incident: StoredRouteIncident = {
      id: incidentId,
      collectionId,
      reporterUserId,
      reason: data.reason,
      description: data.description,
      photoUrl: data.photoUrl,
      createdAt: new Date().toISOString(),
    };

    this.incidents.set(incidentId, incident);
    return incident;
  }

  public getVehicles(): StoredVehicle[] {
    return Array.from(this.vehicles.values());
  }

  public async syncFromDatabase(): Promise<void> {
    try {
      const dbVehicles = await prisma.vehicle.findMany({
        include: { company: true },
      });
      if (dbVehicles.length > 0) {
        this.vehicles.clear();
        for (const v of dbVehicles) {
          this.vehicles.set(v.plate, {
            id: v.id,
            plate: v.plate,
            model: v.model ?? "Camión Recolector",
            companyName: v.company.name,
            maxCapacityKg: Number(v.maxCapacityKg),
            currentLoadKg: 0,
            isActive: v.isActive,
          });
        }
      }

      const dbRoutes = await prisma.route.findMany({
        include: {
          company: true,
          vehicle: true,
          collections: {
            include: { recyclePoint: true },
            orderBy: { order: "asc" },
          },
        },
      });

      if (dbRoutes.length > 0) {
        this.routes.clear();
        this.collections.clear();

        for (const r of dbRoutes) {
          const fillPercentage = Math.round(
            (Number(r.currentLoadKg) / Number(r.maxCapacityKg)) * 100
          );

          this.routes.set(r.id, {
            id: r.id,
            code: r.code,
            name: r.name,
            comuna: r.comuna,
            companyName: r.company.name,
            vehiclePlate: r.vehicle?.plate ?? "TUL-482",
            scheduledDate: r.scheduledDate.toISOString().split("T")[0],
            startTime: r.startTime,
            endTime: r.endTime,
            currentLoadKg: Number(r.currentLoadKg),
            maxCapacityKg: Number(r.maxCapacityKg),
            fillPercentage,
            status: r.status as RouteStatus,
            wasteColor:
              r.comuna === 1 ? "green" : r.comuna === 2 ? "blue" : "grey",
            etaText:
              r.status === "EN_CAMINO"
                ? "En recolección activa en tu comuna"
                : undefined,
            startedAt: r.startedAt ? r.startedAt.toISOString() : null,
            completedAt: r.completedAt ? r.completedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          });

          for (const col of r.collections) {
            this.collections.set(col.id, {
              id: col.id,
              routeId: col.routeId,
              recyclePointCode: col.recyclePoint.code,
              recyclePointName: col.recyclePoint.name,
              recyclePointAddress: col.recyclePoint.address,
              comuna: col.recyclePoint.comuna,
              order: col.order,
              status: col.status as CollectionStatus,
              collectedWeightKg: col.collectedWeightKg
                ? Number(col.collectedWeightKg)
                : null,
              collectedAt: col.collectedAt
                ? col.collectedAt.toISOString()
                : null,
              notes: col.notes ?? undefined,
            });
          }
        }
        console.log(
          `🗺️ Sincronizadas ${dbRoutes.length} rutas y ${this.collections.size} paradas desde PostgreSQL.`
        );
      }
    } catch {
      // Ignora si no hay conexión a base de datos
    }
  }
}

export const routesService = new RoutesService();
