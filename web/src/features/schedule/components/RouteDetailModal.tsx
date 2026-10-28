import { useState, useEffect } from "react";
import type { RouteDetail, RouteStatus } from "../types/schedule.types";
import {
  checkinStop,
  completeStop,
  reportStopIncident,
  updateRouteStatus,
} from "../api/schedule.api";
import { RouteLiveMap } from "./RouteLiveMap";
import { useAuthStore } from "../../auth/auth.store";

interface RouteDetailModalProps {
  route: RouteDetail;
  onClose: () => void;
  onRefresh: () => void;
}

export function RouteDetailModal({ route, onClose, onRefresh }: RouteDetailModalProps) {
  const { user } = useAuthStore();
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<string>("75.0");
  const [incidentReason, setIncidentReason] = useState<string>("");
  const [showIncidentForm, setShowIncidentForm] = useState<boolean>(false);
  const [showShiftSummary, setShowShiftSummary] = useState<boolean>(
    route.status === "FINALIZADA"
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDriver = user?.role === "RECOLECTOR" || user?.role === "ADMIN";
  const isLive = route.status === "EN_CAMINO";
  const isNearCapacity = route.fillPercentage >= 90;

  // Polling automático para rastreo GPS en vivo cuando la ruta está EN_CAMINO
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [isLive, onRefresh]);

  const completedStopsCount = route.collections.filter(
    (s) => s.status === "COMPLETADA"
  ).length;
  const omittedStopsCount = route.collections.filter(
    (s) => s.status === "OMITIDA"
  ).length;
  const totalCollectedInStopsKg = route.collections.reduce(
    (acc, s) => acc + (s.collectedWeightKg ?? 0),
    0
  );

  const handleRouteStatusChange = async (newStatus: RouteStatus) => {
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await updateRouteStatus(route.id, newStatus);
      if (newStatus === "EN_CAMINO") {
        setMessage("Turno iniciado. Transmisión de telemetría GPS activa.");
      } else if (newStatus === "FINALIZADA") {
        setMessage("Ruta y jornada finalizadas correctamente.");
        setShowShiftSummary(true);
      }
      onRefresh();
    } catch {
      setErrorMsg("No se pudo actualizar el estado de la ruta.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (stopId: string) => {
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await checkinStop(stopId);
      setMessage("Check-in GPS registrado. Parada en proceso.");
      onRefresh();
    } catch {
      setErrorMsg("Error al realizar el check-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (stopId: string) => {
    const val = parseFloat(weightKg);
    if (isNaN(val) || val < 0) {
      setErrorMsg("Por favor ingresa un peso válido en Kg.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await completeStop(stopId, val);
      setMessage(`Pesaje registrado (${val} Kg). Contenedor vaciado a 0%.`);
      setActiveStopId(null);
      onRefresh();
    } catch {
      setErrorMsg("Error al registrar el pesaje.");
    } finally {
      setLoading(false);
    }
  };

  const handleIncident = async (stopId: string) => {
    if (!incidentReason.trim()) {
      setErrorMsg("Describe el motivo de la incidencia antes de confirmar.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await reportStopIncident(stopId, incidentReason);
      setMessage("Incidencia registrada. Parada marcada como omitida.");
      setShowIncidentForm(false);
      setIncidentReason("");
      setActiveStopId(null);
      onRefresh();
    } catch {
      setErrorMsg("Error al reportar la incidencia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-zinc-900">{route.code}</span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  route.status === "EN_CAMINO"
                    ? "bg-emerald-100 text-emerald-800"
                    : route.status === "FINALIZADA"
                    ? "bg-zinc-200 text-zinc-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {route.status === "EN_CAMINO"
                  ? "En camino"
                  : route.status === "FINALIZADA"
                  ? "Finalizada"
                  : "Programada"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {route.name} · {route.startTime} – {route.endTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {message && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {message}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Mapa Interactivo de Rastreo GPS en Vivo (Ciudadano___Rastreo_Camion_En_Vivo / Recolector___Navegacion_Ruta) */}
          <RouteLiveMap
            stops={route.collections}
            truckPlate={route.vehiclePlate}
            truckLat={route.vehicle?.latitude}
            truckLng={route.vehicle?.longitude}
            truckSpeedKmh={route.vehicle?.speedKmh}
            isLive={isLive}
            onSelectStop={(stopId) => setActiveStopId(stopId)}
          />

          {/* Alerta preventiva de sobrecarga >= 90% (Recolector___Alerta_Descarga) */}
          {isNearCapacity && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 mt-1 shrink-0 animate-pulse" />
              <div className="text-xs text-red-900">
                <p className="font-extrabold">
                  Capacidad máxima cercana ({route.fillPercentage}%)
                </p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  Se sugiere desvío a centro de transferencia o descarga antes de continuar el recorrido.
                </p>
              </div>
            </div>
          )}

          {/* Vehicle info & capacity bar */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Operador: <b className="text-zinc-900">{route.companyName}</b>
              </span>
              <span className="font-mono font-bold bg-zinc-900 text-white px-2.5 py-0.5 rounded-full text-[11px]">
                {route.vehiclePlate}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Capacidad acumulada:</span>
                <span className="font-bold text-zinc-900">
                  {route.currentLoadKg} / {route.maxCapacityKg} Kg ({route.fillPercentage}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNearCapacity ? "bg-red-500" : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(route.fillPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Controles de Turno para Recolector / Admin */}
            {isDriver && (
              <div className="pt-2 border-t border-zinc-200/80 flex flex-wrap gap-2">
                {route.status === "PROGRAMADA" && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleRouteStatusChange("EN_CAMINO")}
                    className="flex-1 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Iniciar Ruta y Turno GPS
                  </button>
                )}

                {route.status === "EN_CAMINO" && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleRouteStatusChange("FINALIZADA")}
                    className="flex-1 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Finalizar Ruta y Turno
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowShiftSummary((prev) => !prev)}
                  className="px-3.5 py-2 rounded-full bg-white border border-zinc-200 text-zinc-900 text-xs font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  {showShiftSummary ? "Ocultar Resumen" : "Resumen de Jornada"}
                </button>
              </div>
            )}
          </div>

          {/* Tarjeta Resumen de Jornada (Recolector___Resumen_Jornada) */}
          {showShiftSummary && (
            <div className="rounded-3xl bg-[#D6F3D1] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-zinc-950">
                  Resumen Operativo de Jornada
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#1E561A]">
                  {route.code}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white p-3 text-center">
                  <p className="text-[10px] text-zinc-500 font-medium">Paradas</p>
                  <p className="text-base font-extrabold text-zinc-950">
                    {completedStopsCount} / {route.collections.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center">
                  <p className="text-[10px] text-zinc-500 font-medium">Recolectado</p>
                  <p className="text-base font-extrabold text-zinc-950">
                    {Math.max(route.currentLoadKg, totalCollectedInStopsKg)} Kg
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center">
                  <p className="text-[10px] text-zinc-500 font-medium">Incidencias</p>
                  <p className="text-base font-extrabold text-zinc-950">
                    {omittedStopsCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista secuencial de paradas (#1 a #N) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Paradas de Recolección ({route.collections.length})
              </h3>
              {isDriver && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-zinc-900 text-white rounded-full">
                  Modo Conductor Activo
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {route.collections.map((stop) => {
                const isSelected = activeStopId === stop.id;

                return (
                  <div
                    key={stop.id}
                    className={`border rounded-2xl p-3.5 transition-all ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-50/50 shadow-xs"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {stop.order}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">
                            {stop.recyclePointName}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {stop.recyclePointAddress} ({stop.recyclePointCode})
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          stop.status === "COMPLETADA"
                            ? "bg-emerald-100 text-emerald-800"
                            : stop.status === "EN_PROCESO"
                            ? "bg-amber-100 text-amber-900 animate-pulse"
                            : stop.status === "OMITIDA"
                            ? "bg-red-100 text-red-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {stop.status}
                      </span>
                    </div>

                    {/* Weight summary if completed */}
                    {stop.status === "COMPLETADA" && stop.collectedWeightKg !== null && (
                      <p className="text-xs text-emerald-700 font-semibold mt-2 pl-8.5">
                        Recolectados: {stop.collectedWeightKg} Kg
                      </p>
                    )}

                    {/* Driver interactive controls */}
                    <div className="mt-2.5 pl-8.5 flex flex-wrap gap-2">
                      {stop.status === "PENDIENTE" && (
                        <button
                          disabled={loading}
                          onClick={() => handleCheckin(stop.id)}
                          className="px-3.5 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                        >
                          Check-in GPS
                        </button>
                      )}

                      {stop.status === "EN_PROCESO" && (
                        <>
                          <button
                            onClick={() => {
                              setActiveStopId(isSelected ? null : stop.id);
                              setShowIncidentForm(false);
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            Completar Pesaje
                          </button>
                          <button
                            onClick={() => {
                              setActiveStopId(isSelected ? null : stop.id);
                              setShowIncidentForm(true);
                            }}
                            className="px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Incidencia
                          </button>
                        </>
                      )}
                    </div>

                    {/* Inline Weighing Form */}
                    {isSelected && !showIncidentForm && stop.status === "EN_PROCESO" && (
                      <div className="mt-3 pl-8.5 pt-3 border-t border-zinc-200 space-y-2">
                        <label className="text-[11px] font-bold text-zinc-700 block">
                          Kilogramos extraídos del contenedor:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.5"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            className="w-28 px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-900"
                            placeholder="Ej: 75.0"
                          />
                          <button
                            disabled={loading}
                            onClick={() => handleComplete(stop.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            Confirmar Vaciado
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Incident Form */}
                    {isSelected && showIncidentForm && stop.status === "EN_PROCESO" && (
                      <div className="mt-3 pl-8.5 pt-3 border-t border-zinc-200 space-y-2">
                        <label className="text-[11px] font-bold text-red-800 block">
                          Motivo del bloqueo o problema:
                        </label>
                        <input
                          type="text"
                          value={incidentReason}
                          onChange={(e) => setIncidentReason(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-red-300 text-xs text-zinc-900"
                          placeholder="Ej: Acceso bloqueado por vehículo mal estacionado"
                        />
                        <button
                          disabled={loading}
                          onClick={() => handleIncident(stop.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          Confirmar y Omitir Parada
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full bg-zinc-100 text-zinc-800 font-bold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
}
