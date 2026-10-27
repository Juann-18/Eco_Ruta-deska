import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../auth/auth.store";
import { getReports, updateReportStatus } from "../reports/api/reports.api";
import type {
  CitizenReportReason,
  CitizenReportStatus,
} from "../reports/types/reports.types";
import type { NavTab } from "../../common/layouts/AppShell";

interface ProfileViewProps {
  selectedComuna: number;
  onOpenLocationModal: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onRequireAuth?: () => void;
}

const REASON_LABELS: Record<CitizenReportReason, string> = {
  CONTENEDOR_LLENO: "Contenedor lleno",
  DANADO: "Dañado",
  MAL_OLOR: "Mal olor",
  RESIDUOS_FUERA: "Residuos fuera",
  CAMION_NO_PASO: "Camión no pasó",
  OTRO: "Otro",
};

const STATUS_BADGE: Record<
  CitizenReportStatus,
  { label: string; bg: string; text: string }
> = {
  PENDIENTE: { label: "Pendiente", bg: "bg-zinc-200", text: "text-zinc-800" },
  EN_REVISION: {
    label: "En revisión",
    bg: "bg-[#FEF9C3]",
    text: "text-[#CA8A04]",
  },
  RESUELTO: {
    label: "Resuelto",
    bg: "bg-[#DCFCE7]",
    text: "text-[#15803D]",
  },
  DESCARTADO: {
    label: "Descartado",
    bg: "bg-red-100",
    text: "text-red-700",
  },
};

