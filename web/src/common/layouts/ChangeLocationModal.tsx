import { cn } from "../lib/utils";

interface ChangeLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComuna: number;
  onSelectComuna: (comuna: number) => void;
}

export function ChangeLocationModal({
  isOpen,
  onClose,
  selectedComuna,
  onSelectComuna,
}: ChangeLocationModalProps) {
  if (!isOpen) return null;

  const comunasInfo = [
    { num: 1, name: "Comuna 1 (Centro)", barrios: "Plaza Cívica, Batalla de Boyacá, Estación" },
    { num: 2, name: "Comuna 2 (Occidente)", barrios: "Terminal de Transportes, Parque Bolívar" },
    { num: 3, name: "Comuna 3 (Sur)", barrios: "Alvernia, La 14, Barrio Victoria" },
    { num: 4, name: "Comuna 4 (Norte)", barrios: "Mercado Central, Parque de la Guadua, Sajonia" },
    { num: 5, name: "Comuna 5 (Oriente)", barrios: "Hospital Tomás Uribe, Chiminangos, San Juan Bosco" },
    { num: 6, name: "Comuna 6 (Sur-Occidente)", barrios: "Campus UCEVA, Parque Lineal Céspedes" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[var(--foreground)]">Cambiar Localidad</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Municipio de Tuluá, Valle</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {comunasInfo.map((c) => (
            <button
              key={c.num}
              onClick={() => {
                onSelectComuna(c.num);
                onClose();
              }}
              className={cn(
                "w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                selectedComuna === c.num
                  ? "border-black bg-[var(--muted)]"
                  : "border-[var(--border)] hover:border-zinc-400 bg-white"
              )}
            >
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">{c.name}</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{c.barrios}</p>
              </div>

              {selectedComuna === c.num && (
                <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold shrink-0">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
