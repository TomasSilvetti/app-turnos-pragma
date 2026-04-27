"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import { Plasma } from "@/components/landing/Plasma";

type Props = {
  slug: string;
  businessName: string;
  brandColor: string;
  employeeId?: string | null;
};

export default function LoginPageClient({ slug, businessName, brandColor, employeeId }: Props) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  return (
    <main
      className="auth-page relative min-h-screen overflow-hidden flex flex-col items-center px-4 py-12"
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      <Plasma
        speed={0.5}
        color1="#080c14"
        color2="#0d1f3c"
        color3="#1a3a6b"
        color4="#0f2a50"
      />
      <div className="absolute inset-0 bg-[#080c14]/50" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        {/* Header del negocio */}
        <div className="rounded-lg bg-[#080c14] border border-white/10 px-8 py-7 flex flex-col items-center gap-2 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-[var(--brand-color)]/20 flex items-center justify-center mb-1">
            <span className="font-heading text-lg text-[var(--brand-color)] font-semibold uppercase">
              {businessName.charAt(0)}
            </span>
          </div>
          <h1 className="font-heading text-xl text-white text-center leading-tight">
            {businessName}
          </h1>
          <p className="font-body text-sm text-white/50 text-center">
            Ingresá para reservar tu turno
          </p>
        </div>

        {/* Card con tabs */}
        <div className="rounded-lg bg-[#080c14] border border-white/10 overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("login")}
              aria-selected={activeTab === "login"}
              role="tab"
              className={`flex-1 font-body text-sm py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
                activeTab === "login"
                  ? "text-[var(--brand-color)] border-b-2 border-[var(--brand-color)] font-medium bg-white/5"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setActiveTab("register")}
              aria-selected={activeTab === "register"}
              role="tab"
              className={`flex-1 font-body text-sm py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
                activeTab === "register"
                  ? "text-[var(--brand-color)] border-b-2 border-[var(--brand-color)] font-medium bg-white/5"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Contenido del tab activo */}
          <div className="p-6">
            {activeTab === "login" ? (
              <LoginForm slug={slug} employeeId={employeeId ?? null} />
            ) : (
              <RegisterForm slug={slug} employeeId={employeeId ?? null} onSwitchToLogin={() => setActiveTab("login")} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
