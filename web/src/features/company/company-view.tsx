export function CompanyView() {
  const companies = [
    {
      name: "EcoAseo Tuluá S.A.S.",
      nit: "900.123.456-7",
      rating: 4.9,
      completedRoutes: 342,
      isVerified: true,
      wasteTypes: ["Plástico", "Vidrio", "Papel y Cartón"],
      comunas: [1, 2, 3, 4],
      phone: "+57 (602) 224-5500",
    },
    {
      name: "Recicladores del Valle Central",
      nit: "890.987.654-3",
      rating: 4.7,
      completedRoutes: 218,
      isVerified: true,
      wasteTypes: ["Metal", "Escombro", "Papel y Cartón"],
      comunas: [1, 2, 5, 6],
      phone: "+57 (602) 225-1122",
    },
    {
      name: "BioCompost Tuluá",
      nit: "901.445.789-1",
      rating: 4.8,
      completedRoutes: 156,
      isVerified: true,
      wasteTypes: ["Orgánico"],
      comunas: [3, 4, 5],
      phone: "+57 (602) 230-8899",
    },
  ];

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

      {/* List */}
      <div className="space-y-3">
        {companies.map((comp, idx) => (
          <div
            key={idx}
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
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-0.5">NIT: {comp.nit}</p>
              </div>

              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold text-amber-900">
                <span>⭐</span> {comp.rating}
              </div>
            </div>

            {/* Waste types pills */}
            <div className="flex flex-wrap gap-1.5">
              {comp.wasteTypes.map((w, wIdx) => (
                <span
                  key={wIdx}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--muted)] text-zinc-700"
                >
                  {w}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)] text-[var(--muted-foreground)]">
              <span>{comp.completedRoutes} rutas completadas</span>
              <span className="font-semibold text-zinc-900">Comunas {comp.comunas.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
