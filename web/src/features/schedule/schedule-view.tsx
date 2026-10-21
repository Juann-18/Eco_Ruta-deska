import { useState, useEffect, useCallback } from "react";
import type { RouteItem, RouteDetail } from "./types/schedule.types";
import { getRoutes, getFeaturedRoute, getRouteById } from "./api/schedule.api";
import { RouteDetailModal } from "./components/RouteDetailModal";

interface ScheduleViewProps {
  selectedComuna: number;
}

type PeriodFilter = "hoy" | "manana" | "semana";

export function ScheduleView({ selectedComuna }: ScheduleViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>("hoy");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [featuredRoute, setFeaturedRoute] = useState<RouteItem | null>(null);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [routesData, featData] = await Promise.all([
        getRoutes(undefined, period),
        getFeaturedRoute(selectedComuna),
      ]);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setFeaturedRoute(featData || null);
    } catch (err: any) {
      console.error("Error loading schedule data:", err);
      setError(
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo conectar con el servidor de rutas."
      );
    } finally {
      setLoading(false);
    }
  }, [period, selectedComuna]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRoute = async (routeId: string) => {
    try {
      const detail = await getRouteById(routeId);
      setSelectedRouteDetail(detail);
    } catch (err) {
      console.error("Error loading route detail:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-3 pb-24 max-w-[420px] mx-auto w-full select-none">
      {/* Title */}
      <h1 className="text-[26px] font-extrabold tracking-tight text-black mt-1 mb-4">
        Rutas de recolección
      </h1>

      {/* Filter Tabs: Hoy / Mañana / Esta semana */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setPeriod("hoy")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            period === "hoy"
              ? "bg-black text-white shadow-xs"
              : "bg-[#F4F4F5] text-zinc-800 hover:bg-zinc-200"
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setPeriod("manana")}
          className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            period === "manana"
              ? "bg-black text-white shadow-xs"
              : "bg-[#F4F4F5] text-zinc-800 hover:bg-zinc-200"
          }`}
        >
          Mañana
        </button>
        <button
          onClick={() => setPeriod("semana")}
          className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            period === "semana"
              ? "bg-black text-white shadow-xs"
              : "bg-[#F4F4F5] text-zinc-800 hover:bg-zinc-200"
          }`}
        >
          Esta semana
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-zinc-500">Cargando rutas de recolección...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="py-8 px-5 text-center rounded-3xl bg-rose-50 border border-rose-200/80 space-y-3 my-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900">Error al cargar las rutas</h3>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="px-5 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            Reintentar conexión
          </button>
        </div>
      )}

      {/* Empty State (when not loading, no error, and no routes / featured route) */}
      {!loading && !error && routes.length === 0 && !featuredRoute && (
        <div className="py-14 px-5 text-center rounded-3xl bg-zinc-50 border border-zinc-200/70 space-y-3 my-4">
          <div className="w-14 h-14 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto text-2xl shadow-2xs">
            🚛
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900">No hay rutas programadas</h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
              {period === "hoy"
                ? "No se encontraron rutas de recolección activas o programadas para el día de hoy."
                : period === "manana"
                ? "No hay rutas programadas para el día de mañana en este sector."
                : "No hay rutas registradas para esta semana en este sector."}
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-zinc-200 text-zinc-800 text-xs font-semibold rounded-full hover:bg-zinc-100 transition-colors cursor-pointer shadow-2xs"
          >
            Actualizar lista
          </button>
        </div>
      )}

      {/* Routes List */}
      {!loading && !error && (
        <div className="divide-y divide-zinc-200/80 mb-6">
          {routes
            .filter((r) => r.id !== featuredRoute?.id)
            .map((route) => {
            const isHigh = route.fillPercentage >= 80;
            const isGreen = route.wasteColor === "green" || route.comuna === 1;
            const isBlue = route.wasteColor === "blue";

            return (
              <div
                key={route.id}
                onClick={() => handleOpenRoute(route.id)}
                className="py-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-zinc-50/70 rounded-xl transition-colors px-1"
              >
                {/* Colored Waste Icon Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                    isGreen
                      ? "bg-[#22C55E]"
                      : isBlue
                      ? "bg-[#3B82F6]"
                      : "bg-[#71717A]"
                  }`}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>

                {/* Info Rows */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Row 1: Time, Code, Percentage */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-xs font-semibold text-zinc-900 shadow-2xs">
                        {route.startTime} – {route.endTime}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-xs font-semibold text-zinc-900 shadow-2xs">
                        {route.code}
                      </span>
                    </div>

                    <span
                      className={`px-3.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        isHigh
                          ? "bg-[#FECACA] text-[#DC2626]"
                          : "bg-[#BBF7D0] text-[#16A34A]"
                      }`}
                    >
                      {route.fillPercentage}%
                    </span>
                  </div>

                  {/* Row 2: Company, Status */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-800">
                      {route.companyName}
                    </span>
                    <span className="px-3 py-0.5 rounded-full bg-[#F4F4F5] text-xs font-medium text-zinc-700">
                      {route.status === "PROGRAMADA"
                        ? "Programada"
                        : route.status === "FINALIZADA"
                        ? "Finalizada"
                        : route.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Featured Card (Bottom): Próxima recolección / En camino */}
      {featuredRoute && !loading && !error && (
        <div
          onClick={() => handleOpenRoute(featuredRoute.id)}
          className="bg-[#DCFCE7]/70 border border-[#BBF7D0] rounded-3xl p-5 space-y-3 cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
        >
          {/* Top chips row */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-white text-xs font-bold text-zinc-800 shadow-2xs">
              Próxima recolección
            </span>

            <span className="px-3 py-1 rounded-full bg-white text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              En camino
            </span>
          </div>

          {/* Time & ETA */}
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-zinc-950">
              {featuredRoute.startTime} – {featuredRoute.endTime}
            </div>
            <p className="text-xs font-medium text-emerald-800 mt-0.5">
              {featuredRoute.etaText || "Llega a tu sector en ~25 min"}
            </p>
          </div>

          {/* Tag pills */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-white text-xs font-semibold text-zinc-800 shadow-2xs">
                {featuredRoute.code}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-white text-xs font-semibold text-zinc-800 shadow-2xs">
                {featuredRoute.companyName}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-white text-xs font-semibold text-zinc-800 shadow-2xs">
                {featuredRoute.vehiclePlate}
              </span>
            </div>

            <div>
              <span className="inline-block px-3 py-0.5 rounded-full bg-white text-xs font-semibold text-zinc-800 shadow-2xs">
                Comuna {featuredRoute.comuna}
              </span>
            </div>
          </div>

          {/* Truck Capacity Progress Bar */}
          <div className="pt-1 space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-900 font-medium">
              <span>Capacidad actual del camión</span>
              <span className="font-bold">{featuredRoute.fillPercentage}%</span>
            </div>

            <div className="h-2.5 rounded-full bg-white/80 overflow-hidden p-0.5">
              <div
                className="h-full bg-[#FACC15] rounded-full transition-all duration-500"
                style={{ width: `${featuredRoute.fillPercentage}%` }}
              />
            </div>

            <p className="text-[11px] font-medium text-zinc-600">
              {featuredRoute.currentLoadKg.toLocaleString("es-CO")} / {featuredRoute.maxCapacityKg.toLocaleString("es-CO")} Kg
            </p>
          </div>
        </div>
      )}

      {/* Route Detail & Driver Operation Modal */}
      {selectedRouteDetail && (
        <RouteDetailModal
          route={selectedRouteDetail}
          onClose={() => setSelectedRouteDetail(null)}
          onRefresh={() => {
            loadData();
            if (selectedRouteDetail) {
              handleOpenRoute(selectedRouteDetail.id);
            }
          }}
        />
      )}
    </div>
  );
}
