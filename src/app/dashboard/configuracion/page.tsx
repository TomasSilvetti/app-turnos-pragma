"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PushNotificationToggle } from "@/components/profile/PushNotificationToggle";
import { AttendanceToggle } from "@/components/profile/AttendanceToggle";
import { InstallPWAButton } from "@/components/InstallPWAButton";

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const userRol = (session?.user as { rol?: string } | undefined)?.rol ?? "propietario";
  const isAdmin = userRol === "propietario" || userRol === "administrador";

  const [myLink, setMyLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(saved === "dark" || (!saved && prefersDark));
  }, []);

  useEffect(() => {
    fetch("/api/my-link")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.slug && data?.employeeId) {
          const base = window.location.origin;
          setMyLink(`${base}/turnos/${data.slug}?employee=${data.employeeId}`);
        }
      })
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <div className="w-full max-w-lg flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl text-[#2A2829] dark:text-[#e2e8f0]">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ajustá las preferencias de tu cuenta y dispositivo.
        </p>
      </div>

      {/* Sección general */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8] px-1">
          General
        </h2>
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 sm:p-8 flex flex-col gap-6">

          {/* Link de reservas */}
          {myLink && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8]">
                  Mi link de reservas
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-[#2A2829] dark:text-[#cbd5e1] bg-[#F4F5F7] dark:bg-[#0f172a] rounded-md px-3 py-2 border border-[#E0E0DB] dark:border-[#2d3548]">
                    {myLink}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(myLink).then(() => {
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      });
                    }}
                    className="flex items-center gap-1.5 shrink-0 rounded-md px-3 py-2 text-sm border border-[#E0E0DB] dark:border-[#2d3548] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors"
                    aria-label="Copiar link de reservas"
                  >
                    <span className="material-symbols-outlined text-[var(--brand-color)]" style={{ fontSize: "16px" }} translate="no">
                      {linkCopied ? "check" : "content_copy"}
                    </span>
                    {linkCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              <hr className="border-[#E0E0DB] dark:border-[#2d3548]" />
            </>
          )}

          {/* Notificaciones push */}
          <PushNotificationToggle />

          <hr className="border-[#E0E0DB] dark:border-[#2d3548]" />

          {/* Instalar PWA */}
          <InstallPWAButton variant="panel" />

          <hr className="border-[#E0E0DB] dark:border-[#2d3548]" />

          {/* Tutorial */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8]">
              Tutorial
            </span>
            <Link
              href="/dashboard/tutorial"
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors duration-200"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }} translate="no">school</span>
                Ver tutorial de bienvenida
              </span>
              <span className="material-symbols-outlined text-[#6b7280] dark:text-[#94a3b8]" style={{ fontSize: "16px" }} translate="no">arrow_forward</span>
            </Link>
          </div>

          <hr className="border-[#E0E0DB] dark:border-[#2d3548]" />

          {/* Tema */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8]">
              Apariencia
            </span>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors duration-200 cursor-pointer"
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-pressed={isDark}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }} translate="no">
                  {isDark ? "light_mode" : "dark_mode"}
                </span>
                {isDark ? "Modo claro" : "Modo oscuro"}
              </span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                  isDark ? "bg-[var(--brand-color)]" : "bg-[#D1D5DB]"
                )}
                aria-hidden="true"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
                    isDark ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Sección solo para admins */}
      {isAdmin && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8] px-1">
            Administración
          </h2>
          <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 sm:p-8 flex flex-col gap-6">
            <AttendanceToggle />
          </div>
        </div>
      )}
    </div>
  );
}
