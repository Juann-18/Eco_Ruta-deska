import { useState } from "react";
import { ChangeLocationModal } from "./ChangeLocationModal";
import { NoticesModal } from "./NoticesModal";
import { cn } from "../lib/utils";
import type { WasteType } from "../../features/points/types/points.types";

export type NavTab = "schedule" | "containers" | "routes" | "home" | "company" | "profile";

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedComuna: number;
  onSelectComuna: (comuna: number) => void;
  selectedWasteType?: WasteType;
  children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  selectedComuna,
  onSelectComuna,
  children,
}: AppShellProps) {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);

  // Los 5 iconos exactos de la barra inferior según las capturas de diseño de docs/design/screens/
  const navItems = [
    {
      id: "schedule" as NavTab,
      label: "Rutas de recolección",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <path d="M8 17v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
          <path d="M12 11V7" />
        </svg>
      ),
    },
    {
      id: "containers" as NavTab,
      label: "Contenedores de reciclaje",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      ),
    },
    {
      id: "home" as NavTab,
      label: "Inicio",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
          <path d="M9 15a3 3 0 006 0" />
        </svg>
      ),
    },
    {
      id: "company" as NavTab,
      label: "Empresas",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22V6a2 2 0 012-2h12a2 2 0 012 2v16" />
          <path d="M9 22v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
          <path d="M8 8h2M14 8h2M8 12h2M14 12h2" />
        </svg>
      ),
    },
    {
      id: "profile" as NavTab,
      label: "Perfil",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex justify-center min-h-screen bg-zinc-200/70 font-sans p-0 sm:py-6">
      {/* Marco de Dispositivo Móvil fiel a los prototipos de docs/design/screens/ */}
      <div className="w-full max-w-[420px] h-screen sm:h-[860px] bg-white flex flex-col sm:rounded-[44px] shadow-2xl relative overflow-hidden sm:border-[8px] sm:border-black">
        {/* ── Hoja Verde EcoRuta Centrada en la parte superior ── */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-7 h-7 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 7 3 13c0 4.5 3 8 9 9 6-1 9-4.5 9-9 0-6-4-11-9-11z" fill="#2E7D32" />
              <path d="M12 2v20c5-1 8-4.5 8-9 0-6-4-11-8-11z" fill="#43A047" />
            </svg>
          </div>
        </div>

        {/* ── Barra Superior de Acciones Rápidas (Localidad & Avisos) ── */}
        <div className="px-5 py-1.5 flex items-center justify-between shrink-0">
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-bold hover:bg-zinc-100 transition-colors cursor-pointer text-zinc-800"
          >
            <span>📍</span>
            <span>Tuluá · Comuna {selectedComuna}</span>
            <span className="text-[9px] text-zinc-400">▾</span>
          </button>

          <button
            onClick={() => setIsNoticesOpen(true)}
            className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer text-xs relative"
            title="Avisos"
          >
            <span>🔔</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
          </button>
        </div>

        {/* ── Contenido de la Pantalla Activa ── */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {children}
        </div>

        {/* ── Barra de Navegación Inferior (Floating Capsule Bar idéntica al mockup) ── */}
        <div className="p-3 shrink-0 bg-transparent">
          <nav className="p-1.5 bg-white border border-zinc-200 rounded-[32px] flex items-center justify-between shadow-lg">
            {navItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === "containers" && activeTab === "routes");
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  className={cn(
                    "w-14 h-12 rounded-[22px] flex items-center justify-center transition-all cursor-pointer",
                    isActive
                      ? "bg-black text-white shadow-md scale-102"
                      : "bg-[#F4F4F5] text-zinc-800 hover:bg-zinc-200"
                  )}
                >
                  {item.icon}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Modales */}
      <ChangeLocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        selectedComuna={selectedComuna}
        onSelectComuna={onSelectComuna}
      />

      <NoticesModal
        isOpen={isNoticesOpen}
        onClose={() => setIsNoticesOpen(false)}
      />
    </div>
  );
}
