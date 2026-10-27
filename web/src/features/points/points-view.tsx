import { useState, useCallback, useEffect, useRef } from "react";
import { usePoints } from "./api/points.hooks";
import { PointsMap } from "./components/PointsMap";
import { createReport } from "../reports/api/reports.api";
import type {
  CitizenReportItem,
  CitizenReportReason,
} from "../reports/types/reports.types";
import type { RecyclePoint, WasteType, PointsFilters } from "./types/points.types";

interface PointsViewProps {
  selectedComuna?: number;
  initialWasteType?: WasteType;
  onSelectComuna?: (comuna: number) => void;
  onNavigateToHome?: () => void;
}

const WASTE_META: Record<
  WasteType,
  {
    label: string;
    shortLabel: string;
    iconBg: string;
    cardBg: string;
  }
> = {
  PAPEL_CARTON: {
    label: "Papel y Cartón",
    shortLabel: "Papel",
    iconBg: "#4F46E5",
    cardBg: "#EBE8F9",
  },
  VIDRIO: {
    label: "Vidrio",
    shortLabel: "Vidrio",
    iconBg: "#4ADE80",
    cardBg: "#DCFCE7",
  },
  PLASTICO: {
    label: "Plastico",
    shortLabel: "Plástico",
    iconBg: "#3B82F6",
    cardBg: "#DBEAFE",
  },
  METAL: {
    label: "Metal",
    shortLabel: "Metal",
    iconBg: "#EF4444",
    cardBg: "#FEE2E2",
  },
  ESCOMBRO: {
    label: "Escombro",
    shortLabel: "Escombro",
    iconBg: "#9CA3AF",
    cardBg: "#F4F4F5",
  },
  ORGANICO: {
    label: "Orgánico",
    shortLabel: "Orgánico",
    iconBg: "#10B981",
    cardBg: "#D1FAE5",
  },
};

const REPORT_REASON_OPTIONS: Array<{
  value: CitizenReportReason;
  label: string;
}> = [
  { value: "CONTENEDOR_LLENO", label: "Contenedor lleno" },
  { value: "DANADO", label: "Dañado" },
  { value: "MAL_OLOR", label: "Mal olor" },
  { value: "RESIDUOS_FUERA", label: "Residuos fuera" },
  { value: "CAMION_NO_PASO", label: "Camión no pasó" },
];

