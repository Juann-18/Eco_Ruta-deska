import type { WasteType } from "../points/types/points.types";

interface GuideData {
  title: string;
  category: WasteType;
  headerBg: string;
  badgeBg: string;
  iconBg: string;
  icon: React.ReactNode;
  collector: string;
  yes: string[];
  no: string[];
  advice: string;
}

const GUIDES_DATA: Record<string, GuideData> = {
  PLASTICO: {
    title: "Plástico",
    category: "PLASTICO",
    headerBg: "#FEF9C3",
    badgeBg: "#FEF08A",
    iconBg: "#FACC15",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 2h4a1 1 0 011 1v2h1a2 2 0 012 2v2a4 4 0 01-.7 2.24l.7 9.52A2.24 2.24 0 0115.76 21H8.24A2.24 2.24 0 016 18.76l.7-9.52A4 4 0 016 7V5a2 2 0 012-2h1V3a1 1 0 011-1zm1 3h2V4h-2v1z" />
      </svg>
    ),
    collector: "EcoAseo Tuluá",
    yes: ["Botellas PET", "Envases de aseo", "Bolsas limpias", "Tapas"],
    no: ["Icopor", "Plástico con restos de comida", "Pañales"],
    advice: "Aplasta las botellas y ponles la tapa.",
  },
  PAPEL_CARTON: {
    title: "Papel y Cartón",
    category: "PAPEL_CARTON",
    headerBg: "#EBE8F9",
    badgeBg: "#DDD6FE",
    iconBg: "#4F46E5",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H7a2 2 0 00-2 2v14a2 2 0 002 2h12a1 1 0 001-1V4a1 1 0 00-1-1zM9 7h8v2H9V7zm8 4H9v2h8v-2zm-8 4h5v2H9v-2z" />
        <path d="M4 6H3v2h1V6zm0 4H3v2h1v-2zm0 4H3v2h1v-2z" />
      </svg>
    ),
    collector: "EcoAseo Tuluá",
    yes: ["Periódicos", "Revistas", "Cajas de cartón", "Hojas de oficina", "Cuadernos"],
    no: ["Papel mojado o grasoso", "Servilletas usadas", "Papel encerado", "Papel higiénico"],
    advice: "Aplana las cajas para ahorrar espacio en el contenedor.",
  },
  VIDRIO: {
    title: "Vidrio",
    category: "VIDRIO",
    headerBg: "#E8FCE2",
    badgeBg: "#DCFCE7",
    iconBg: "#58E019",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 3h10a1 1 0 011 1v2a6 6 0 01-5 5.91V18h3a1 1 0 110 2H8a1 1 0 110-2h3v-6.09A6 6 0 016 6V4a1 1 0 011-1z" />
      </svg>
    ),
    collector: "EcoAseo Tuluá",
    yes: ["Botellas", "Frascos", "Vasos de vidrio"],
    no: ["Espejos", "Bombillos", "Cerámica", "Vidrio de ventana"],
    advice: "Enjuaga los envases; no hace falta quitar las etiquetas.",
  },
  METAL: {
    title: "Metal",
    category: "METAL",
    headerBg: "#FFEAEA",
    badgeBg: "#FED7D7",
    iconBg: "#EF4444",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
    ),
    collector: "EcoAseo Tuluá",
    yes: ["Latas", "Tapas metálicas", "Ollas viejas", "Alambres"],
    no: ["Aerosoles con contenido", "Pilas", "Baterías"],
    advice: "Enjuaga las latas antes de entregarlas.",
  },
  ESCOMBRO: {
    title: "Escombro",
    category: "ESCOMBRO",
    headerBg: "#F1F2F4",
    badgeBg: "#E4E4E7",
    iconBg: "#71717A",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    collector: "EcoAseo Tuluá",
    yes: ["Ladrillos", "Concreto", "Cerámica", "Tierra"],
    no: ["Residuos peligrosos", "Pintura", "Basura orgánica"],
    advice: "El escombro se recoge solo en los días programados.",
  },
};

interface CategoryGuideViewProps {
  categoryKey: string;
  onBack: () => void;
  onGoToContainers: (category: WasteType) => void;
  onGoToSchedule: () => void;
}

export function CategoryGuideView({
  categoryKey,
  onBack,
  onGoToContainers,
  onGoToSchedule,
}: CategoryGuideViewProps) {
  const guide = GUIDES_DATA[categoryKey] || GUIDES_DATA.PLASTICO;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 max-w-md mx-auto w-full pb-8">
      {/* Botón Volver < Inicio */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-900 shadow-xs hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Inicio
        </button>
      </div>

      {/* Tarjeta de Encabezado de Categoría */}
      <div
        className="rounded-3xl p-5 shadow-xs"
        style={{ backgroundColor: guide.headerBg }}
      >
        <div className="flex items-center gap-3.5 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-xs shrink-0"
            style={{ backgroundColor: guide.iconBg }}
          >
            {guide.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 leading-tight">
              {guide.title}
            </h2>
            <p className="text-xs text-zinc-500 font-medium">Guía de separación</p>
          </div>
        </div>

        <div className="inline-block bg-white px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-800 shadow-xs">
          Recoge: {guide.collector}
        </div>
      </div>

      {/* Sección Sí van (Verde pastel) */}
      <div className="bg-[#EAF8E7] rounded-3xl p-4 space-y-2.5 border border-emerald-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
          <h3 className="text-sm font-bold text-zinc-900">Sí van</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {guide.yes.map((item, idx) => (
            <span
              key={idx}
              className="px-3.5 py-1.5 bg-white text-zinc-800 rounded-full text-xs font-semibold shadow-xs"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Sección No van (Rojo pastel) */}
      <div className="bg-[#FEEAE9] rounded-3xl p-4 space-y-2.5 border border-rose-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <h3 className="text-sm font-bold text-zinc-900">No van</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {guide.no.map((item, idx) => (
            <span
              key={idx}
              className="px-3.5 py-1.5 bg-white text-zinc-800 rounded-full text-xs font-semibold shadow-xs"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Sección Consejo */}
      <div className="bg-zinc-100 rounded-3xl p-4 space-y-1">
        <h4 className="text-xs font-bold text-zinc-900">Consejo</h4>
        <p className="text-xs text-zinc-600 leading-relaxed">{guide.advice}</p>
      </div>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={() => onGoToContainers(guide.category)}
          className="py-3 px-4 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer text-center"
        >
          Contenedores cerca
        </button>
        <button
          onClick={onGoToSchedule}
          className="py-3 px-4 rounded-full bg-zinc-100 text-zinc-900 text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer text-center"
        >
          Ver horarios
        </button>
      </div>
    </div>
  );
}
