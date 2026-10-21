import { useState } from "react";
import { useAuthStore, type UserRole } from "../auth/auth.store";
import type { NavTab } from "../../common/layouts/AppShell";

interface ProfileViewProps {
  selectedComuna: number;
  onOpenLocationModal: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onRequireAuth?: () => void;
}

export function ProfileView({
  selectedComuna,
  onOpenLocationModal,
  onNavigateToTab,
  onRequireAuth,
}: ProfileViewProps) {
  const { user, logout, quickLoginAs } = useAuthStore();
  const [activeModal, setActiveModal] = useState<
    "info" | "faq" | "edit" | "settings" | null
  >(null);

  // Edit form state
  const [editName, setEditName] = useState(user?.name || "Alex Ciudadano");
  const [editPhone, setEditPhone] = useState(user?.phone || "+57 315 224 8899");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleLogout = async () => {
    await logout();
    if (onRequireAuth) {
      onRequireAuth();
    }
  };

  const handleSwitchRole = async (role: UserRole) => {
    await quickLoginAs(role);
    setEditName(
      role === "RECOLECTOR"
        ? "Carlos Conductor"
        : role === "ADMIN"
        ? "Sofia Valderrama"
        : "Alex Ciudadano"
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      user.name = editName;
      user.phone = editPhone;
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setActiveModal(null);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-2 pb-24 max-w-[420px] mx-auto w-full select-none">
      {/* Role Switcher Toolbar (Testing Bar) */}
      <div className="bg-zinc-100/90 rounded-2xl p-2 mb-4 flex items-center justify-between text-xs">
        <span className="text-[11px] font-bold text-zinc-500 pl-1">Rol actual:</span>
        <div className="flex gap-1">
          <button
            onClick={() => handleSwitchRole("CIUDADANO")}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              user?.role === "CIUDADANO"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Ciudadano
          </button>
          <button
            onClick={() => handleSwitchRole("RECOLECTOR")}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              user?.role === "RECOLECTOR"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Recolector
          </button>
          <button
            onClick={() => handleSwitchRole("ADMIN")}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              user?.role === "ADMIN"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* Profile Header matching Profile.png */}
      <div className="mb-6">
        <div className="w-12 h-12 rounded-full bg-[#D9F99D] flex items-center justify-center shadow-xs">
          <svg
            className="w-6 h-6 text-black"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-black mt-2.5">
          Hey, {user?.name?.split(" ")[0] || "Alex"}!
        </h1>
        <p className="text-xs text-zinc-500 font-medium">Completa tu perfil</p>
      </div>

      {/* Menu Action List matching Profile.png */}
      <div className="space-y-2.5">
        {/* 1. Rutas */}
        <button
          onClick={() => onNavigateToTab && onNavigateToTab("schedule")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              🧭
            </span>
            <span className="font-bold text-sm text-zinc-900">Rutas</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 2. Mas Información */}
        <button
          onClick={() => setActiveModal("info")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ℹ️
            </span>
            <span className="font-bold text-sm text-zinc-900">Mas Información</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 3. Preguntas Frecuentes */}
        <button
          onClick={() => setActiveModal("faq")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ❓
            </span>
            <span className="font-bold text-sm text-zinc-900">Preguntas Frecuentes</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 4. Editar tu perfil */}
        <button
          onClick={() => setActiveModal("edit")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ✏️
            </span>
            <span className="font-bold text-sm text-zinc-900">Editar tu perfil</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 5. Configuración */}
        <button
          onClick={() => setActiveModal("settings")}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 text-sm">
              ⚙️
            </span>
            <span className="font-bold text-sm text-zinc-900">Configuración</span>
          </div>
          <span className="text-zinc-400 font-bold text-base">›</span>
        </button>

        {/* 6. Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-red-50 hover:border-red-200 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center text-red-600 text-sm">
              🚪
            </span>
            <span className="font-bold text-sm text-red-600">Cerrar Sesión</span>
          </div>
          <span className="text-red-400 font-bold text-base">›</span>
        </button>
      </div>

      {/* Modals for subpantallas */}
      {/* 1. Modal Más Información */}
      {activeModal === "info" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-black">Acerca de EcoRuta Tuluá</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              EcoRuta es la plataforma de gestión logística y reciclaje inteligente de Tuluá, Valle del Cauca.
              Monitorea en tiempo real los sensores IoT en las 6 comunas, optimiza las rutas de camiones y conecta a los ciudadanos con empresas recolectoras autorizadas.
            </p>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
              🌱 Desarrollado para Tuluá Verde y la Alcaldía Municipal.
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal Preguntas Frecuentes */}
      {activeModal === "faq" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-black">Preguntas Frecuentes</h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-zinc-900">¿Cómo sé si un contenedor está lleno?</p>
                <p className="text-zinc-600 mt-0.5">En el mapa de Rutas (🔀), los pines con más del 80% pulsan en color rojo.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900">¿Cuándo pasa el camión por mi comuna?</p>
                <p className="text-zinc-600 mt-0.5">Consulta la pestaña de Rutas (🗑️) para ver los horarios del día y la semana.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900">¿Cómo registro mi empresa recicladora?</p>
                <p className="text-zinc-600 mt-0.5">En la pestaña Empresas (🏢), presiona "+ Registrar empresa" para ingresar tu NIT.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal Editar Perfil */}
      {activeModal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
          >
            <h3 className="font-extrabold text-lg text-black">Editar Perfil</h3>
            {savedSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                ✓ Guardado exitosamente
              </div>
            )}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-zinc-700">Nombre completo</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-black"
                required
              />
            </div>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-zinc-700">Teléfono</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-black"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold text-xs"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Modal Configuración */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-black">Configuración</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Notificaciones de camión cercano</span>
                <input type="checkbox" defaultChecked className="toggle cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <span>Alertas de contenedor desbordado</span>
                <input type="checkbox" defaultChecked className="toggle cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <span>Comuna de interés</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    onOpenLocationModal();
                  }}
                  className="font-bold text-emerald-700 underline"
                >
                  Comuna {selectedComuna} ›
                </button>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
