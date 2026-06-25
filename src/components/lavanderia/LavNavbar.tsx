"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt } from "lucide-react";
import { useEmpleado } from "./EmpleadoProvider";
import { BotonesApp } from "./BotonesApp";
import { LavSelect } from "./LavSelect";

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
