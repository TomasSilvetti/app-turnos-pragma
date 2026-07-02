"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt, LayoutGrid, PackageCheck } from "lucide-react";
import { useEmpleado } from "./EmpleadoProvider";
import { BotonesApp } from "./BotonesApp";
import { LavSelect } from "./LavSelect";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/lavanderia", label: "Tablero", icon: LayoutGrid },
  { href: "/lavanderia/terminados", label: "Terminados", icon: PackageCheck },
];

export function LavNavbar() {
  const { empleados, empleadoActivo, seleccionar } = useEmpleado();
  const pathname = usePathname();

  // El area admin tiene su propio shell (sidebar): no mostramos el navbar de empleado.
  if (pathname.startsWith("/lavanderia/admin")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 shadow-[0_1px_12px_-4px_rgba(16,24,40,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/lavanderia" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_4px_12px_-2px_rgba(56,120,255,0.45)]">
              <Shirt className="size-5" />
            </span>
            <span className="hidden text-[15px] sm:inline">Lavandería</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const activo = href === "/lavanderia" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    activo
                      ? "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <BotonesApp />
          <LavSelect
            value={empleadoActivo?.id ?? ""}
            onChange={(id) => id && seleccionar(id)}
            placeholder="Elegir empleado"
            aria-label="Empleado activo"
            className="w-44"
            triggerClassName="rounded-full border-white/70 bg-white/80 pl-4 pr-3 font-medium text-slate-700 shadow-sm backdrop-blur hover:border-sky-300"
            options={empleados.map((e) => ({ value: e.id, label: e.nombre }))}
          />
        </div>
      </div>
    </header>
  );
}
