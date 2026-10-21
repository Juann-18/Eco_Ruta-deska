import type { WasteType } from "../../features/points/types/points.types";

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  PAPEL_CARTON: "Papel y Cartón",
  VIDRIO: "Vidrio",
  PLASTICO: "Plástico",
  METAL: "Metal",
  ESCOMBRO: "Escombro",
  ORGANICO: "Orgánico",
};

export const WASTE_TYPE_COLORS: Record<WasteType, { bg: string; text: string; dot: string }> = {
  PAPEL_CARTON: { bg: "#e0e7ff", text: "#4338ca", dot: "#4338ca" },
  VIDRIO:       { bg: "#dcfce7", text: "#15803d", dot: "#15803d" },
  PLASTICO:     { bg: "#fef9c3", text: "#a16207", dot: "#a16207" },
  METAL:        { bg: "#ffe4e6", text: "#be123c", dot: "#be123c" },
  ESCOMBRO:     { bg: "#f3f4f6", text: "#4b5563", dot: "#4b5563" },
  ORGANICO:     { bg: "#ede9fe", text: "#7c3aed", dot: "#7c3aed" },
};

export const WASTE_ICONS: Record<WasteType, string> = {
  PAPEL_CARTON: "📦",
  VIDRIO: "🍶",
  PLASTICO: "♻️",
  METAL: "🔩",
  ESCOMBRO: "🧱",
  ORGANICO: "🥦",
};

export const COMUNAS = [1, 2, 3, 4, 5, 6] as const;

export const FILL_THRESHOLDS = {
  safe: 50,
  medium: 80,
} as const;

export function getFillColor(fill: number): string {
  if (fill >= FILL_THRESHOLDS.medium) return "#ef4444";
  if (fill >= FILL_THRESHOLDS.safe) return "#f59e0b";
  return "#10b981";
}

export function getFillLabel(fill: number): string {
  if (fill >= FILL_THRESHOLDS.medium) return "Crítico";
  if (fill >= FILL_THRESHOLDS.safe) return "Moderado";
  return "Normal";
}

export interface WasteGuide {
  yes: string[];
  no: string[];
  tips: string;
}

export const WASTE_GUIDES: Record<WasteType, WasteGuide> = {
  PAPEL_CARTON: {
    yes: [
      "Periódicos y revistas",
      "Cajas de cartón desarmadas",
      "Hojas de archivo y libretas",
      "Cuadernos sin espiral metálico",
    ],
    no: [
      "Papel higiénico o servilletas usadas",
      "Papel encerado o plastificado",
      "Cartón con grasa o comida (ej. cajas de pizza sucias)",
    ],
    tips: "Debe estar completamente seco y libre de humedad. Aplana las cajas para optimizar espacio.",
  },
  VIDRIO: {
    yes: [
      "Botellas de bebidas y licores",
      "Frascos de conservas y mermeladas",
      "Envases de cosméticos limpios",
    ],
    no: [
      "Espejos y cristales de ventanas",
      "Bombillos o tubos fluorescentes",
      "Vajillas de loza, porcelana o cerámica",
    ],
    tips: "Enjuaga brevemente los envases y retira las tapas metálicas o plásticas.",
  },
  PLASTICO: {
    yes: [
      "Botellas PET (agua, refrescos)",
      "Envases de lácteos y detergentes (PEAD)",
      "Tapas plásticas y botellones",
    ],
    no: [
      "Empaques metalizados (snacks)",
      "Poliestireno expandido (icopor) sucio",
      "Envases de agroquímicos o tóxicos",
    ],
    tips: "Lava, escurre y aplasta las botellas plásticas antes de depositarlas.",
  },
  METAL: {
    yes: [
      "Latas de bebidas (aluminio)",
      "Latas de alimentos en conserva (hojalata)",
      "Tapas de frascos y chapas",
    ],
    no: [
      "Baterías y pilas (requieren punto especial)",
      "Aerosoles con contenido a presión",
      "Cables eléctricos o metales oxidados",
    ],
    tips: "Enjuaga las latas de alimentos para evitar malos olores y plagas.",
  },
  ESCOMBRO: {
    yes: [
      "Restos de ladrillo, bloque y teja",
      "Trozos de concreto y mortero",
      "Cerámica y baldosas de reformas menores",
    ],
    no: [
      "Líquidos, solventes o pinturas",
      "Materiales con asbesto",
      "Maderas de gran tamaño o basuras mixtas",
    ],
    tips: "Aplica únicamente para reformas menores domiciliarias en Tuluá.",
  },
  ORGANICO: {
    yes: [
      "Cáscaras de frutas, verduras y legumbres",
      "Cuncho de café y bolsitas de té",
      "Hojas secas y restos de poda menor",
    ],
    no: [
      "Plásticos y bolsas convencionales",
      "Aceites vegetales usados",
      "Excrementos de mascotas",
    ],
    tips: "Deposita preferiblemente suelto o en bolsa compostable para el proceso de abono.",
  },
};

