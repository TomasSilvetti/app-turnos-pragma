"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt, ChevronDown } from "lucide-react";
import { useEmpleado } from "./EmpleadoProvider";
import { BotonesApp } from "./BotonesApp";

export function LavNavbar() {
  const { empleados, empleadoActivo, seleccionar } = useEmpleado();
  const pathname = usePathname();

  // El area admin tiene su propio shell (sidebar): no mostramos el navbar de empleado.
  if (pathname.startsWith("/lavanderia/admin")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 shadow-[0_1px_12px_-4px_rgba(16,24,40,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
        <Link href="/lavanderia" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_4px_12px_-2px_rgba(56,120,255,0.45)]">
            <Shirt className="size-5" />
          </span>
          <span className="text-[15px]">Lavandería</span>
        </Link>

        <div className="flex items-center gap-2">
          <BotonesApp />
          <div className="relative">
            <select
              value={empleadoActivo?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (id) seleccionar(id);
              }}
              className="h-9 appearance-none rounded-full border border-white/70 bg-white/80 pl-4 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur transition-shadow focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
              aria-label="Empleado activo"
            >
              <option value="" disabled>
                Elegir empleado
              </option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
