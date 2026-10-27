import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../features/reports/api/reports.api";

interface NoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return "Ayer";
}

function getNoticeCircleColors(type: string): { outer: string; inner: string } {
  const upper = type.toUpperCase();
  if (upper.includes("CAMION") || upper.includes("PROXIMIDAD")) {
    return { outer: "#C8EEC8", inner: "#4CAF50" };
  }
  if (upper.includes("LLENO") || upper.includes("ALERT")) {
    return { outer: "#FECACA", inner: "#EF4444" };
  }
  if (upper.includes("EMPRESA") || upper.includes("REPORTE")) {
    return { outer: "#C7D2FE", inner: "#4F46E5" };
  }
  return { outer: "#FEF08A", inner: "#EAB308" };
}

export function NoticesModal({ isOpen, onClose }: NoticesModalProps) {
  const queryClient = useQueryClient();
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleMarkOneRead = async (id: string) => {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-extrabold text-xl text-black">Avisos</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1 rounded-full border border-zinc-200 bg-white text-[11px] font-bold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Marcar todo como leído
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="bg-[#F8F8FA] rounded-3xl p-2.5 space-y-2 max-h-80 overflow-y-auto">
          {isLoading && (
            <p className="text-xs text-center text-zinc-500 py-6">Cargando avisos...</p>
          )}
          {!isLoading && notices.length === 0 && (
            <p className="text-xs text-center text-zinc-500 py-6">
              No hay notificaciones pendientes en tu sector.
            </p>
          )}
          {notices.map((n) => {
            const colors = getNoticeCircleColors(n.type);
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) handleMarkOneRead(n.id);
                }}
                className="p-3.5 rounded-2xl bg-white border border-zinc-100 flex items-start gap-3 relative cursor-pointer hover:border-zinc-200 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: colors.outer }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: colors.inner }}
                  />
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <span className="text-xs font-extrabold text-zinc-950 block">
                    {n.title}
                  </span>
                  <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#4CAF50] absolute top-3.5 right-3.5" />
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-black text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
