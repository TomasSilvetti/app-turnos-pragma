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
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rescheduleCount, setRescheduleCount] = useState(0);
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    fetch("/api/panel/reschedules/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => setRescheduleCount(data.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-30 border-r border-[#E0E0DB] bg-white flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "14rem" }}
        aria-label="Menú de navegación"
      >
        <div className="px-5 py-6 border-b border-[#E0E0DB] flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[#253551] hover:text-[#1c2a40] transition-colors"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
          </button>
          <span className="font-heading text-lg text-[#253551]">Panel</span>
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
                    ? "bg-[#253551] text-white font-medium"
                    : "text-[#2A2829] hover:bg-[#F4F5F7]"
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
                        ? "bg-white text-[#253551]"
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

        <div className="m-3 p-3 rounded-lg border border-[#E0E0DB] bg-[#F4F5F7] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#253551] text-white flex items-center justify-center font-small text-[11px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-[#2A2829] truncate leading-tight">{userName}</span>
              <span className="font-small text-[10px] text-[#6b7280] truncate leading-tight">{userEmail}</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-[11px] text-[#2A2829] hover:text-[#ef4444] transition-colors w-fit"
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
            className="mb-4 text-[#253551] hover:text-[#1c2a40] transition-colors"
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
