import type { RecyclePoint } from "../types/points.types";
import {
  WASTE_TYPE_LABELS,
  WASTE_TYPE_COLORS,
  WASTE_ICONS,
  getFillColor,
  getFillLabel,
} from "../../../common/lib/format";
import { cn } from "../../../common/lib/utils";

interface PointCardProps {
  point: RecyclePoint;
  isSelected?: boolean;
  onClick: (point: RecyclePoint) => void;
}

export function PointCard({ point, isSelected, onClick }: PointCardProps) {
  const fillColor = getFillColor(point.currentFillPercentage);
  const fillLabel = getFillLabel(point.currentFillPercentage);
  const wasteColors = WASTE_TYPE_COLORS[point.wasteType];

  return (
    <button
      onClick={() => onClick(point)}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all",
        isSelected
          ? "border-black bg-[var(--muted)]"
          : "border-[var(--border)] bg-white hover:border-black"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{point.name}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{point.address}</p>
        </div>

        <span
          className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: wasteColors.bg, color: wasteColors.text }}
        >
          {WASTE_ICONS[point.wasteType]} {WASTE_TYPE_LABELS[point.wasteType]}
        </span>
      </div>

      {/* Fill bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Llenado
          </span>
          <span className="text-xs font-semibold" style={{ color: fillColor }}>
            {point.currentFillPercentage.toFixed(0)}% — {fillLabel}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--muted)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, point.currentFillPercentage)}%`,
              background: fillColor,
            }}
          />
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {point.currentWeightKg} / {point.capacityKg} kg
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Comuna {point.comuna}
        </span>
        {point.hasLiveTelemetry && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium ml-auto">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En vivo
          </span>
        )}
      </div>
    </button>
  );
}
