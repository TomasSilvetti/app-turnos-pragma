"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Shirt,
  Users,
  BarChart3,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/lavanderia/admin/tablero", label: "Tablero", icon: LayoutGrid },
  { href: "/lavanderia/admin/trabajos", label: "Trabajos", icon: Shirt },
  { href: "/lavanderia/admin/empleados", label: "Empleados", icon: Users },
  { href: "/lavanderia/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/lavanderia/admin/metricas", label: "Métricas", icon: BarChart3 },
];

const STORAGE_KEY = "lav_admin_sidebar_colapsado";

export function AdminSidebar({
  adminNombre,
  onLogout,
}: {
  adminNombre: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    // Estado inicial leido de localStorage (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColapsado(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = () => {
    setColapsado((v) => {
      const next = !v;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <nav
      className={cn(
        "flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-white/60 bg-white/60 p-2 backdrop-blur-xl",
        "md:h-full md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3 md:transition-[width]",
        colapsado ? "md:w-[4.5rem]" : "md:w-56"
      )}
    >
      {/* Encabezado: logo + colapsar (solo desktop) */}
      <div className="hidden items-center justify-between px-1 pb-2 md:flex">
        {!colapsado && (
          <Link href="/lavanderia/admin/tablero" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
              <Shirt className="size-4" />
            </span>
            <span className="text-sm text-slate-700">Admin</span>
          </Link>
        )}
        <button
          onClick={toggle}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-700",
            colapsado && "mx-auto"
          )}
        >
          {colapsado ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-1 flex-row gap-1 md:flex-col">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={colapsado ? label : undefined}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                colapsado && "md:justify-center md:px-2",
                activo
                  ? "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn(colapsado && "md:hidden")}>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Pie: usuario + salir */}
      <div className="mt-auto flex flex-row items-center gap-2 md:flex-col md:items-stretch md:border-t md:border-white/60 md:pt-3">
        {!colapsado && (
          <div className="hidden min-w-0 px-1 md:block">
            <p className="truncate text-xs font-medium text-slate-700">{adminNombre}</p>
            <p className="text-[11px] text-slate-400">Administrador</p>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600",
            colapsado && "md:justify-center md:px-2"
          )}
        >
          <LogOut className="size-4 shrink-0" />
          <span className={cn("md:inline", colapsado && "md:hidden")}>Salir</span>
        </button>
      </div>
    </nav>
  );
}