export function PointsView({
  selectedComuna = 1,
  initialWasteType,
  onSelectComuna,
  onNavigateToHome,
}: PointsViewProps) {
  const [filters, setFilters] = useState<PointsFilters>({
    comuna: selectedComuna,
    wasteType: initialWasteType,
  });
  const [selectedPoint, setSelectedPoint] = useState<RecyclePoint | null>(null);
  const [isChangingLocality, setIsChangingLocality] = useState(false);
  const [tempComuna, setTempComuna] = useState<number>(selectedComuna);

  // Estado de Fase 5: Reportar un problema y confirmación de folio
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] =
    useState<CitizenReportReason>("CONTENEDOR_LLENO");
  const [reportDescription, setReportDescription] = useState("");
  const [reportPhotoName, setReportPhotoName] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] =
    useState<CitizenReportItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, comuna: selectedComuna }));
    setTempComuna(selectedComuna);
  }, [selectedComuna]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, wasteType: initialWasteType }));
  }, [initialWasteType]);

  const { data, isLoading, isError } = usePoints(filters);
  const points = data?.data ?? [];

  const handlePointSelect = useCallback((point: RecyclePoint) => {
    setSelectedPoint(point);
    setIsReporting(false);
    setSubmittedReport(null);
  }, []);

  const handleStartReport = (point: RecyclePoint) => {
    setSelectedPoint(point);
    setReportReason("CONTENEDOR_LLENO");
    setReportDescription("");
    setReportPhotoName(null);
    setReportError(null);
    setSubmittedReport(null);
    setIsReporting(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;

    const cleanDesc =
      reportDescription.trim() ||
      `Reporte ciudadano (${REPORT_REASON_OPTIONS.find((r) => r.value === reportReason)?.label}) en contenedor ${selectedPoint.code}`;

    setIsSubmittingReport(true);
    setReportError(null);
    try {
      const created = await createReport({
        recyclePointId: selectedPoint.id,
        reason: reportReason,
        description: cleanDesc,
        address: selectedPoint.address,
        latitude: selectedPoint.latitude,
        longitude: selectedPoint.longitude,
        imageUrl: reportPhotoName ? `/uploads/${reportPhotoName}` : undefined,
      });
      setSubmittedReport(created);
      setIsReporting(false);
    } catch (err: any) {
      setReportError(
        err?.response?.data?.error || "No se pudo enviar el reporte. Intenta nuevamente."
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ── Subvista 1: Cambiar localidad (Rutas__reportes_y_avisos__Routes___Cambiar_localidad.png) ──
  if (isChangingLocality) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col space-y-5">
        <div>
          <button
            onClick={() => setIsChangingLocality(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
          >
            <span>‹</span>
            <span>Contenedores</span>
          </button>
        </div>

        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-black">
            Cambiar localidad
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Mostraremos horarios y contenedores de tu comuna
          </p>
        </div>

        <div className="bg-[#F8F8FA] rounded-3xl p-3 space-y-2.5">
          {[1, 2, 3, 4, 5, 6].map((c) => {
            const active = tempComuna === c;
            return (
              <button
                key={c}
                onClick={() => setTempComuna(c)}
                className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3.5 text-left shadow-2xs border border-zinc-100 hover:border-zinc-300 transition-all cursor-pointer"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    active ? "border-black bg-black" : "border-zinc-300 bg-white"
                  }`}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-bold text-zinc-900">Comuna {c}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setFilters((prev) => ({ ...prev, comuna: tempComuna }));
            if (onSelectComuna) {
              onSelectComuna(tempComuna);
            }
            setIsChangingLocality(false);
          }}
          className="w-full py-4 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-900 transition-colors cursor-pointer shadow-md"
        >
          Guardar localidad
        </button>
      </div>
    );
  }

  // ── Subvista 4: ¡Reporte enviado! (Rutas__reportes_y_avisos__Contenedor___Reporte_enviado.png) ──
  if (selectedPoint && submittedReport) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center space-y-6 text-center">
        {/* Círculo verde claro con check */}
        <div className="w-24 h-24 rounded-full bg-[#C8EEC8] flex items-center justify-center shadow-xs">
          <svg
            className="w-10 h-10 text-[#4B6A4C]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="space-y-2 max-w-xs">
          <h1 className="text-[26px] font-extrabold tracking-tight text-black">
            ¡Reporte enviado!
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Gracias por avisar. Notificaremos a{" "}
            {submittedReport.companyName || selectedPoint.companyName || "EcoAseo Tuluá"}{" "}
            para que revise el contenedor.
          </p>
        </div>

        {/* Chips de Folio y Estado */}
        <div className="flex items-center justify-center gap-2.5">
          <span className="px-4 py-1.5 rounded-full bg-white border border-zinc-200/80 text-xs font-bold text-zinc-900 shadow-2xs">
            Folio {submittedReport.folio}
          </span>
          <span className="px-4 py-1.5 rounded-full bg-[#FEF9C3] text-[#CA8A04] text-xs font-bold">
            En revisión
          </span>
        </div>

        {/* Botones de navegación post-reporte */}
        <div className="w-full space-y-3 pt-2">
          <button
            onClick={() => {
              setSubmittedReport(null);
              setSelectedPoint(null);
            }}
            className="w-full py-4 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-900 transition-colors cursor-pointer shadow-xs"
          >
            Volver a contenedores
          </button>

          <button
            onClick={() => {
              setSubmittedReport(null);
              setSelectedPoint(null);
              if (onNavigateToHome) {
                onNavigateToHome();
              }
            }}
            className="w-full py-4 rounded-full bg-[#F4F4F5] text-zinc-900 text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  // ── Subvista 3: Reportar un problema (Rutas__reportes_y_avisos__Contenedor___Reportar_problema.png) ──
  if (selectedPoint && isReporting) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col space-y-4">
        <div>
          <button
            onClick={() => setIsReporting(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
          >
            <span>‹</span>
            <span>Contenedor</span>
          </button>
        </div>

        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-black">
            Reportar un problema
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Contenedor {selectedPoint.code} · {selectedPoint.address}
          </p>
        </div>

        <form onSubmit={handleSubmitReport} className="space-y-4">
          {reportError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {reportError}
            </div>
          )}

          {/* ¿Qué ocurre? */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 font-medium block">
              ¿Qué ocurre?
            </label>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASON_OPTIONS.map((opt) => {
                const active = reportReason === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReportReason(opt.value)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-black text-white shadow-xs"
                        : "bg-[#F4F4F5] text-zinc-900 hover:bg-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 font-medium block">
              Descripción
            </label>
            <textarea
              rows={4}
              placeholder="Cuéntanos qué pasó..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              className="w-full rounded-3xl bg-[#F4F4F5] p-4 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
            />
          </div>

          {/* Agregar foto (opcional) */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setReportPhotoName(file.name);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-5 rounded-3xl border-2 border-dashed border-zinc-300 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50/60 transition-colors cursor-pointer"
            >
              {reportPhotoName
                ? `📷 Foto adjunta: ${reportPhotoName}`
                : "+ Agregar foto (opcional)"}
            </button>
          </div>

          {/* Botón Enviar reporte */}
          <button
            type="submit"
            disabled={isSubmittingReport}
            className="w-full py-4 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-900 transition-colors cursor-pointer shadow-md disabled:opacity-60"
          >
            {isSubmittingReport ? "Enviando reporte..." : "Enviar reporte"}
          </button>
        </form>
      </div>
    );
  }

  // ── Subvista 2: Detalle de Contenedor (Rutas__reportes_y_avisos__Contenedor___Detalle.png) ──
  if (selectedPoint) {
    const meta = WASTE_META[selectedPoint.wasteType] ?? WASTE_META.PAPEL_CARTON;
    const fill = Math.round(selectedPoint.currentFillPercentage);
    const isHigh = fill >= 80;
    const isMed = fill >= 50 && fill < 80;

    return (
      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col space-y-4">
        {/* Botón Volver */}
        <div>
          <button
            onClick={() => setSelectedPoint(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
          >
            <span>‹</span>
            <span>Contenedores</span>
          </button>
        </div>

        {/* Tarjeta Superior de Material */}
        <div
          className="rounded-3xl p-5 space-y-4"
          style={{ backgroundColor: meta.cardBg }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: meta.iconBg }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H7a2 2 0 00-2 2v14a2 2 0 002 2h12a1 1 0 001-1V4a1 1 0 00-1-1zM9 7h8v2H9V7zm8 4H9v2h8v-2zm-8 4h5v2H9v-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-950 leading-tight">
                {meta.label}
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Contenedor público · {selectedPoint.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-zinc-900 shadow-2xs">
              {selectedPoint.code}
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-zinc-900 shadow-2xs">
              {selectedPoint.address}
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-zinc-900 shadow-2xs">
              {selectedPoint.capacityKg} Kg
            </span>
          </div>
        </div>

        {/* Tarjeta de Nivel de Llenado */}
        <div
          className={`rounded-3xl p-5 space-y-3 ${
            isHigh
              ? "bg-[#FEE2E2]/80"
              : isMed
              ? "bg-[#FEF9C3]/80"
              : "bg-[#DCFCE7]/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900">Nivel de llenado</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isHigh
                  ? "bg-[#FCA5A5] text-[#DC2626]"
                  : isMed
                  ? "bg-[#FDE047] text-[#CA8A04]"
                  : "bg-[#86EFAC] text-[#15803D]"
              }`}
            >
              {fill}%
            </span>
          </div>

          <div className="h-3 rounded-full bg-white overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isHigh
                  ? "bg-[#EF4444]"
                  : isMed
                  ? "bg-[#EAB308]"
                  : "bg-[#22C55E]"
              }`}
              style={{ width: `${Math.min(100, fill)}%` }}
            />
          </div>

          <p className="text-xs text-zinc-600 font-medium">
            {isHigh
              ? "Casi lleno · se vacía hoy a las 17:00"
              : isMed
              ? "Capacidad media · disponible para depósito"
              : "Amplia capacidad disponible · se vacía hoy a las 17:00"}
          </p>
        </div>

        {/* Dos tarjetas informativas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3.5">
            <p className="text-[11px] text-zinc-500 font-medium">Próxima recolección</p>
            <p className="text-sm font-extrabold text-zinc-950 mt-0.5">Hoy 17:00</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3.5">
            <p className="text-[11px] text-zinc-500 font-medium">Empresa</p>
            <p className="text-sm font-extrabold text-zinc-950 mt-0.5">
              {selectedPoint.companyName ?? "EcoAseo Tuluá"}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 font-medium">
          Actualizado hace 5 min · Telemetría IoT activa ({selectedPoint.temperatureCelsius}°C)
        </p>

        {/* Botones de Acción */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setSelectedPoint(null)}
            className="py-3.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cómo llegar
          </button>
          <button
            onClick={() => handleStartReport(selectedPoint)}
            className="py-3.5 rounded-full bg-[#F4F4F5] text-zinc-900 text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Reportar problema
          </button>
        </div>
      </div>
    );
  }

  // ── Vista Principal: Contenedores cercanos desde tu ubicación (Routes.png) ──
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 flex flex-col space-y-3.5 select-none">
      {/* Barra de Localidad idéntica a Routes.png */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#D9F99D] flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-zinc-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </div>
          <span className="text-xs font-extrabold text-zinc-900">
            Localidad: Comuna {filters.comuna ?? selectedComuna}
          </span>
        </div>

        <button
          onClick={() => setIsChangingLocality(true)}
          className="px-3.5 py-2 rounded-full bg-[#F4F4F5] hover:bg-zinc-200 text-xs font-bold text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Cambiar Localidad</span>
          <span className="text-zinc-500">›</span>
        </button>
      </div>

      {/* Mapa Interactivo Leaflet redondeado */}
      <div className="w-full h-[215px] rounded-3xl overflow-hidden border border-zinc-200 shadow-xs shrink-0 relative z-0">
        <PointsMap
          points={points}
          selectedPointId={undefined}
          onPointSelect={handlePointSelect}
        />
      </div>

      {/* Barra horizontal de Filtros por Material (Ciudadano___Filtro_Material_Mapa) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilters((prev) => ({ ...prev, wasteType: undefined }))}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
            !filters.wasteType
              ? "bg-black text-white"
              : "bg-[#F4F4F5] text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Todos
        </button>
        {(Object.keys(WASTE_META) as WasteType[]).map((wType) => {
          const active = filters.wasteType === wType;
          return (
            <button
              key={wType}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  wasteType: active ? undefined : wType,
                }))
              }
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                active
                  ? "bg-black text-white"
                  : "bg-[#F4F4F5] text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {WASTE_META[wType].shortLabel}
            </button>
          );
        })}
      </div>

      {/* Título principal idéntico a Routes.png */}
      <div className="flex items-end justify-between pt-0.5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-black leading-tight">
          Contenedores cercanos
          <br />
          desde tu ubicación
        </h1>
      </div>

      {/* Lista de Contenedores estilo Routes.png */}
      <div className="bg-[#F8F8FA] rounded-3xl p-3 divide-y divide-zinc-200/80">
        {isLoading && (
          <div className="py-8 text-center text-xs text-zinc-500 font-medium">
            Cargando contenedores cercanos...
          </div>
        )}

        {isError && (
          <div className="py-8 text-center text-xs text-red-600 font-medium">
            No se pudieron cargar los contenedores. Verifica que el backend esté activo.
          </div>
        )}

        {!isLoading && !isError && points.length === 0 && (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-zinc-500 font-medium">
              No hay contenedores en Comuna {filters.comuna} con este filtro.
            </p>
            <button
              onClick={() => setFilters({ comuna: undefined, wasteType: undefined })}
              className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-bold cursor-pointer"
            >
              Ver todas las comunas
            </button>
          </div>
        )}

        {!isLoading &&
          points.map((point) => {
            const meta = WASTE_META[point.wasteType] ?? WASTE_META.PAPEL_CARTON;
            const fill = Math.round(point.currentFillPercentage);
            const isHigh = fill >= 80;
            const isMed = fill >= 50 && fill < 80;

            return (
              <div
                key={point.id}
                onClick={() => handlePointSelect(point)}
                className="py-3 first:pt-1 last:pb-1 space-y-2 cursor-pointer hover:bg-white/60 rounded-2xl px-1 transition-colors"
              >
                {/* Fila 1: Icono + Tipo + Capacidad + Botones de acción + % */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: meta.iconBg }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H7a2 2 0 00-2 2v14a2 2 0 002 2h12a1 1 0 001-1V4a1 1 0 00-1-1zM9 7h8v2H9V7zm8 4H9v2h8v-2zm-8 4h5v2H9v-2z" />
                      </svg>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-white border border-zinc-200/80 text-xs font-bold text-zinc-900 truncate shadow-2xs">
                      {meta.label}
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-white border border-zinc-200/80 text-xs font-bold text-zinc-900 shrink-0 shadow-2xs">
                      {point.capacityKg}Kg
                    </span>
                  </div>

                  {/* Acciones derecha: Alerta amarilla, Ruta verde, Porcentaje */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title="Reportar problema"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartReport(point);
                      }}
                      className="w-7 h-7 rounded-full bg-[#FEF08A] hover:bg-amber-300 flex items-center justify-center text-zinc-900 text-xs font-bold cursor-pointer transition-colors"
                    >
                      ⚠️
                    </button>
                    <span
                      title="Ver ubicación"
                      className="w-7 h-7 rounded-full bg-[#86EFAC] flex items-center justify-center text-zinc-900 text-xs font-bold"
                    >
                      ↱
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isHigh
                          ? "bg-[#FECACA] text-[#DC2626]"
                          : isMed
                          ? "bg-[#FEF08A] text-[#CA8A04]"
                          : "bg-[#BBF7D0] text-[#16A34A]"
                      }`}
                    >
                      {fill}%
                    </span>
                  </div>
                </div>

                {/* Fila 2: Código + Dirección */}
                <div className="flex items-center gap-2 pl-1">
                  <span className="px-3 py-1 rounded-full bg-white border border-zinc-200/80 text-xs font-bold text-zinc-900 shadow-2xs">
                    {point.code}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white border border-zinc-200/80 text-xs font-bold text-zinc-900 truncate shadow-2xs">
                    {point.address}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