export function ProfileView({
  selectedComuna,
  onOpenLocationModal,
  onNavigateToTab,
  onRequireAuth,
}: ProfileViewProps) {
  const { user, logout, updateProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<
    "info" | "faq" | "edit" | "settings" | "reports" | null
  >(null);

  // Filtro de Mis Reportes (Ciudadano___Mis_Reportes)
  const [reportFilter, setReportFilter] = useState<CitizenReportStatus | "ALL">("ALL");
  const [folioSearch, setFolioSearch] = useState("");

  // Edit form state
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["citizen-reports", reportFilter, folioSearch],
    queryFn: () =>
      getReports({
        status: reportFilter === "ALL" ? undefined : reportFilter,
        search: folioSearch.trim() || undefined,
      }),
    enabled: activeModal === "reports",
  });

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone || "");
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    if (onRequireAuth) {
      onRequireAuth();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ name: editName, phone: editPhone });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setActiveModal(null);
    }, 800);
  };

  const handleResolveReport = async (id: string, status: CitizenReportStatus) => {
    await updateReportStatus(id, status);
    queryClient.invalidateQueries({ queryKey: ["citizen-reports"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  // ── Subvista completa: Mis Reportes Ciudadanos (Ciudadano___Mis_Reportes) ──
  if (activeModal === "reports") {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-5 py-3 space-y-4 select-none">
        <div>
          <button
            onClick={() => setActiveModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
          >
            <span>‹</span>
            <span>Perfil</span>
          </button>
        </div>

        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-black">
            Mis Reportes
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Seguimiento de folios radicados ante las empresas de aseo
          </p>
        </div>

        {/* Buscador por número de folio */}
        <div>
          <input
            type="text"
            placeholder="Buscar por folio (ej. #RP-0231 o #REP-2026)..."
            value={folioSearch}
            onChange={(e) => setFolioSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#F4F4F5] text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        {/* Tabs de estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: "Todos" },
            { id: "EN_REVISION", label: "En revisión" },
            { id: "PENDIENTE", label: "Pendientes" },
            { id: "RESUELTO", label: "Resueltos" },
          ].map((tab) => {
            const active = reportFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  active
                    ? "bg-black text-white"
                    : "bg-[#F4F4F5] text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Lista de folios */}
        <div className="space-y-2.5 pb-6">
          {loadingReports && (
            <div className="py-10 text-center text-xs text-zinc-500 font-medium">
              Cargando reportes ciudadanos...
            </div>
          )}

          {!loadingReports && reports.length === 0 && (
            <div className="py-10 px-4 text-center rounded-3xl bg-[#F8F8FA] space-y-2">
              <p className="text-xs font-bold text-zinc-800">
                No se encontraron reportes con este filtro
              </p>
              <p className="text-[11px] text-zinc-500">
                Puedes reportar cualquier novedad seleccionando un contenedor en el mapa.
              </p>
            </div>
          )}

          {!loadingReports &&
            reports.map((rep) => {
              const badge = STATUS_BADGE[rep.status] ?? STATUS_BADGE.EN_REVISION;
              return (
                <div
                  key={rep.id}
                  className="bg-[#F8F8FA] rounded-3xl p-4 space-y-2.5 border border-zinc-200/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-xs font-extrabold text-zinc-900">
                        {rep.folio}
                      </span>
                      {rep.recyclePointCode && (
                        <span className="px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-[11px] font-bold text-zinc-700">
                          {rep.recyclePointCode}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-extrabold text-zinc-900">
                      {REASON_LABELS[rep.reason] ?? rep.reason}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                      {rep.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-200/60">
                    <span>{rep.address || "Tuluá, Valle"}</span>
                    <span>{rep.companyName}</span>
                  </div>

                  {/* Si es ADMIN o RECOLECTOR, permitir marcar como Resuelto */}
                  {(user?.role === "ADMIN" || user?.role === "RECOLECTOR") &&
                    rep.status !== "RESUELTO" && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handleResolveReport(rep.id, "RESUELTO")}
                          className="px-3 py-1.5 rounded-full bg-black text-white text-[11px] font-bold hover:bg-zinc-800 cursor-pointer"
                        >
                          ✓ Marcar como Resuelto
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-3 pb-24 max-w-[420px] mx-auto w-full select-none">
      {/* Profile Header matching Profile.png */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-[#D9F99D] flex items-center justify-center shadow-xs">
            <svg
              className="w-6 h-6 text-black"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {user?.role && (
            <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-bold">
              {user.role}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-black mt-2.5">
          Hey, {user?.name?.split(" ")[0] || "Ciudadano"}!
        </h1>
        <p className="text-xs text-zinc-500 font-medium">
          {user?.email || "Completa tu perfil"}
        </p>
      </div>

      {/* Menu Action List matching Profile.png + Mis Reportes */}
      <div className="space-y-2.5">
        {/* 1. Rutas */}
        <button
          onClick={() => onNavigateToTab && onNavigateToTab("schedule")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              🧭
            </span>
            <span className="font-bold text-sm text-zinc-900">Rutas</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 2. Mis Reportes (Fase 5) */}
        <button
          onClick={() => setActiveModal("reports")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 text-sm">
              📢
            </span>
            <span className="font-bold text-sm text-zinc-900">Mis Reportes</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 3. Mas Información */}
        <button
          onClick={() => setActiveModal("info")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ℹ️
            </span>
            <span className="font-bold text-sm text-zinc-900">Mas Información</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 4. Preguntas Frecuentes */}
        <button
          onClick={() => setActiveModal("faq")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ❓
            </span>
            <span className="font-bold text-sm text-zinc-900">Preguntas Frecuentes</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 5. Editar tu perfil */}
        <button
          onClick={() => setActiveModal("edit")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ✏️
            </span>
            <span className="font-bold text-sm text-zinc-900">Editar tu perfil</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 6. Configuración */}
        <button
          onClick={() => setActiveModal("settings")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ⚙️
            </span>
            <span className="font-bold text-sm text-zinc-900">Configuración</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 7. Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-red-50 hover:border-red-200 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center text-red-600 text-sm">
              🚪
            </span>
            <span className="font-bold text-sm text-red-600">Cerrar Sesión</span>
          </div>
          <span className="text-red-400 font-bold text-base">›</span>
        </button>
      </div>

      {/* Modals for subpantallas */}
      {/* 1. Modal Más Información */}
      {activeModal === "info" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-black">Acerca de EcoRuta Tuluá</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              EcoRuta es la plataforma de gestión logística y reciclaje inteligente de Tuluá, Valle del Cauca.
              Monitorea en tiempo real los sensores IoT en las 6 comunas, optimiza las rutas de camiones y conecta a los ciudadanos con empresas recolectoras autorizadas.
            </p>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
              🌱 Desarrollado para Tuluá Verde y la Alcaldía Municipal.
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal Preguntas Frecuentes */}
      {activeModal === "faq" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-black">Preguntas Frecuentes</h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-zinc-900">¿Cómo sé si un contenedor está lleno?</p>
                <p className="text-zinc-600 mt-0.5">En el mapa de Rutas (🔀), los pines con más del 80% pulsan en color rojo.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900">¿Cuándo pasa el camión por mi comuna?</p>
                <p className="text-zinc-600 mt-0.5">Consulta la pestaña de Rutas (🗑️) para ver los horarios del día y la semana.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900">¿Cómo hago seguimiento a un reporte?</p>
                <p className="text-zinc-600 mt-0.5">En tu Perfil, entra a "Mis Reportes" para buscar por número de folio (#RP-xxxx).</p>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal Editar Perfil */}
      {activeModal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
          >
            <h3 className="font-extrabold text-lg text-black">Editar Perfil</h3>
            {savedSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                ✓ Guardado exitosamente
              </div>
            )}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-zinc-700">Nombre completo</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-black"
                required
              />
            </div>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-zinc-700">Teléfono</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-black"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold text-xs"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Modal Configuración */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-black">Configuración</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Notificaciones de camión cercano</span>
                <input type="checkbox" defaultChecked className="toggle cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <span>Alertas de contenedor desbordado</span>
                <input type="checkbox" defaultChecked className="toggle cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <span>Comuna de interés</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    onOpenLocationModal();
                  }}
                  className="font-bold text-emerald-700 underline"
                >
                  Comuna {selectedComuna} ›
                </button>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
