"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { validatePassword } from "@/lib/password-validation";
import Silk from "@/components/ui/Silk";

type Props = {
  slug: string;
  businessName: string;
  brandColor: string;
  token: string;
};

type Estado = "idle" | "loading" | "tokenInvalido" | "tokenExpirado";

export default function RestablecerContrasenaClient({ slug, businessName, brandColor, token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const validation = validatePassword(password);
  const passwordsMatch = password !== "" && password === confirmPassword;
  const canSubmit =
    validation.isValid &&
    passwordsMatch &&
    estado !== "loading";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setEstado("loading");
    setServerError(null);

    try {
      const res = await fetch("/api/clientes/restablecer-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        router.push(`/turnos/${slug}/login`);
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 400) {
        const msg: string = json.error ?? "";
        if (msg.includes("expiró")) {
          setEstado("tokenExpirado");
        } else {
          setEstado("tokenInvalido");
        }
      } else {
        setServerError(json.error ?? "Ocurrió un error. Intentá de nuevo.");
        setEstado("idle");
      }
    } catch {
      setServerError("Error de conexión. Intentá de nuevo.");
      setEstado("idle");
    }
  }

  const isTokenError = estado === "tokenInvalido" || estado === "tokenExpirado";

  return (
    <main
      className="auth-page relative min-h-screen overflow-hidden flex flex-col items-center px-4 py-12"
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      <Silk speed={0.6} />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        {/* Header */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] px-8 py-7 flex flex-col items-center gap-2 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-[#F4F5F7] border border-[#E0E0DB] flex items-center justify-center mb-1">
            <span className="font-heading text-lg text-[var(--brand-color)] font-semibold uppercase">
              {businessName.charAt(0)}
            </span>
          </div>
          <h1 className="font-heading text-xl text-[#2A2829] text-center leading-tight">
            {businessName}
          </h1>
          <p className="font-body text-sm text-[#2A2829]/50 text-center">
            Restablecer contraseña
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] p-6 shadow-sm">
          {isTokenError ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="h-12 w-12 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="font-body text-sm text-[#2A2829]/70">
                {estado === "tokenExpirado"
                  ? "El link expiró. Solicitá uno nuevo para restablecer tu contraseña."
                  : "El link no es válido o ya fue utilizado."}
              </p>
              <Link
                href={`/turnos/${slug}/recuperar-contrasena`}
                className="font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity"
              >
                Solicitar nuevo link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Nueva contraseña */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reset-password"
                  className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide"
                >
                  Nueva contraseña <span aria-hidden="true" className="text-[#ef4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Tu nueva contraseña"
                    className="w-full font-body text-sm text-[#2A2829] border border-[#E0E0DB] rounded-md px-3 py-2 pr-10 outline-none focus:border-[var(--brand-color)] transition-colors bg-white placeholder:text-[#2A2829]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2A2829]/30 hover:text-[#2A2829]/70 transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>

                {/* Indicadores de requisitos */}
                {password.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <PasswordRequirement met={validation.hasUppercase} label="Al menos una mayúscula" />
                    <PasswordRequirement met={validation.hasSpecial} label="Al menos un carácter especial (!@#$%...)" />
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reset-confirm"
                  className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide"
                >
                  Confirmar contraseña <span aria-hidden="true" className="text-[#ef4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repetí tu nueva contraseña"
                    className={`w-full font-body text-sm text-[#2A2829] border rounded-md px-3 py-2 pr-10 outline-none focus:border-[var(--brand-color)] transition-colors bg-white placeholder:text-[#2A2829]/30 ${
                      confirmPassword.length > 0 && !passwordsMatch ? "border-[#ef4444]" : "border-[#E0E0DB]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2A2829]/30 hover:text-[#2A2829]/70 transition-colors"
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="font-body text-xs text-[#ef4444]">Las contraseñas no coinciden</p>
                )}
              </div>

              {serverError && (
                <p
                  role="alert"
                  className="font-body text-xs text-[#ef4444] bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-md px-3 py-2"
                >
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {estado === "loading" ? "Restableciendo..." : "Restablecer contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 ${
          met ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-[#E0E0DB] text-[#2A2829]/40"
        }`}
        aria-hidden="true"
      >
        {met ? (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        ) : (
          <svg className="w-2 h-2" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v8M2 6h8" />
          </svg>
        )}
      </span>
      <span className={`font-body text-xs ${met ? "text-[#22c55e]" : "text-[#2A2829]/50"}`}>
        {label}
      </span>
    </div>
  );
}
