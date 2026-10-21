interface NoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NoticesModal({ isOpen, onClose }: NoticesModalProps) {
  if (!isOpen) return null;

  const notices = [
    {
      title: "Ruta Activa en Comuna 1",
      message: "El camión compactador TUL-482 se encuentra recolectando residuos en el sector Centro.",
      time: "Hace 15 min",
      type: "TRUCK",
    },
    {
      title: "Alerta de Capacidad",
      message: "El contenedor #CNT-0002 (Parque Infantil) superó el 85% y ya fue programado para vaciado.",
      time: "Hace 40 min",
      type: "ALERT",
    },
    {
      title: "Jornada de Educación Ambiental",
      message: "Talleres de compostaje y reciclaje en la sede UCEVA de 09:00 AM a 12:00 PM.",
      time: "Hoy",
      type: "COMMUNITY",
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <h3 className="font-bold text-base text-[var(--foreground)]">Avisos y Alertas</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {notices.map((n, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--muted)] space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)]">{n.title}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{n.time}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{n.message}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
