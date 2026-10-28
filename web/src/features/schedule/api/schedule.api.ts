import { apiClient } from "../../../common/config/axios";
import type {
  RouteItem,
  RouteDetail,
  CollectionStop,
  RouteStatus,
} from "../types/schedule.types";

export async function getRoutes(comuna?: number, period?: string): Promise<RouteItem[]> {
  const params: Record<string, any> = {};
  if (comuna) params.comuna = comuna;
  if (period) params.period = period;

  const res = await apiClient.get("/rutas", { params });
  return Array.isArray(res?.data?.data) ? res.data.data : [];
}

export async function getFeaturedRoute(comuna: number = 1): Promise<RouteItem | null> {
  const res = await apiClient.get("/rutas/featured", {
    params: { comuna },
  });
  return res?.data?.data || null;
}

export async function getRouteById(idOrCode: string): Promise<RouteDetail> {
  const res = await apiClient.get(`/rutas/${encodeURIComponent(idOrCode)}`);
  return res.data.data;
}

export async function updateRouteStatus(
  routeId: string,
  status: RouteStatus
): Promise<RouteItem> {
  const res = await apiClient.patch(`/rutas/${encodeURIComponent(routeId)}/status`, {
    status,
  });
  return res.data.data;
}

export async function checkinStop(collectionId: string): Promise<CollectionStop> {
  const res = await apiClient.patch(`/recolecciones/${collectionId}/checkin`);
  return res.data.data;
}

export async function completeStop(
  collectionId: string,
  collectedWeightKg: number,
  notes?: string
): Promise<{ collection: CollectionStop; route: RouteItem }> {
  const res = await apiClient.post(`/recolecciones/${collectionId}/completar`, {
    collectedWeightKg,
    notes,
  });
  return res.data.data;
}

export async function reportStopIncident(
  collectionId: string,
  reason: string,
  description?: string
): Promise<any> {
  const res = await apiClient.post(`/recolecciones/${collectionId}/incidencia`, {
    reason,
    description,
  });
  return res.data.data;
}
