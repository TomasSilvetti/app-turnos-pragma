"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  slug: string;
  businessName: string;
  brandColor: string;
};

type Estado = "idle" | "loading" | "enviado" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecuperarContrasenaClient({ slug, businessName, brandColor }: Props) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const canSubmit = isEmailValid && estado !== "loading";

  function validateEmail(): boolean {
    if (!email.trim()) {
      setEmailError("El email es obligatorio");
      return false;
    }
    if (!isEmailValid) {
      setEmailError("El formato del email no es válido");
      return false;
    }
    setEmailError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    if (!validateEmail()) return;

    setEstado("loading");

    try {
      const res = await fetch("/api/clientes/recuperar-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), slug }),
      });

      if (res.ok) {
        setEstado("enviado");
      } else {
        setEstado("error");
      }
    } catch {
      setEstado("error");
    }
  }

  return (
    <main
      className="min-h-screen bg-[#F4F5F7] flex flex-col items-center px-4 py-12"
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Header */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] px-8 py-7 flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-[var(--brand-color)]/10 flex items-center justify-center mb-1">
            <span className="font-heading text-lg text-[var(--brand-color)] font-semibold uppercase">
              {businessName.charAt(0)}
            </span>
          </div>
          <h1 className="font-heading text-xl text-[#2A2829] text-center leading-tight">
            {businessName}
          </h1>
          <p className="font-body text-sm text-[#2A2829]/50 text-center">
            Recuperar contraseña
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] p-6">
          {estado === "enviado" ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="h-12 w-12 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-body text-sm text-[#2A2829]">
                Si el email existe, te llegará un correo con las instrucciones.
              </p>
              <Link
                href={`/turnos/${slug}/login`}
                className="font-body text-sm text-[var(--brand-color)] hover:underline mt-1"
              >
                Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <p className="font-body text-sm text-[#2A2829]/70">
                Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
              </p>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="recovery-email"
                  className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide"
                >
                  Email <span aria-hidden="true" className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailTouched) setEmailError(null);
                    if (estado === "error") setEstado("idle");
                  }}
                  onBlur={() => {
                    setEmailTouched(true);
                    validateEmail();
                  }}
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

              {estado === "error" && (
                <p
                  role="alert"
                  className="font-body text-xs text-[#ef4444] bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-md px-3 py-2"
                >
                  Ocurrió un error. Intentá de nuevo.
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {estado === "loading" ? "Enviando..." : "Enviar link de recuperación"}
              </button>

              <div className="text-center">
                <Link
                  href={`/turnos/${slug}/login`}
                  className="font-body text-xs text-[#2A2829]/50 hover:text-[var(--brand-color)] transition-colors"
                >
                  Volver al login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
