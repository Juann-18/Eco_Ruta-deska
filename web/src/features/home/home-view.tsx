import { useState, useEffect } from "react";
import { CategoryGuideView } from "./category-guide-view";
import type { WasteType } from "../points/types/points.types";
import type { NavTab } from "../../common/layouts/AppShell";

interface HomeViewProps {
  onNavigateToTab: (tab: NavTab) => void;
  onSelectWasteType: (type: WasteType) => void;
  selectedComuna?: number;
}

export function HomeView({
  onNavigateToTab,
  onSelectWasteType,
}: HomeViewProps) {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("16:29");
  const [dayName, setDayName] = useState("martes");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);

      const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      setDayName(days[now.getDay()]);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Si seleccionó una categoría, renderizar la vista de guía detallada (Guías de Separación)
  if (selectedCategoryKey) {
    return (
      <CategoryGuideView
        categoryKey={selectedCategoryKey}
        onBack={() => setSelectedCategoryKey(null)}
        onGoToContainers={(wasteType) => {
          onSelectWasteType(wasteType);
          onNavigateToTab("containers");
        }}
        onGoToSchedule={() => onNavigateToTab("schedule")}
      />
    );
  }

  const categoryCards = [
    {
      key: "PAPEL_CARTON",
      name: "Papel",
      bg: "#EBE8F9",
      iconBg: "#4F46E5",
      textColor: "#6B7280",
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H7a2 2 0 00-2 2v14a2 2 0 002 2h12a1 1 0 001-1V4a1 1 0 00-1-1zM9 7h8v2H9V7zm8 4H9v2h8v-2zm-8 4h5v2H9v-2z" />
          <path d="M4 6H3v2h1V6zm0 4H3v2h1v-2zm0 4H3v2h1v-2z" />
        </svg>
      ),
    },
    {
      key: "VIDRIO",
      name: "Vidrio",
      bg: "#B4F792",
      iconBg: "#58E019",
      textColor: "#4B5563",
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 3h10a1 1 0 011 1v2a6 6 0 01-5 5.91V18h3a1 1 0 110 2H8a1 1 0 110-2h3v-6.09A6 6 0 016 6V4a1 1 0 011-1z" />
        </svg>
      ),
    },
    {
      key: "PLASTICO",
      name: "Plastico",
      bg: "#FEF9C3",
      iconBg: "#FACC15",
      textColor: "#6B7280",
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 2h4a1 1 0 011 1v2h1a2 2 0 012 2v2a4 4 0 01-.7 2.24l.7 9.52A2.24 2.24 0 0115.76 21H8.24A2.24 2.24 0 016 18.76l.7-9.52A4 4 0 016 7V5a2 2 0 012-2h1V3a1 1 0 011-1zm1 3h2V4h-2v1z" />
        </svg>
      ),
    },
    {
      key: "METAL",
      name: "Metal",
      bg: "#FFAAA6",
      iconBg: "#EF4444",
      textColor: "#6B7280",
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      ),
    },
    {
      key: "ESCOMBRO",
      name: "Escombro",
      bg: "#E4E4E7",
      iconBg: "#71717A",
      textColor: "#6B7280",
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 max-w-md mx-auto w-full space-y-4 pb-8">
      {/* ── Encabezado Home (Reloj gigante + Saludo + Badge) ── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          {/* Reloj enorme */}
          <span className="text-5xl font-bold tracking-tight text-zinc-950 font-sans">
            {currentTime}
          </span>

          {/* Saludo con manito */}
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-sm font-bold text-zinc-900 leading-tight">Hola Alex.</p>
              <p className="text-xs text-zinc-600 font-medium">Es {dayName}!</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-lg shrink-0">
              👋
            </div>
          </div>
        </div>

        {/* Pill verde de estado del servicio */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#D4F5C9] text-emerald-950 text-xs font-semibold shadow-xs">
          <div className="w-6 h-6 rounded-full bg-[#83D973] flex items-center justify-center text-white text-xs">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-emerald-900">
            Servicio disponible a partir de las 17:00
          </span>
        </div>
      </div>

      {/* ── Título Categorías ── */}
      <div className="pt-2">
        <h2 className="text-base font-bold text-zinc-950 tracking-tight">Categorias</h2>
      </div>

      {/* ── Tarjetas Apiladas (Stacked Cards con Solapamiento) ── */}
      <div className="space-y-[-14px] pb-4">
        {categoryCards.map((card, idx) => (
          <button
            key={card.key}
            onClick={() => setSelectedCategoryKey(card.key)}
            className="w-full h-24 rounded-3xl p-5 flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer relative"
            style={{
              backgroundColor: card.bg,
              zIndex: idx + 1,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: card.textColor }}
            >
              {card.name}
            </span>

            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-xs shrink-0"
              style={{ backgroundColor: card.iconBg }}
            >
              {card.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
