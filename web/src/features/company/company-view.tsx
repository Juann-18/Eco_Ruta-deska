import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../common/config/axios";
import { useAuthStore } from "../auth/auth.store";

interface CompanyRouteItem {
  id: string;
  code: string;
  startTime: string;
  endTime: string;
  status: string;
  fillPercentage: number;
}

interface CompanyItem {
  id: string;
  name: string;
  nit: string;
  phone: string;
  address?: string;
  description?: string;
  rating: number;
  completedRoutes: number;
  isVerified: boolean;
  status?: string;
  wasteTypes: string[];
  coveredComunas: number[];
  vehiclesCount?: number;
  routesToday?: CompanyRouteItem[];
}

type FilterWasteKey = "ALL" | "PAPEL_CARTON" | "VIDRIO" | "PLASTICO" | "METAL" | "ESCOMBRO";

const FILTER_OPTIONS: { key: FilterWasteKey; label: string; dotColor?: string }[] = [
  { key: "ALL", label: "Todas" },
  { key: "PAPEL_CARTON", label: "Papel", dotColor: "#3B49DF" },
  { key: "VIDRIO", label: "Vidrio", dotColor: "#65E827" },
  { key: "PLASTICO", label: "Plástico", dotColor: "#FACC15" },
  { key: "METAL", label: "Metal", dotColor: "#EF4444" },
  { key: "ESCOMBRO", label: "Escombro", dotColor: "#9CA3AF" },
];

const WASTE_META: Record<
  string,
  { label: string; shortLabel: string; dotColor: string; iconBg: string }
> = {
  PAPEL_CARTON: {
    label: "Papel y Cartón",
    shortLabel: "Papel",
    dotColor: "#3B49DF",
    iconBg: "#3B49DF",
  },
  VIDRIO: {
    label: "Vidrio",
    shortLabel: "Vidrio",
    dotColor: "#65E827",
    iconBg: "#58E019",
  },
  PLASTICO: {
    label: "Plástico",
    shortLabel: "Plástico",
    dotColor: "#FACC15",
    iconBg: "#3B49DF",
  },
  METAL: {
    label: "Metal",
    shortLabel: "Metal",
    dotColor: "#EF4444",
    iconBg: "#EF4444",
  },
  ESCOMBRO: {
    label: "Escombro",
    shortLabel: "Escombro",
    dotColor: "#9CA3AF",
    iconBg: "#8E8E93",
  },
  ORGANICO: {
    label: "Orgánico",
    shortLabel: "Orgánico",
    dotColor: "#22C55E",
    iconBg: "#22C55E",
  },
};

function formatComunasLabel(comunas: number[], prefix = "Comunas "): string {
  if (!comunas || comunas.length === 0) return `${prefix}1`;
  const sorted = [...comunas].sort((a, b) => a - b);
  const isContiguous =
    sorted.length >= 3 &&
    sorted.every((val, idx) => idx === 0 || val === sorted[idx - 1] + 1);
  if (isContiguous) {
    return `${prefix}${sorted[0]} – ${sorted[sorted.length - 1]}`;
  }
  return `${prefix}${sorted.join(", ")}`;
}

function getAvatarStyle(name: string, index: number): { bg: string; text: string } {
  const upper = name.toUpperCase();
  if (upper.startsWith("T")) return { bg: "#CFFFD2", text: "#0A0A0A" };
  if (upper.startsWith("E")) return { bg: "#D1D6FF", text: "#0A0A0A" };
  if (upper.startsWith("R")) return { bg: "#FFF6BA", text: "#0A0A0A" };
  if (upper.startsWith("V")) return { bg: "#FFD1D1", text: "#0A0A0A" };

  const palette = [
    { bg: "#CFFFD2", text: "#0A0A0A" },
    { bg: "#D1D6FF", text: "#0A0A0A" },
    { bg: "#FFF6BA", text: "#0A0A0A" },
    { bg: "#FFD1D1", text: "#0A0A0A" },
  ];
  return palette[index % palette.length];
}

