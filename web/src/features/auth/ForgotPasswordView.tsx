import { useState } from "react";

interface ForgotPasswordViewProps {
  onBackToSignIn: () => void;
}

export function ForgotPasswordView({ onBackToSignIn }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white h-full relative max-w-[420px] mx-auto w-full">
      {/* ── Logo Centrado ── */}
      <div className="flex-1 flex items-center justify-center pt-12">
        <div className="w-20 h-20 rounded-full bg-[#B8EBBA] flex items-center justify-center shadow-xs">
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C7 2 3 7 3 13c0 4.5 3 8 9 9 6-1 9-4.5 9-9 0-6-4-11-8-11z" fill="#2E7D32" />
            <path d="M12 2v20c5-1 8-4.5 8-9 0-6-4-11-8-11z" fill="#388E3C" />
          </svg>
        </div>
      </div>

      {/* ── Tarjeta Inferior de Recuperar Contraseña ── */}
      <div className="bg-white rounded-t-[38px] border-t border-zinc-200/80 p-6 space-y-4 shadow-xl">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          Recuperar contraseña
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              ✓ Hemos enviado las instrucciones de recuperación a <b>{email}</b>. Revisa tu bandeja de entrada o spam.
            </div>
            <button
              onClick={onBackToSignIn}
              className="w-full py-3.5 rounded-full border border-zinc-200 bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-900 block">
                Correo Electronico
              </label>
              <input
                type="email"
                placeholder="Ingrese su correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-full border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#8db37e] text-white text-xs font-bold hover:bg-[#7ba36c] transition-colors cursor-pointer shadow-xs"
            >
              Enviar enlace
            </button>

            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full py-3.5 rounded-full border border-zinc-200 bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Volver a iniciar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
