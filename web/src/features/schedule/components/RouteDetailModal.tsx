import { useState } from "react";
import type { RouteDetail } from "../types/schedule.types";
import { checkinStop, completeStop, reportStopIncident } from "../api/schedule.api";
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
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const isDriver = user?.role === "RECOLECTOR" || user?.role === "ADMIN";

  const handleCheckin = async (stopId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      await checkinStop(stopId);
      setMessage("Check-in GPS registrado. Parada en proceso.");
      onRefresh();
    } catch {
      setMessage("Error al realizar el check-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (stopId: string) => {
    const val = parseFloat(weightKg);
    if (isNaN(val) || val < 0) {
      alert("Por favor ingresa un peso válido en Kg");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await completeStop(stopId, val);
      setMessage(`¡Pesaje registrado (${val} Kg)! Contenedor vaciado a 0%.`);
      setActiveStopId(null);
      onRefresh();
    } catch {
      setMessage("Error al registrar pesaje.");
    } finally {
      setLoading(false);
    }
  };

  const handleIncident = async (stopId: string) => {
    if (!incidentReason.trim()) {
      alert("Describe el motivo de la incidencia.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await reportStopIncident(stopId, incidentReason);
      setMessage("Incidencia registrada. Parada marcada como omitida.");
      setShowIncidentForm(false);
      setIncidentReason("");
      setActiveStopId(null);
      onRefresh();
    } catch {
      setMessage("Error al reportar la incidencia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-zinc-900">{route.code}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {route.status}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{route.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {message && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {message}
            </div>
          )}

          {/* Vehicle info pill */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Operador: <b className="text-zinc-900">{route.companyName}</b></span>
              <span className="font-mono font-bold bg-zinc-900 text-white px-2 py-0.5 rounded">
                {route.vehiclePlate}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Capacidad acumulada:</span>
                <span className="font-bold text-zinc-900">{route.currentLoadKg} / {route.maxCapacityKg} Kg ({route.fillPercentage}%)</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min(route.fillPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stoppings list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Paradas de Recolección ({route.collections.length})
              </h3>
              {isDriver && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-900 text-white rounded-full">
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
                          <p className="text-xs font-bold text-zinc-900">{stop.recyclePointName}</p>
                          <p className="text-[11px] text-zinc-500">{stop.recyclePointAddress} ({stop.recyclePointCode})</p>
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
                        ✓ Recolectados: {stop.collectedWeightKg} Kg
                      </p>
                    )}

                    {/* Driver interactive controls */}
                    <div className="mt-2.5 pl-8.5 flex flex-wrap gap-2">
                      {stop.status === "PENDIENTE" && (
                        <button
                          disabled={loading}
                          onClick={() => handleCheckin(stop.id)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-black transition-colors"
                        >
                          📍 Check-in GPS
                        </button>
                      )}

                      {stop.status === "EN_PROCESO" && (
                        <>
                          <button
                            onClick={() => {
                              setActiveStopId(isSelected ? null : stop.id);
                              setShowIncidentForm(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            ⚖️ Completar Pesaje
                          </button>
                          <button
                            onClick={() => {
                              setActiveStopId(isSelected ? null : stop.id);
                              setShowIncidentForm(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                          >
                            ⚠️ Incidencia
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
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
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
                          className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
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
            className="w-full py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs hover:bg-zinc-200 transition-colors"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
}
