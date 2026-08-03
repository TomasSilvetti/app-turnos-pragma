"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, CalendarDays, Check, Hammer } from "lucide-react";

type Seccion = "notas" | "calendario" | "trabajo";

const OPCIONES: { id: Seccion; label: string; href: string; icon: typeof FileText }[] = [
  { id: "notas", label: "Notas", href: "/notas", icon: FileText },
  { id: "calendario", label: "Calendario", href: "/notas/calendario", icon: CalendarDays },
  { id: "trabajo", label: "Trabajo", href: "/notas/trabajo", icon: Hammer },
];

// Dropdown en la parte superior para cambiar entre las secciones de la app.
export function NotasNav({ actual }: { actual: Seccion }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [abierto]);

  const activa = OPCIONES.find((o) => o.id === actual) ?? OPCIONES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-2xl font-bold tracking-tight transition-colors hover:text-primary"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        {activa.label}
        <ChevronDown className={`size-5 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          {OPCIONES.map((o) => {
            const Icon = o.icon;
            const esActual = o.id === actual;
            return (
              <button
                key={o.id}
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  if (!esActual) router.push(o.href);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1">{o.label}</span>
                {esActual && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
