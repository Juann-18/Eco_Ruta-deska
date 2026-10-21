import { useState } from "react";
import type { RecyclePoint } from "../types/points.types";
import {
  WASTE_TYPE_LABELS,
  WASTE_TYPE_COLORS,
  WASTE_ICONS,
  WASTE_GUIDES,
  getFillColor,
  getFillLabel,
} from "../../../common/lib/format";
import { cn } from "../../../common/lib/utils";

interface PointDetailPanelProps {
  point: RecyclePoint;
  onClose: () => void;
}

export function PointDetailPanel({ point, onClose }: PointDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"status" | "guide">("status");
  const fillColor = getFillColor(point.currentFillPercentage);
  const fillLabel = getFillLabel(point.currentFillPercentage);
  const wasteColors = WASTE_TYPE_COLORS[point.wasteType];
  const guide = WASTE_GUIDES[point.wasteType];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div
        className="flex items-start justify-between p-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full font-mono"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              {point.code}
            </span>
            {point.hasLiveTelemetry && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Telemetría en vivo
              </span>
            )}
          </div>
          <h2 className="font-bold text-base leading-tight">{point.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {point.address} · Comuna {point.comuna}
          </p>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--muted)] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b text-xs font-semibold" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setActiveTab("status")}
          className={cn(
            "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
            activeTab === "status"
              ? "border-black text-black"
              : "border-transparent text-[var(--muted-foreground)] hover:text-black"
          )}
        >
          Estado & Sensores
        </button>
        <button
          onClick={() => setActiveTab("guide")}
          className={cn(
            "flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer",
            activeTab === "guide"
              ? "border-black text-black"
              : "border-transparent text-[var(--muted-foreground)] hover:text-black"
          )}
        >
          Guía de Separación
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Waste type badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: wasteColors.bg, color: wasteColors.text }}
        >
          <span>{WASTE_ICONS[point.wasteType]}</span>
          {WASTE_TYPE_LABELS[point.wasteType]}
        </div>

        {activeTab === "status" ? (
          <>
            {/* Fill level */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">Nivel de llenado</span>
                <span className="text-sm font-bold" style={{ color: fillColor }}>
                  {point.currentFillPercentage.toFixed(1)}% — {fillLabel}
                </span>
              </div>
              <div
                className="h-3 rounded-full overflow-hidden"
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
              <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                {point.currentWeightKg} kg ocupados de {point.capacityKg} kg de capacidad
              </p>
            </div>

            {/* Sensor metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Batería del sensor"
                value={`${point.batteryPercentage.toFixed(0)}%`}
                icon="🔋"
                status={point.batteryPercentage < 20 ? "critical" : "ok"}
              />
              <MetricCard
                label="Temperatura"
                value={`${point.temperatureCelsius.toFixed(1)}°C`}
                icon="🌡️"
                status={point.temperatureCelsius > 55 ? "critical" : "ok"}
              />
            </div>

            {/* Coordinates */}
            <div
              className="rounded-xl p-3"
              style={{ background: "var(--muted)" }}
            >
              <p className="text-xs font-semibold mb-1">Coordenadas GPS</p>
              <p className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-1 inline-block font-semibold"
                style={{ color: "var(--primary-brand)" }}
              >
                Ver en Google Maps →
              </a>
            </div>

            {/* Last emptied */}
            {point.lastEmptiedAt && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Último vaciado:{" "}
                <span className="font-semibold">
                  {new Date(point.lastEmptiedAt).toLocaleString("es-CO")}
                </span>
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Accepted items */}
            <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                <span>✅</span> ¿Qué SÍ se debe depositar?
              </p>
              <ul className="space-y-1.5 text-xs text-emerald-950">
                {guide.yes.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rejected items */}
            <div className="rounded-xl p-3 bg-rose-50 border border-rose-100">
              <p className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                <span>❌</span> ¿Qué NO se debe depositar?
              </p>
              <ul className="space-y-1.5 text-xs text-rose-950">
                {guide.no.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Preparation tip */}
            <div className="rounded-xl p-3 bg-amber-50 border border-amber-100">
              <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <span>💡</span> Consejo de separación
              </p>
              <p className="text-xs text-amber-950 leading-relaxed">
                {guide.tips}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  status,
}: {
  label: string;
  value: string;
  icon: string;
  status: "ok" | "critical";
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: status === "critical" ? "#fff1f1" : "var(--muted)",
        border: status === "critical" ? "1px solid #ffb0b0" : "1px solid transparent",
      }}
    >
      <p className="text-lg mb-0.5">{icon}</p>
      <p
        className="text-base font-bold"
        style={{ color: status === "critical" ? "var(--destructive)" : "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
    </div>
  );
}
