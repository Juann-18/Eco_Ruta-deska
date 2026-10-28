import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../auth/auth.store";
import { apiClient } from "../../common/config/axios";
import { getReports, updateReportStatus } from "../reports/api/reports.api";
import type {
  CitizenReportReason,
  CitizenReportStatus,
} from "../reports/types/reports.types";
import type { NavTab } from "../../common/layouts/AppShell";

interface ProfileViewProps {
  selectedComuna: number;
  onSelectComuna?: (comuna: number) => void;
  onOpenLocationModal: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onRequireAuth?: () => void;
}

interface StatisticsSummary {
  totalRecycledKg: number;
  byWasteType: Record<string, number>;
  points: {
    total: number;
    active: number;
    critical: number;
  };
  routes: {
    total: number;
    completed: number;
    inProgress: number;
    scheduled: number;
    completionRate: number;
  };
  reports: {
    total: number;
    pending: number;
    inReview: number;
    resolved: number;
    resolutionRate: number;
  };
  companies: {
    total: number;
    verified: number;
    pending: number;
  };
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

const FAQ_ITEMS = [
  {
    q: "¿Cómo sé a qué hora pasa el camión?",
    a: "En Horarios ves la próxima recolección de tu sector, con hora estimada, empresa y capacidad actual del camión.",
  },
  {
    q: "¿Qué residuos puedo entregar?",
    a: "Puedes separar Papel y Cartón, Vidrio, Plástico, Metal y Escombros consultando las guías de separación en la pestaña de Inicio.",
  },
  {
    q: "¿Qué significa el porcentaje de capacidad?",
    a: "Indica qué tan lleno va el camión recolector o el contenedor inteligente según los sensores IoT en tiempo real.",
  },
  {
    q: "¿Cómo reporto un problema con una ruta?",
    a: "Selecciona el contenedor en el mapa de Rutas, toca 'Reportar un problema', adjunta una foto opcional y recibirás un folio (#RP-xxxx).",
  },
  {
    q: "¿Puedo cambiar mi localidad?",
    a: "Sí, puedes cambiar tu Comuna (1 a 6) desde el selector superior, desde Configuración o en Editar perfil.",
  },
  {
    q: "¿Qué empresas recogen en mi barrio?",
    a: "En la pestaña de Empresas encuentras el directorio verificado con las comunas que cubre cada operador y sus rutas del día.",
  },
];

const WASTE_STAT_META: Array<{ key: string; label: string; color: string }> = [
  { key: "PAPEL_CARTON", label: "Papel y Cartón", color: "#3B49DF" },
  { key: "VIDRIO", label: "Vidrio", color: "#58E019" },
  { key: "PLASTICO", label: "Plástico", color: "#FACC15" },
  { key: "METAL", label: "Metal", color: "#EF4444" },
  { key: "ESCOMBRO", label: "Escombro", color: "#9CA3AF" },
];

export function ProfileView({
  selectedComuna,
  onSelectComuna,
  onOpenLocationModal: _onOpenLocationModal,
  onNavigateToTab,
  onRequireAuth,
}: ProfileViewProps) {
  const { user, logout, updateProfile } = useAuthStore();
  const queryClient = useQueryClient();

  const [subView, setSubView] = useState<
    "main" | "info" | "faq" | "edit" | "settings" | "reports" | "stats"
  >("main");

  // Filtro de Mis Reportes (Ciudadano___Mis_Reportes)
  const [reportFilter, setReportFilter] = useState<CitizenReportStatus | "ALL">("ALL");
  const [folioSearch, setFolioSearch] = useState("");

  // Estado de Editar Perfil (Profile___Editar_perfil.png)
  const [editName, setEditName] = useState(user?.name || "Alex");
  const [editEmail, setEditEmail] = useState(user?.email || "alex@correo.com");
  const [editPhone, setEditPhone] = useState(user?.phone || "300 000 0000");
  const [editComuna, setEditComuna] = useState<number>(user?.comuna || selectedComuna || 1);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estado de Configuración (Profile___Configuraci_n.png)
  const [notifRoutes, setNotifRoutes] = useState(true);
  const [truckNoticeMins, setTruckNoticeMins] = useState<number>(15);
  const [remindNightBefore, setRemindNightBefore] = useState(false);

  // Estado de Preguntas Frecuentes (Profile___Preguntas_frecuentes.png)
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["citizen-reports", reportFilter, folioSearch],
    queryFn: () =>
      getReports({
        status: reportFilter === "ALL" ? undefined : reportFilter,
        search: folioSearch.trim() || undefined,
      }),
    enabled: subView === "reports",
  });

  const { data: statsData, isLoading: loadingStats } = useQuery<{
    data: StatisticsSummary;
  }>({
    queryKey: ["statistics-summary"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: StatisticsSummary }>(
        "/estadisticas/resumen"
      );
      return res.data;
    },
    enabled: subView === "stats",
  });

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
      setEditPhone(user.phone || "300 000 0000");
      setEditComuna(user.comuna || selectedComuna || 1);
    }
  }, [user, selectedComuna]);

  const handleLogout = async () => {
    await logout();
    if (onRequireAuth) {
      onRequireAuth();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSavedSuccess(false);
    try {
      await updateProfile({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        comuna: editComuna,
      });
      if (onSelectComuna) {
        onSelectComuna(editComuna);
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setSubView("main");
      }, 700);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResolveReport = async (id: string, status: CitizenReportStatus) => {
    await updateReportStatus(id, status);
    queryClient.invalidateQueries({ queryKey: ["citizen-reports"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const BackToProfileButton = () => (
    <div>
      <button
        type="button"
        onClick={() => setSubView("main")}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-100 shadow-2xs text-xs font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Perfil</span>
      </button>
    </div>
  );

  // ── SUBVISTA 1: EDITAR PERFIL (Profile___Editar_perfil.png) ──
  if (subView === "edit") {
    const initialLetter = (editName.trim().charAt(0) || "A").toUpperCase();

    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <BackToProfileButton />

          <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 leading-tight">
            Editar perfil
          </h1>

          {/* Avatar Circular Lima + Cambiar foto */}
          <div className="flex flex-col items-center pt-1 pb-2 space-y-2.5">
            <div className="w-24 h-24 rounded-full bg-[#E5FF8A] flex items-center justify-center text-4xl font-bold text-zinc-950">
              {initialLetter}
            </div>
            <button
              type="button"
              onClick={() => {
                // Ciclo rápido de inicial o actualización
              }}
              className="px-4 py-1.5 rounded-full bg-white border border-zinc-100 shadow-2xs text-xs font-medium text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cambiar foto
            </button>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-[#DCFCE7] text-[#15803D] text-xs font-bold text-center">
              Cambios guardados en tu perfil
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            {/* Nombre completo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-500 pl-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-950 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Correo electrónico */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-500 pl-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-950 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-500 pl-1">
                Teléfono
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-950 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Localidad */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-500 pl-1">
                Localidad
              </label>
              <button
                type="button"
                onClick={() => setEditComuna((prev) => (prev % 6) + 1)}
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-950 flex items-center justify-between hover:bg-zinc-200/80 transition-colors cursor-pointer"
              >
                <span>Comuna {editComuna}</span>
                <svg
                  className="w-4 h-4 text-zinc-800"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-4 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── SUBVISTA 2: CONFIGURACIÓN (Profile___Configuraci_n.png) ──
  if (subView === "settings") {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <BackToProfileButton />

          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 leading-tight">
              Configuración
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Ajusta tus avisos y preferencias
            </p>
          </div>

          <div className="rounded-[30px] bg-[#F8F8FA] p-3 space-y-2.5">
            {/* 1. Notificaciones de rutas */}
            <div className="bg-white rounded-[24px] px-4 py-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-xs font-extrabold text-zinc-950">
                  Notificaciones de rutas
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Avisos de nuevas recolecciones
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifRoutes((prev) => !prev)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
                  notifRoutes ? "bg-[#58C268] justify-end" : "bg-zinc-300 justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* 2. Aviso antes del camión */}
            <button
              type="button"
              onClick={() =>
                setTruckNoticeMins((prev) => (prev === 15 ? 30 : prev === 30 ? 5 : 15))
              }
              className="w-full bg-white rounded-[24px] px-4 py-3.5 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-zinc-50/70 transition-colors"
            >
              <span className="text-xs font-extrabold text-zinc-950">
                Aviso antes del camión
              </span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#EFEFEF] text-xs font-semibold text-zinc-900">
                  {truckNoticeMins} min
                </span>
                <svg
                  className="w-4 h-4 text-zinc-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 3. Recordar separar residuos */}
            <div className="bg-white rounded-[24px] px-4 py-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-xs font-extrabold text-zinc-950">
                  Recordar separar residuos
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  La noche anterior
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemindNightBefore((prev) => !prev)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
                  remindNightBefore ? "bg-[#58C268] justify-end" : "bg-zinc-300 justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* 4. Localidad */}
            <button
              type="button"
              onClick={() => {
                const next = (selectedComuna % 6) + 1;
                if (onSelectComuna) onSelectComuna(next);
                updateProfile({ comuna: next });
              }}
              className="w-full bg-white rounded-[24px] px-4 py-3.5 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-zinc-50/70 transition-colors"
            >
              <span className="text-xs font-extrabold text-zinc-950">Localidad</span>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-[#EFEFEF] text-xs font-semibold text-zinc-900">
                  Comuna {selectedComuna}
                </span>
                <svg
                  className="w-4 h-4 text-zinc-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 5. Idioma */}
            <div className="bg-white rounded-[24px] px-4 py-3.5 flex items-center justify-between shadow-2xs">
              <span className="text-xs font-extrabold text-zinc-950">Idioma</span>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-[#EFEFEF] text-xs font-semibold text-zinc-900">
                  Español
                </span>
                <svg
                  className="w-4 h-4 text-zinc-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBVISTA 3: MÁS INFORMACIÓN (Profile___M_s_informaci_n.png) ──
  if (subView === "info") {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <BackToProfileButton />

          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 leading-tight">
              Más información
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Todo sobre EcoRuta</p>
          </div>

          {/* Tarjeta Verde Pastel: ¿Qué es EcoRuta? */}
          <div className="rounded-[28px] bg-[#D6F3D1] p-5 space-y-2">
            <h2 className="text-base font-extrabold text-zinc-950">
              ¿Qué es EcoRuta?
            </h2>
            <p className="text-xs text-zinc-700 leading-relaxed">
              EcoRuta te muestra cuándo y dónde pasa el camión de recolección en Tuluá, para que separes y entregues tus residuos a tiempo.
            </p>
          </div>

          {/* Bloque Cómo funciona */}
          <div className="rounded-[28px] bg-[#F8F8FA] p-4 space-y-2.5">
            <h3 className="text-sm font-extrabold text-zinc-950 px-1">
              Cómo funciona
            </h3>

            {[
              {
                num: 1,
                title: "Consulta tu ruta",
                desc: "Mira la próxima recolección de tu sector.",
              },
              {
                num: 2,
                title: "Separa tus residuos",
                desc: "Usa los colores de cada categoría.",
              },
              {
                num: 3,
                title: "Sácalos a tiempo",
                desc: "Te avisamos antes de que llegue el camión.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-2xl p-3.5 flex items-center gap-3.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {step.num}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-zinc-950">{step.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Botones Inferiores: Llamar a soporte | Escribir correo */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <a
              href="tel:+576022241100"
              className="py-3.5 rounded-full bg-black text-white text-xs font-bold text-center hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Llamar a soporte
            </a>
            <a
              href="mailto:soporte@ecoruta.gov.co"
              className="py-3.5 rounded-full bg-[#EFEFEF] text-zinc-950 text-xs font-bold text-center hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Escribir correo
            </a>
          </div>

          <p className="text-[11px] text-zinc-400 text-center pt-1">
            EcoRuta · versión 1.0 · Tuluá, Valle del Cauca
          </p>
        </div>
      </div>
    );
  }

  // ── SUBVISTA 4: PREGUNTAS FRECUENTES (Profile___Preguntas_frecuentes.png) ──
  if (subView === "faq") {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <BackToProfileButton />

          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 leading-tight">
              Preguntas frecuentes
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Lo que más nos preguntan</p>
          </div>

          <div className="rounded-[30px] bg-[#F8F8FA] p-3 space-y-2.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  className="bg-white rounded-[24px] p-4 shadow-2xs cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-extrabold text-zinc-950 leading-snug">
                      {item.q}
                    </span>
                    <svg
                      className="w-4 h-4 text-zinc-900 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      {isOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      )}
                    </svg>
                  </div>

                  {isOpen && (
                    <p className="text-xs text-zinc-500 leading-relaxed mt-2.5">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── SUBVISTA 5: ESTADÍSTICAS E IMPACTO AMBIENTAL (Fase 6 - /api/estadisticas/resumen) ──
  if (subView === "stats") {
    const summary = statsData?.data;

    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <BackToProfileButton />

          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 leading-tight">
              Impacto y Métricas
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Balance consolidado de recolección y reciclaje en Tuluá
            </p>
          </div>

          {loadingStats && (
            <div className="py-12 text-center text-xs text-zinc-500 font-medium">
              Calculando estadísticas municipales...
            </div>
          )}

          {!loadingStats && summary && (
            <>
              {/* Hero Card Verde: Total Kg Reciclados */}
              <div className="rounded-[28px] bg-[#D6F3D1] p-5 space-y-2">
                <p className="text-xs font-bold text-[#2E5A1C]">
                  Material aprovechado acumulado
                </p>
                <p className="text-3xl font-extrabold text-zinc-950 tracking-tight">
                  {summary.totalRecycledKg.toLocaleString("es-CO")} Kg
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-3 py-1 rounded-full bg-white text-[11px] font-bold text-zinc-900">
                    Cumplimiento rutas: {summary.routes.completionRate}%
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white text-[11px] font-bold text-zinc-900">
                    Resolución folios: {summary.reports.resolutionRate}%
                  </span>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-3xl bg-[#F8F8FA] p-3.5 text-center">
                  <p className="text-[11px] text-zinc-500 font-medium">Contenedores</p>
                  <p className="text-lg font-extrabold text-zinc-950 mt-0.5">
                    {summary.points.active}
                  </p>
                  <p className="text-[10px] text-red-600 font-bold">
                    {summary.points.critical} críticos
                  </p>
                </div>
                <div className="rounded-3xl bg-[#F8F8FA] p-3.5 text-center">
                  <p className="text-[11px] text-zinc-500 font-medium">Rutas hoy</p>
                  <p className="text-lg font-extrabold text-zinc-950 mt-0.5">
                    {summary.routes.total}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    {summary.routes.inProgress} en camino
                  </p>
                </div>
                <div className="rounded-3xl bg-[#F8F8FA] p-3.5 text-center">
                  <p className="text-[11px] text-zinc-500 font-medium">Empresas</p>
                  <p className="text-lg font-extrabold text-zinc-950 mt-0.5">
                    {summary.companies.verified}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold">
                    verificadas
                  </p>
                </div>
              </div>

              {/* Desglose por tipo de residuo */}
              <div className="rounded-[28px] bg-[#F8F8FA] p-4 space-y-2.5">
                <h3 className="text-xs font-extrabold text-zinc-950 px-1">
                  Volumen estimado por categoría (Kg)
                </h3>
                {WASTE_STAT_META.map((item) => {
                  const kg = summary.byWasteType[item.key] ?? 0;
                  return (
                    <div
                      key={item.key}
                      className="bg-white rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-bold text-zinc-900">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-zinc-950">
                        {kg} Kg
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── SUBVISTA 6: MIS REPORTES CIUDADANOS (Ciudadano___Mis_Reportes) ──
  if (subView === "reports") {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <BackToProfileButton />

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
              className="w-full px-4 py-2.5 rounded-full bg-[#F4F4F5] text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/10"
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
          <div className="space-y-2.5 pb-2">
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

                    {(user?.role === "ADMIN" || user?.role === "RECOLECTOR") &&
                      rep.status !== "RESUELTO" && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleResolveReport(rep.id, "RESUELTO")}
                            className="px-3 py-1.5 rounded-full bg-black text-white text-[11px] font-bold hover:bg-zinc-800 cursor-pointer"
                          >
                            Marcar como Resuelto
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // ── VISTA PRINCIPAL DE PERFIL (Profile.png) ──
  const firstName = user?.name?.trim().split(" ")[0] || "Alex";

  const menuRows = [
    {
      id: "routes",
      label: "Rutas",
      onClick: () => onNavigateToTab && onNavigateToTab("schedule"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-[11px] font-bold rotate-45">
          <span className="-rotate-45">↱</span>
        </span>
      ),
    },
    {
      id: "reports",
      label: "Mis Reportes",
      onClick: () => setSubView("reports"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          !
        </span>
      ),
    },
    {
      id: "stats",
      label: "Estadísticas e Impacto",
      onClick: () => setSubView("stats"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          ≡
        </span>
      ),
    },
    {
      id: "info",
      label: "Mas Información",
      onClick: () => setSubView("info"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          i
        </span>
      ),
    },
    {
      id: "faq",
      label: "Preguntas Frecuentes",
      onClick: () => setSubView("faq"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          ?
        </span>
      ),
    },
    {
      id: "edit",
      label: "Editar tu perfil",
      onClick: () => setSubView("edit"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          ✎
        </span>
      ),
    },
    {
      id: "settings",
      label: "Configuración",
      onClick: () => setSubView("settings"),
      icon: (
        <span className="w-6 h-6 rounded-md bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          ⚙
        </span>
      ),
    },
    {
      id: "logout",
      label: "Cerrar Sesión",
      onClick: handleLogout,
      icon: (
        <span className="w-6 h-6 rounded-full bg-zinc-400/80 text-white flex items-center justify-center text-xs font-bold">
          →
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
      <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-5">
        {/* Encabezado fiel a Profile.png */}
        <div>
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-[#E5FF8A] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-zinc-900"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>

            {user?.role && (
              <span className="px-3 py-1 rounded-full bg-[#F4F4F5] text-zinc-800 text-[11px] font-bold">
                {user.role}
              </span>
            )}
          </div>

          <h1 className="text-[28px] font-extrabold tracking-tight text-zinc-950 mt-3 leading-tight">
            Hey, {firstName}!
          </h1>
          <p className="text-xs text-zinc-700 font-medium mt-0.5">
            Completa tu perfil
          </p>
        </div>

        {/* Contenedor Gris Redondeado con Píldoras Blancas fiel a Profile.png */}
        <div className="rounded-[32px] bg-[#F8F8FA] p-3 space-y-2.5">
          {menuRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={row.onClick}
              className="w-full bg-white rounded-full px-5 py-4 flex items-center justify-between text-left shadow-2xs hover:bg-zinc-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                {row.icon}
                <span className="text-sm font-medium text-zinc-950">{row.label}</span>
              </div>
              <svg
                className="w-4 h-4 text-zinc-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
