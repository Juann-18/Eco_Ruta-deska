import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../common/config/axios";
import type {
  PointDetailResponse,
  PointsFilters,
  PointsResponse,
} from "../types/points.types";

export function usePoints(filters: PointsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.comuna) params.set("comuna", String(filters.comuna));
  if (filters.wasteType) params.set("wasteType", filters.wasteType);
  if (filters.isCritical !== undefined) params.set("isCritical", String(filters.isCritical));
  if (filters.search) params.set("search", filters.search);

  return useQuery<PointsResponse>({
    queryKey: ["points", filters],
    queryFn: async () => {
      const res = await apiClient.get<PointsResponse>(`/puntos?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 8000, // Refresco automático cada 8s para reflejar telemetría IoT
    staleTime: 4000,
  });
}

export function usePoint(idOrCode: string) {
  return useQuery<PointDetailResponse>({
    queryKey: ["point", idOrCode],
    queryFn: async () => {
      const encoded = encodeURIComponent(idOrCode);
      const res = await apiClient.get<PointDetailResponse>(`/puntos/${encoded}`);
      return res.data;
    },
    enabled: Boolean(idOrCode),
    refetchInterval: 5000,
  });
}
