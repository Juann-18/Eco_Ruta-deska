export type RouteStatus = "PROGRAMADA" | "EN_CAMINO" | "FINALIZADA" | "CANCELADA";

export type CollectionStatus = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA" | "OMITIDA";

export interface RouteItem {
  id: string;
  code: string;
  name: string;
  comuna: number;
  companyName: string;
  vehiclePlate: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  currentLoadKg: number;
  maxCapacityKg: number;
  fillPercentage: number;
  status: RouteStatus;
  wasteColor?: "green" | "grey" | "blue";
  etaText?: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CollectionStop {
  id: string;
  routeId: string;
  recyclePointCode: string;
  recyclePointName: string;
  recyclePointAddress: string;
  comuna: number;
  latitude?: number;
  longitude?: number;
  wasteType?: string;
  currentFillPercentage?: number;
  order: number;
  status: CollectionStatus;
  collectedWeightKg: number | null;
  collectedAt: string | null;
  notes?: string;
}

export interface VehicleInfo {
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

export interface RouteDetail extends RouteItem {
  collections: CollectionStop[];
  vehicle?: VehicleInfo;
}
