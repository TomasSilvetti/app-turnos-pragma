"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Tipos de turno", href: "/panel/tipos-de-turno" },
  { label: "Configuración de turnos", href: "/panel/configuracion-turnos" },
  { label: "Reprogramaciones", href: "/panel/reprogramaciones" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rescheduleCount, setRescheduleCount] = useState(0);

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
            <X size={20} />
          </button>
          <span className="font-heading text-lg text-[#253551]">Panel</span>
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Navegación principal">
          {navItems.map((item) => {
            const isReschedule = item.href === "/panel/reprogramaciones";
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
                <span>{item.label}</span>
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
      </aside>

      <main className="px-6 py-8 min-h-screen overflow-y-auto">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mb-4 text-[#253551] hover:text-[#1c2a40] transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
