import { useState, useCallback } from "react";
import { usePoints } from "./api/points.hooks";
import { PointsFilterBar } from "./components/PointsFilterBar";
import { PointCard } from "./components/PointCard";
import { PointsMap } from "./components/PointsMap";
import { PointDetailPanel } from "./components/PointDetailPanel";
import type { RecyclePoint, WasteType, PointsFilters } from "./types/points.types";

export function PointsView() {
  const [filters, setFilters] = useState<PointsFilters>({});
  const [selectedPoint, setSelectedPoint] = useState<RecyclePoint | null>(null);

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
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ── Left panel: filters + list ── */}
      <aside
        className="w-96 shrink-0 flex flex-col border-r"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-0.5">
            <h1 className="text-lg font-bold tracking-tight">Puntos de Reciclaje</h1>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              Tuluá
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {isLoading
              ? "Cargando..."
              : `${data?.count ?? 0} contenedores${criticalCount > 0 ? ` · ${criticalCount} críticos` : ""}`}
          </p>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
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

        {/* Points list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isError && (
            <p className="text-sm text-center py-8" style={{ color: "var(--destructive)" }}>
              {(error as Error)?.message ?? "Error al cargar los contenedores"}
            </p>
          )}

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl animate-pulse"
                  style={{ background: "var(--muted)" }}
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && points.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm font-semibold">Sin resultados</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Prueba con otros filtros
              </p>
            </div>
          )}

          {!isLoading &&
            points.map((point) => (
              <PointCard
                key={point.id}
                point={point}
                isSelected={selectedPoint?.id === point.id}
                onClick={handlePointSelect}
              />
            ))}
        </div>
      </aside>

      {/* ── Center: Map ── */}
      <main className="flex-1 relative p-3">
        <PointsMap
          points={points}
          selectedPointId={selectedPoint?.id}
          onPointSelect={handlePointSelect}
        />

        {/* Legend overlay */}
        <div
          className="absolute bottom-6 left-6 flex flex-col gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: "white", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)" }}>Llenado</p>
          {[
            { label: "Normal (<50%)", color: "#10b981" },
            { label: "Moderado (50–80%)", color: "#f59e0b" },
            { label: "Crítico (>80%)", color: "#ef4444" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </main>

      {/* ── Right panel: detail ── */}
      <aside
        className="w-80 shrink-0 border-l flex flex-col overflow-hidden transition-all"
        style={{
          borderColor: "var(--border)",
          display: selectedPoint ? "flex" : "none",
        }}
      >
        {selectedPoint && (
          <PointDetailPanel
            point={selectedPoint}
            onClose={() => setSelectedPoint(null)}
          />
        )}
      </aside>
    </div>
  );
}
