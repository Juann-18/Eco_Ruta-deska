export type WasteType =
  | "PAPEL_CARTON"
  | "VIDRIO"
  | "PLASTICO"
  | "METAL"
  | "ESCOMBRO"
  | "ORGANICO";

export interface RecyclePoint {
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
  currentWeightKg: number;
  isActive: boolean;
  isCritical: boolean;
  batteryPercentage: number;
  temperatureCelsius: number;
  hasLiveTelemetry: boolean;
  lastEmptiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PointsFilters {
  comuna?: number;
  wasteType?: WasteType;
  isCritical?: boolean;
  search?: string;
}

export interface PointsResponse {
  success: boolean;
  count: number;
  data: RecyclePoint[];
}

export interface PointDetailResponse {
  success: boolean;
  data: RecyclePoint;
}
