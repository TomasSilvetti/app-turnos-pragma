"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { label: "Perfil", href: "/dashboard/perfil", icon: "person" },
  { label: "Tipos de turno", href: "/dashboard/tipos-de-turno", icon: "label" },
  { label: "Configuración de turnos", href: "/dashboard/configuracion-turnos", icon: "calendar_month" },
  { label: "Turnos reservados", href: "/dashboard/turnos-reservados", icon: "bookmark" },
  { label: "Reprogramaciones", href: "/dashboard/reprogramaciones", icon: "event_repeat" },
  { label: "Finanzas", href: "/dashboard/finanzas", icon: "payments" },
];

const DEFAULT_BRAND_COLOR = "#253551";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rescheduleCount, setRescheduleCount] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const { data: session } = useSession();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    fetch("/api/business-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.brandColor) setBrandColor(data.brandColor);
      })
      .catch(() => {});

    const handleColorChange = (e: Event) => {
      const color = (e as CustomEvent<string>).detail;
      if (color) setBrandColor(color);
    };
    window.addEventListener("brand-color-change", handleColorChange);
    return () => window.removeEventListener("brand-color-change", handleColorChange);
  }, []);

  useEffect(() => {
    fetch("/api/panel/reschedules/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => setRescheduleCount(data.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <div
      className="min-h-screen bg-[#F4F5F7] dark:bg-[#0f172a]"
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300",
          "border-r border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#111827]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "14rem" }}
        aria-label="Menú de navegación"
      >
        <div className="px-5 py-6 border-b border-[#E0E0DB] dark:border-[#2d3548] flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[var(--brand-color)] dark:text-[#93c5fd] hover:text-[#1c2a40] dark:hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
          </button>
          <span className="font-heading text-lg text-[var(--brand-color)] dark:text-white">Panel</span>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1" aria-label="Navegación principal">
          {navItems.map((item) => {
            const isReschedule = item.href === "/dashboard/reprogramaciones";
            const showBadge = isReschedule && rescheduleCount > 0;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[var(--brand-color)] text-white font-medium"
                    : "text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b]"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{item.icon}</span>
                  {item.label}
                </span>
                {showBadge && (
                  <span
                    className={cn(
                      "ml-2 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center font-small text-[10px] font-bold leading-none",
                      active
                        ? "bg-white text-[var(--brand-color)] dark:text-[#1e293b]"
                        : "bg-[#ef4444] text-white"
                    )}
                    aria-label={`${rescheduleCount} reprogramaciones pendientes`}
                  >
                    {rescheduleCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggleTheme}
          className="mx-3 mb-2 flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b] transition-colors duration-200 cursor-pointer"
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-pressed={isDark}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
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

        <div className="m-3 p-3 rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-[#F4F5F7] dark:bg-[#1e293b] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--brand-color)] text-white flex items-center justify-center font-small text-[11px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] truncate leading-tight">{userName}</span>
              <span className="font-small text-[10px] text-[#6b7280] dark:text-[#94a3b8] truncate leading-tight">{userEmail}</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-[11px] text-[#2A2829] dark:text-[#cbd5e1] hover:text-[#ef4444] dark:hover:text-[#ef4444] transition-colors w-fit"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="px-6 py-8 min-h-screen overflow-y-auto">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mb-4 text-[var(--brand-color)] dark:text-[#93c5fd] hover:text-[#1c2a40] dark:hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>menu</span>
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