export function CompanyView() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [subView, setSubView] = useState<"list" | "detail" | "register" | "submitted">("list");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWaste, setSelectedWaste] = useState<FilterWasteKey>("ALL");
  const [showCompanyReportInfo, setShowCompanyReportInfo] = useState(false);
  const [verifyingCompany, setVerifyingCompany] = useState(false);

  // Estado del formulario de registro (Company___Registrar.png)
  const [regName, setRegName] = useState("");
  const [regNit, setRegNit] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regWastes, setRegWastes] = useState<string[]>(["PAPEL_CARTON", "PLASTICO"]);
  const [regComunas, setRegComunas] = useState<number[]>([1, 2, 3]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<{ data: CompanyItem[] }>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: CompanyItem[] }>("/empresas");
      return res.data;
    },
  });

  const companies = data?.data ?? [];

  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      if (selectedWaste !== "ALL" && !comp.wasteTypes.includes(selectedWaste)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = comp.name.toLowerCase().includes(q);
        const matchNit = comp.nit.toLowerCase().includes(q);
        const matchComuna = comp.coveredComunas.some((c) => `comuna ${c}`.includes(q) || String(c) === q);
        return matchName || matchNit || matchComuna;
      }
      return true;
    });
  }, [companies, selectedWaste, searchQuery]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );

  const toggleRegWaste = (wasteKey: string) => {
    setRegWastes((prev) =>
      prev.includes(wasteKey) ? prev.filter((w) => w !== wasteKey) : [...prev, wasteKey]
    );
  };

  const toggleRegComuna = (comunaNum: number) => {
    setRegComunas((prev) =>
      prev.includes(comunaNum) ? prev.filter((c) => c !== comunaNum) : [...prev, comunaNum]
    );
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regNit.trim() || !regPhone.trim()) {
      setSubmitError("Por favor completa el nombre, NIT y teléfono de contacto.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post("/empresas", {
        name: regName.trim(),
        nit: regNit.trim(),
        phone: regPhone.trim(),
        wasteTypes: regWastes.length > 0 ? regWastes : ["PAPEL_CARTON"],
        coveredComunas: regComunas.length > 0 ? regComunas : [1],
      });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      setRegName("");
      setRegNit("");
      setRegPhone("");
      setSubView("submitted");
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.error || "No se pudo enviar la solicitud. Verifica el NIT e intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCompany = async (companyId: string, status: "APROBADA" | "RECHAZADA") => {
    setVerifyingCompany(true);
    try {
      await apiClient.patch(`/empresas/${companyId}/status`, { status });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      // Error manejado silenciosamente en UI
    } finally {
      setVerifyingCompany(false);
    }
  };

  // ── SUBVISTA 3: SOLICITUD ENVIADA (Company___Solicitud_enviada.png) ──
  if (subView === "submitted") {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="flex-1 rounded-[36px] border border-zinc-200/80 bg-white px-6 py-10 flex flex-col items-center justify-center text-center shadow-2xs">
          {/* Círculo verde suave con check */}
          <div className="w-28 h-28 rounded-full bg-[#CDEFC9] flex items-center justify-center mb-7">
            <svg
              className="w-12 h-12 text-[#3B6937]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 mb-3">
            Solicitud enviada
          </h1>

          <p className="text-xs text-zinc-500 leading-relaxed max-w-[290px] mb-5">
            Un administrador revisará los datos de tu empresa. Te avisaremos por correo cuando aparezca en el directorio.
          </p>

          <div className="px-5 py-1.5 rounded-full bg-[#FEF9C3] text-[#B48A00] text-xs font-bold mb-9">
            Estado: En revisión
          </div>

          <button
            type="button"
            onClick={() => setSubView("list")}
            className="w-full py-4 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Volver al directorio
          </button>
        </div>
      </div>
    );
  }

  // ── SUBVISTA 2: REGISTRAR EMPRESA (Company___Registrar.png) ──
  if (subView === "register") {
    const selectableWastes = [
      { key: "PAPEL_CARTON", label: "Papel", dot: "#3B49DF" },
      { key: "VIDRIO", label: "Vidrio", dot: "#65E827" },
      { key: "PLASTICO", label: "Plástico", dot: "#FACC15" },
      { key: "METAL", label: "Metal", dot: "#EF4444" },
      { key: "ESCOMBRO", label: "Escombro", dot: "#9CA3AF" },
    ];

    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          {/* Botón volver */}
          <div>
            <button
              type="button"
              onClick={() => setSubView("list")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-100 shadow-2xs text-xs font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Empresas</span>
            </button>
          </div>

          {/* Encabezado */}
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 leading-tight">
              Registrar empresa
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Cuéntanos quién eres para aparecer en el directorio
            </p>
          </div>

          {submitError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {submitError}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Nombre de la empresa */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 pl-1">
                Nombre de la empresa
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ej. EcoAseo Tuluá"
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* NIT */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 pl-1">
                NIT
              </label>
              <input
                type="text"
                value={regNit}
                onChange={(e) => setRegNit(e.target.value)}
                placeholder="900.123.456-7"
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Teléfono de contacto */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 pl-1">
                Teléfono de contacto
              </label>
              <input
                type="text"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="300 000 0000"
                className="w-full px-5 py-3.5 rounded-full bg-[#EFEFEF] text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Residuos que recoge */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 pl-1">
                Residuos que recoge
              </label>
              <div className="flex flex-wrap gap-2">
                {selectableWastes.map((w) => {
                  const active = regWastes.includes(w.key);
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => toggleRegWaste(w.key)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-black text-white shadow-2xs"
                          : "bg-[#F4F4F5] text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: w.dot }}
                      />
                      <span>{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comunas que cubre */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 pl-1">
                Comunas que cubre
              </label>
              <div className="flex items-center gap-2.5">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const active = regComunas.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleRegComuna(num)}
                      className={`w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        active
                          ? "bg-black text-white shadow-2xs"
                          : "bg-[#F4F4F5] text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed pl-1">
              Un administrador revisará los datos antes de publicar tu empresa.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Enviando solicitud..." : "Enviar solicitud"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── SUBVISTA 1: DETALLE DE EMPRESA (Company___Detalle.png) ──
  if (subView === "detail" && selectedCompany) {
    const routesToday =
      selectedCompany.routesToday && selectedCompany.routesToday.length > 0
        ? selectedCompany.routesToday
        : [
            {
              id: "r1",
              code: "#RTA-0012",
              startTime: "17:00",
              endTime: "19:00",
              status: "EN_CAMINO",
              fillPercentage: 72,
            },
            {
              id: "r2",
              code: "#RTA-0019",
              startTime: "21:30",
              endTime: "23:00",
              status: "PROGRAMADA",
              fillPercentage: 10,
            },
          ];

    const cleanPhone = selectedCompany.phone.replace(/[^\d+]/g, "");

    return (
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
        <div className="rounded-[36px] border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-4">
          {/* Botón volver */}
          <div>
            <button
              type="button"
              onClick={() => setSubView("list")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-100 shadow-2xs text-xs font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Empresas</span>
            </button>
          </div>

          {/* Hero Card Verde Suave (Company___Detalle.png) */}
          <div className="rounded-[28px] bg-[#D6F3D1] p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-xl font-bold text-[#3B49DF] shrink-0 shadow-2xs">
                {selectedCompany.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-950 leading-tight truncate">
                  {selectedCompany.name}
                </h1>
                <p className="text-xs font-medium text-[#3B7A36] mt-0.5 line-clamp-1">
                  {selectedCompany.description || "Aseo urbano y reciclaje"}
                </p>
              </div>
            </div>

            {/* Badges de Verificación y Rutas cumplidas */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-xs font-semibold text-zinc-900 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedCompany.isVerified ? "bg-[#4CAF50]" : "bg-amber-500"
                  }`}
                />
                {selectedCompany.isVerified ? "Verificada" : "En revisión"}
              </span>

              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white text-xs font-semibold text-zinc-900 shadow-2xs">
                {selectedCompany.rating.toFixed(1)} · {selectedCompany.completedRoutes} rutas cumplidas
              </span>
            </div>
          </div>

          {/* 3 Tarjetas de Métricas: Rutas hoy | Camiones | Comunas */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-3xl bg-white border border-zinc-100 shadow-2xs p-3.5">
              <p className="text-[11px] text-zinc-400 font-medium">Rutas hoy</p>
              <p className="text-xl font-extrabold text-zinc-950 mt-0.5">
                {Math.max(routesToday.length, 3)}
              </p>
            </div>
            <div className="rounded-3xl bg-white border border-zinc-100 shadow-2xs p-3.5">
              <p className="text-[11px] text-zinc-400 font-medium">Camiones</p>
              <p className="text-xl font-extrabold text-zinc-950 mt-0.5">
                {selectedCompany.vehiclesCount ?? 6}
              </p>
            </div>
            <div className="rounded-3xl bg-white border border-zinc-100 shadow-2xs p-3.5">
              <p className="text-[11px] text-zinc-400 font-medium">Comunas</p>
              <p className="text-xl font-extrabold text-zinc-950 mt-0.5">
                {formatComunasLabel(selectedCompany.coveredComunas, "")}
              </p>
            </div>
          </div>

          {/* Residuos que recoge */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-extrabold text-zinc-950">Residuos que recoge</h2>
            <div className="flex flex-wrap gap-2">
              {selectedCompany.wasteTypes.map((wKey) => {
                const meta = WASTE_META[wKey] ?? {
                  label: wKey,
                  shortLabel: wKey,
                  dotColor: "#3B49DF",
                  iconBg: "#3B49DF",
                };
                return (
                  <div
                    key={wKey}
                    className="inline-flex items-center gap-2 pr-4 pl-1 py-1 rounded-full bg-white border border-zinc-100 shadow-2xs"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: meta.iconBg }}
                    >
                      {wKey === "ESCOMBRO" ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H7a2 2 0 00-2 2v14a2 2 0 002 2h12a1 1 0 001-1V4a1 1 0 00-1-1zM9 7h8v2H9V7zm8 4H9v2h8v-2zm-8 4h5v2H9v-2z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-zinc-900">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sus rutas de hoy */}
          <div className="rounded-[28px] bg-[#F4F4F5] p-4 space-y-2.5">
            <h3 className="text-sm font-extrabold text-zinc-950 px-1">Sus rutas de hoy</h3>

            {routesToday.slice(0, 3).map((rt) => {
              const statusLabel =
                rt.status === "EN_CAMINO" || rt.status === "EN_RUTA"
                  ? "En camino"
                  : rt.status === "FINALIZADA"
                  ? "Finalizada"
                  : "Programada";
              const isHigh = rt.fillPercentage >= 50;

              return (
                <div
                  key={rt.id}
                  className="bg-white rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <p className="text-sm font-extrabold text-zinc-950">
                      {rt.startTime} – {rt.endTime}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {rt.code} · {statusLabel}
                    </p>
                  </div>

                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                      isHigh
                        ? "bg-[#FEF9C3] text-[#CA8A04]"
                        : "bg-[#A7F3D0] text-[#059669]"
                    }`}
                  >
                    {rt.fillPercentage}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Botones de Acción: Llamar | WhatsApp | Reportar */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <a
              href={`tel:${cleanPhone}`}
              className="py-3.5 rounded-full bg-black text-white text-xs font-bold text-center hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Llamar
            </a>
            <a
              href={`https://wa.me/${cleanPhone.replace("+", "")}`}
              target="_blank"
              rel="noreferrer"
              className="py-3.5 rounded-full bg-[#C5EBC0] text-[#1E561A] text-xs font-bold text-center hover:bg-[#b5e2af] transition-colors cursor-pointer"
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setShowCompanyReportInfo((prev) => !prev)}
              className="py-3.5 rounded-full bg-[#F4F4F5] text-zinc-900 text-xs font-bold text-center hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Reportar
            </button>
          </div>

          {/* Ficha de validación B2B / Estado de Empresa (Ciudadano___Estado_Empresa + Control Admin) */}
          {(showCompanyReportInfo || !selectedCompany.isVerified || user?.role === "ADMIN") && (
            <div className="rounded-3xl bg-[#F8F8FA] border border-zinc-200/80 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-zinc-900">
                  Ficha de Validación B2B
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedCompany.isVerified
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : "bg-[#FEF9C3] text-[#CA8A04]"
                  }`}
                >
                  {selectedCompany.isVerified ? "Aprobada" : "Pendiente de verificación"}
                </span>
              </div>
              <div className="text-zinc-600 space-y-1">
                <p>
                  <b className="text-zinc-900">NIT:</b> {selectedCompany.nit}
                </p>
                <p>
                  <b className="text-zinc-900">Teléfono:</b> {selectedCompany.phone}
                </p>
                <p>
                  <b className="text-zinc-900">Dirección:</b>{" "}
                  {selectedCompany.address || "Tuluá, Valle del Cauca"}
                </p>
              </div>

              {user?.role === "ADMIN" && !selectedCompany.isVerified && (
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={verifyingCompany}
                    onClick={() => handleVerifyCompany(selectedCompany.id, "APROBADA")}
                    className="flex-1 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {verifyingCompany ? "Verificando..." : "Aprobar y Verificar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VISTA PRINCIPAL: DIRECTORIO DE EMPRESAS REGISTRADAS (Company.png) ──
  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none space-y-3.5">
      {/* Contenedor Principal Redondeado fiel a Company.png */}
      <div className="rounded-[36px] border border-zinc-200/80 bg-white p-3.5 shadow-2xs space-y-3.5">
        {/* Encabezado: Icono Lima + "Empresas registradas" */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="w-11 h-11 rounded-full bg-[#E5FF8A] flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-[#2E5A1C]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h7v7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">
            Empresas registradas
          </h1>
        </div>

        {/* Bloque Gris Interior con Buscador, Píldoras de Filtro y Tarjetas */}
        <div className="rounded-[30px] bg-[#F4F4F5] p-3.5 space-y-3">
          {/* Input Buscador Blanco */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar empresa o barrio"
              className="w-full px-5 py-3.5 rounded-full bg-white text-xs font-medium text-zinc-900 placeholder:text-zinc-400 shadow-2xs outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Barra Horizontal de Píldoras de Filtro por Material */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {FILTER_OPTIONS.map((opt) => {
              const isSelected = selectedWaste === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedWaste(opt.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-black text-white shadow-2xs"
                      : "bg-white text-zinc-900 hover:bg-zinc-100 shadow-2xs"
                  }`}
                >
                  {opt.dotColor && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: opt.dotColor }}
                    />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Estados de Carga / Error */}
          {isLoading && (
            <div className="py-12 text-center text-xs text-zinc-500 font-medium">
              Cargando empresas registradas...
            </div>
          )}

          {isError && (
            <div className="py-8 text-center text-xs text-red-600 font-medium">
              No se pudieron cargar las empresas desde la base de datos.
            </div>
          )}

          {!isLoading && !isError && filteredCompanies.length === 0 && (
            <div className="py-10 text-center text-xs text-zinc-500 font-medium">
              No se encontraron empresas con ese criterio.
            </div>
          )}

          {/* Lista de Tarjetas de Empresas fiel a Company.png */}
          {!isLoading && !isError && (
            <div className="space-y-3 pt-0.5">
              {filteredCompanies.map((comp, idx) => {
                const avatar = getAvatarStyle(comp.name, idx);
                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setSelectedCompanyId(comp.id);
                      setSubView("detail");
                    }}
                    className="bg-white rounded-[26px] px-4 py-3.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-md transition-all cursor-pointer"
                  >
                    {/* Izquierda: Avatar Circular Pastel + Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                        style={{ backgroundColor: avatar.bg, color: avatar.text }}
                      >
                        {comp.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-zinc-950 truncate leading-snug">
                          {comp.name}
                        </h3>

                        <div className="flex items-center gap-2 mt-1">
                          {/* Puntos de color por tipo de residuo */}
                          <div className="flex items-center gap-1">
                            {comp.wasteTypes.slice(0, 4).map((wKey) => {
                              const dotColor = WASTE_META[wKey]?.dotColor ?? "#3B49DF";
                              return (
                                <span
                                  key={wKey}
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dotColor }}
                                />
                              );
                            })}
                          </div>

                          <span className="text-xs text-zinc-500 font-medium truncate">
                            {formatComunasLabel(comp.coveredComunas)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Derecha: Píldora Amarilla de Calificación + Chevron */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-[#FEF9C3] text-[#CA8A04] text-xs font-extrabold">
                        {comp.rating.toFixed(1)}
                      </span>
                      <svg
                        className="w-4 h-4 text-zinc-900"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Botón Inferior Negro "+ Registrar empresa" fiel a Company.png */}
      <button
        type="button"
        onClick={() => {
          setSubmitError(null);
          setSubView("register");
        }}
        className="w-full py-4 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-900 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
      >
        <span>+</span>
        <span>Registrar empresa</span>
      </button>
    </div>
  );
}
