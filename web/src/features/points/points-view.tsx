import { useState, useCallback, useEffect } from "react";
import { usePoints } from "./api/points.hooks";
import { PointsFilterBar } from "./components/PointsFilterBar";
import { PointCard } from "./components/PointCard";
import { PointsMap } from "./components/PointsMap";
import { PointDetailPanel } from "./components/PointDetailPanel";
import type { RecyclePoint, WasteType, PointsFilters } from "./types/points.types";
import { cn } from "../../common/lib/utils";

interface PointsViewProps {
  selectedComuna?: number;
  initialWasteType?: WasteType;
  onClearInitialWasteType?: () => void;
}

export function PointsView({
  selectedComuna,
  initialWasteType,
}: PointsViewProps) {
  const [filters, setFilters] = useState<PointsFilters>({
    comuna: selectedComuna,
    wasteType: initialWasteType,
  });
  const [selectedPoint, setSelectedPoint] = useState<RecyclePoint | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");

  // Sync comuna from shell
  useEffect(() => {
    if (selectedComuna) {
      setFilters((prev) => ({ ...prev, comuna: selectedComuna }));
    }
  }, [selectedComuna]);

  // Sync initial waste type from category click
  useEffect(() => {
    if (initialWasteType) {
      setFilters((prev) => ({ ...prev, wasteType: initialWasteType }));
    }
  }, [initialWasteType]);

  const { data, isLoading, isError, error } = usePoints(filters);

  const handlePointSelect = useCallback((point: RecyclePoint) => {
    setSelectedPoint(point);
  }, []);

  const handleWasteTypeChange = useCallback((type: WasteType | undefined) => {
    setFilters((prev) => ({ ...prev, wasteType: type }));
  }, []);

  const handleComunaChange = useCallback((comuna: number | undefined) => {
    setFilters((prev) => ({ ...prev, comuna }));
  }, []);

  const handleCriticalOnlyChange = useCallback((val: boolean) => {
    setFilters((prev) => ({ ...prev, isCritical: val || undefined }));
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  const points = data?.data ?? [];
  const criticalCount = points.filter((p) => p.isCritical).length;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[var(--background)]">
      {/* ── Sub-header: Filters & Mobile View Toggle ── */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-white shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
              Contenedores de Reciclaje
            </h2>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {isLoading
                ? "Cargando puntos..."
                : `${points.length} puntos disponibles${
                    criticalCount > 0 ? ` · ${criticalCount} en alerta roja` : ""
                  }`}
            </p>
          </div>

          {/* Toggle Map / List for compact layout */}
          <div className="flex sm:hidden bg-[var(--muted)] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setMobileTab("map")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                mobileTab === "map" ? "bg-white text-black shadow-xs font-bold" : "text-zinc-500"
              )}
            >
              🗺️ Mapa
            </button>
            <button
              onClick={() => setMobileTab("list")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                mobileTab === "list" ? "bg-white text-black shadow-xs font-bold" : "text-zinc-500"
              )}
            >
              📋 Lista
            </button>
          </div>
        </div>

        <PointsFilterBar
          selectedWasteType={filters.wasteType}
          selectedComuna={filters.comuna}
          showCriticalOnly={filters.isCritical}
          searchQuery={filters.search}
          onWasteTypeChange={handleWasteTypeChange}
          onComunaChange={handleComunaChange}
          onCriticalOnlyChange={handleCriticalOnlyChange}
          onSearchChange={handleSearchChange}
        />
      </div>

      {/* ── Main Viewport Area ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left / Mobile List Panel ── */}
        <aside
          className={cn(
            "w-full sm:w-80 md:w-96 shrink-0 flex flex-col border-r border-[var(--border)] bg-white overflow-hidden transition-all",
            mobileTab === "map" ? "hidden sm:flex" : "flex"
          )}
        >
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {isError && (
              <p className="text-sm text-center py-8 text-[var(--destructive)]">
                {(error as Error)?.message ?? "Error al cargar los contenedores"}
              </p>
            )}

            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl animate-pulse bg-[var(--muted)]"
                  />
                ))}
              </div>
            )}

            {!isLoading && !isError && points.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm font-semibold">Sin contenedores</p>
                <p className="text-xs mt-1 text-[var(--muted-foreground)]">
                  Prueba seleccionando otra comuna o material
                </p>
              </div>
            )}

            {!isLoading &&
              points.map((point) => (
                <PointCard
                  key={point.id}
                  point={point}
                  isSelected={selectedPoint?.id === point.id}
                  onClick={(pt) => {
                    handlePointSelect(pt);
                    // On mobile, if in list mode, switch to map to see it
                    if (window.innerWidth < 640) {
                      setMobileTab("map");
                    }
                  }}
                />
              ))}
          </div>
        </aside>

        {/* ── Center: Map Area ── */}
        <main
          className={cn(
            "flex-1 relative p-2 overflow-hidden",
            mobileTab === "list" ? "hidden sm:block" : "block"
          )}
        >
          <PointsMap
            points={points}
            selectedPointId={selectedPoint?.id}
            onPointSelect={handlePointSelect}
          />

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 px-3 py-2 rounded-xl text-[11px] font-semibold bg-white/95 border border-[var(--border)] shadow-md z-[1000]">
            <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Semáforo</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Normal (&lt;50%)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Moderado (50–80%)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Crítico (&gt;80%)
            </div>
          </div>
        </main>

        {/* ── Right Panel: Contenedor Detalle & Guía ── */}
        {selectedPoint && (
          <aside className="absolute inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-white border-l border-[var(--border)] z-30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <PointDetailPanel
              point={selectedPoint}
              onClose={() => setSelectedPoint(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

