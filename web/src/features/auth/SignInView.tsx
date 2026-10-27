import { useState } from "react";
import { useAuthStore } from "./auth.store";

interface SignInViewProps {
  onGoToSignUp: () => void;
  onGoToForgotPassword: () => void;
  onSuccess: () => void;
}

export function SignInView({
  onGoToSignUp,
  onGoToForgotPassword,
  onSuccess,
}: SignInViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) {
      onSuccess();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white h-full relative">
      {/* ── Logo Centrado (Círculo Verde Claro + Hoja Oscura) ── */}
      <div className="flex-1 flex items-center justify-center pt-8">
        <div className="w-20 h-20 rounded-full bg-[#B8EBBA] flex items-center justify-center shadow-xs">
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C7 2 3 7 3 13c0 4.5 3 8 9 9 6-1 9-4.5 9-9 0-6-4-11-8-11z" fill="#2E7D32" />
            <path d="M12 2v20c5-1 8-4.5 8-9 0-6-4-11-8-11z" fill="#388E3C" />
          </svg>
        </div>
      </div>

      {/* ── Tarjeta Inferior de Formulario (Sign-in.png) ── */}
      <div className="bg-white rounded-t-[38px] border-t border-zinc-200/80 p-6 space-y-4 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Campo Correo Electrónico */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-900 block">Correo Electrónico</label>
            <input
              type="email"
              placeholder="Ingrese su correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs outline-none focus:border-zinc-500 bg-white"
            />
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-900 block">Contraseña</label>
            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs outline-none focus:border-zinc-500 bg-white"
            />
          </div>

          {/* Olvide mi contraseña */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onGoToForgotPassword}
              className="text-xs text-zinc-400 hover:text-zinc-600 font-medium cursor-pointer"
            >
              Olvidé mi contraseña
            </button>
          </div>

          {/* Botón Iniciar Sesión (Verde de marca #8DB37E) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#8DB37E] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer text-center"
          >
            {isLoading ? "Verificando..." : "Iniciar Sesión"}
          </button>

          {/* Botón Registrarse (Blanco con borde) */}
          <button
            type="button"
            onClick={onGoToSignUp}
            className="w-full py-3.5 px-4 rounded-2xl bg-white border border-zinc-200 text-zinc-900 text-xs font-bold hover:bg-zinc-50 transition-colors shadow-xs cursor-pointer text-center"
          >
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
}
