"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Perfil", href: "/dashboard/perfil" },
  { label: "Turnos", href: "/dashboard/turnos" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      {/* Side panel */}
      <aside
        className={cn(
          "shrink-0 border-r border-[#E0E0DB] bg-white flex flex-col transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-56" : "w-0 border-r-0"
        )}
      >
        <div className="px-5 py-6 border-b border-[#E0E0DB] flex items-center gap-3 min-w-[14rem]">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[#253551] hover:text-[#1a2740] transition-colors"
            aria-label="Cerrar menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading text-lg text-[#253551]">Panel</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 min-w-[14rem]" aria-label="Navegación principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-[#253551] text-white font-medium"
                  : "text-[#2A2829] hover:bg-[#F4F5F7]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 overflow-y-auto">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mb-4 text-[#253551] hover:text-[#1a2740] transition-colors"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
