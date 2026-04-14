"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

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
      className="min-h-screen bg-[#F4F5F7] flex flex-col items-center px-4 py-12"
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Header del negocio */}
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
            Ingresá para reservar tu turno
          </p>
        </div>

        {/* Card con tabs */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#E0E0DB]">
            <button
              onClick={() => setActiveTab("login")}
              aria-selected={activeTab === "login"}
              role="tab"
              className={`flex-1 font-body text-sm py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
                activeTab === "login"
                  ? "text-[var(--brand-color)] border-b-2 border-[var(--brand-color)] font-medium bg-white"
                  : "text-[#2A2829]/50 hover:text-[#2A2829] hover:bg-[#F4F5F7]/50"
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
                  ? "text-[var(--brand-color)] border-b-2 border-[var(--brand-color)] font-medium bg-white"
                  : "text-[#2A2829]/50 hover:text-[#2A2829] hover:bg-[#F4F5F7]/50"
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
