"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  slug: string;
  employeeId?: string | null;
};

export default function LoginForm({ slug, employeeId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const isFormFilled = email.trim() !== "" && password !== "";

  function validateEmail(): boolean {
    if (!email.trim()) {
      setEmailError("El email es obligatorio");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("El formato del email no es válido");
      return false;
    }
    setEmailError(null);
    return true;
  }

  function handleEmailBlur() {
    setEmailTouched(true);
    validateEmail();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    if (!validateEmail()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/clientes/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      if (res.status === 401) {
        setServerError("Email o contraseña incorrectos");
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setServerError(json.error ?? "Error al iniciar sesión. Intentá de nuevo.");
        return;
      }

      window.location.href = employeeId ? `/turnos/${slug}?employee=${employeeId}` : `/turnos/${slug}`;
    } catch {
      setServerError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-email"
          className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide"
        >
          Email <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailTouched) setEmailError(null);
            setServerError(null);
          }}
          onBlur={handleEmailBlur}
          autoComplete="email"
          placeholder="tu@email.com"
          className={`w-full font-body text-sm text-[#2A2829] border rounded-md px-3 py-2 outline-none focus:border-[var(--brand-color)] transition-colors bg-white placeholder:text-[#2A2829]/30 ${
            emailError ? "border-[#ef4444]" : "border-[#E0E0DB]"
          }`}
        />
        {emailError && (
          <p className="font-body text-xs text-[#ef4444]">{emailError}</p>
        )}
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-password"
          className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide"
        >
          Contraseña <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setServerError(null);
            }}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            className="w-full font-body text-sm text-[#2A2829] border border-[#E0E0DB] rounded-md px-3 py-2 pr-10 outline-none focus:border-[var(--brand-color)] transition-colors bg-white placeholder:text-[#2A2829]/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2A2829]/40 hover:text-[#2A2829] transition-colors"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Recuérdame */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            rememberMe
              ? "bg-[var(--brand-color)] border-[var(--brand-color)]"
              : "bg-white border-[#E0E0DB] group-hover:border-[var(--brand-color)]/60"
          }`}
        >
          {rememberMe && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
        </span>
        <span className="font-body text-sm text-[#2A2829]">Recordarme</span>
      </label>

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
        disabled={!isFormFilled || isLoading}
        className="font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {isLoading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
