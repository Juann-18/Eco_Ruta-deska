import type { WasteType } from "../types/points.types";
import { WASTE_TYPE_LABELS, WASTE_ICONS } from "../../../common/lib/format";
import { cn } from "../../../common/lib/utils";

const ALL_WASTE_TYPES: WasteType[] = [
  "PAPEL_CARTON",
  "VIDRIO",
  "PLASTICO",
  "METAL",
  "ESCOMBRO",
  "ORGANICO",
];

const COMUNAS = [1, 2, 3, 4, 5, 6];

interface PointsFilterBarProps {
  selectedWasteType?: WasteType;
  selectedComuna?: number;
  showCriticalOnly?: boolean;
  searchQuery?: string;
  onWasteTypeChange: (type: WasteType | undefined) => void;
  onComunaChange: (comuna: number | undefined) => void;
  onCriticalOnlyChange: (val: boolean) => void;
  onSearchChange: (val: string) => void;
}

export function PointsFilterBar({
  selectedWasteType,
  selectedComuna,
  showCriticalOnly,
  searchQuery,
  onWasteTypeChange,
  onComunaChange,
  onCriticalOnlyChange,
  onSearchChange,
}: PointsFilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--muted-foreground)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, dirección o código..."
          value={searchQuery ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors"
          style={{
            background: "var(--muted)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Waste type pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onWasteTypeChange(undefined)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
            !selectedWasteType
              ? "bg-black text-white border-black"
              : "bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-black hover:text-black"
          )}
        >
          Todos
        </button>

        {ALL_WASTE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() =>
              onWasteTypeChange(selectedWasteType === type ? undefined : type)
            }
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
              selectedWasteType === type
                ? "bg-black text-white border-black"
                : "bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-black hover:text-black"
            )}
          >
            <span>{WASTE_ICONS[type]}</span>
            {WASTE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Comuna + Critical toggle row */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedComuna ?? ""}
          onChange={(e) =>
            onComunaChange(e.target.value ? Number(e.target.value) : undefined)
          }
          className="px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
          style={{
            background: "var(--muted)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Todas las comunas</option>
          {COMUNAS.map((c) => (
            <option key={c} value={c}>
              Comuna {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => onCriticalOnlyChange(!showCriticalOnly)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
            showCriticalOnly
              ? "bg-[#ef4444] text-white border-[#ef4444]"
              : "bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-red-400 hover:text-red-500"
          )}
        >
          <span className={cn(showCriticalOnly && "animate-pulse")}>🚨</span>
          Solo críticos
        </button>
      </div>
    </div>
  );
}
