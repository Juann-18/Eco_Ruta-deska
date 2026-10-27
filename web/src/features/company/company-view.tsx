import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../common/config/axios";

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
  wasteTypes: string[];
  coveredComunas: number[];
}

const WASTE_LABELS: Record<string, string> = {
  PAPEL_CARTON: "Papel y Cartón",
  VIDRIO: "Vidrio",
  PLASTICO: "Plástico",
  METAL: "Metal",
  ESCOMBRO: "Escombro",
  ORGANICO: "Orgánico",
};

export function CompanyView() {
  const { data, isLoading, isError } = useQuery<{ data: CompanyItem[] }>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: CompanyItem[] }>("/empresas");
      return res.data;
    },
  });

  const companies = data?.data ?? [];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-lg mx-auto w-full">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            Directorio B2B
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-0.5">
            Empresas Gestoras
          </h1>
        </div>
        <button
          onClick={() => alert("Formulario de registro B2B para verificación de NIT (Fase 6)")}
          className="px-3 py-2 rounded-xl bg-black text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          + Registrar Empresa
        </button>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Empresas y cooperativas autorizadas con rutas de recolección activas en el municipio de Tuluá.
      </p>

      {isLoading && (
        <div className="py-10 text-center text-xs text-zinc-500 font-medium">
          Cargando empresas registradas...
        </div>
      )}

      {isError && (
        <div className="py-8 text-center text-xs text-red-600 font-medium">
          No se pudieron cargar las empresas desde la base de datos.
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && (
        <div className="space-y-3">
          {companies.map((comp) => (
            <div
              key={comp.id}
              className="p-4 rounded-2xl border bg-white border-[var(--border)] space-y-3 hover:border-black transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-[var(--foreground)]">{comp.name}</h3>
                    {comp.isVerified && (
                      <span className="text-emerald-600 text-xs font-bold" title="Empresa Verificada">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-0.5">
                    NIT: {comp.nit}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold text-amber-900">
                  <span>⭐</span> {comp.rating.toFixed(1)}
                </div>
              </div>

              {/* Waste types pills */}
              <div className="flex flex-wrap gap-1.5">
                {comp.wasteTypes.map((w, wIdx) => (
                  <span
                    key={wIdx}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--muted)] text-zinc-700"
                  >
                    {WASTE_LABELS[w] ?? w}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)] text-[var(--muted-foreground)]">
                <span>{comp.completedRoutes} rutas completadas</span>
                <span className="font-semibold text-zinc-900">
                  Comunas {comp.coveredComunas.join(", ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
