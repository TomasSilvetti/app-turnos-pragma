"use client";

import { useEffect, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  className?: string;
};

// Lunes → domingo, en línea con la config de horarios.
const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function aVisible(v: string): string {
  if (!v) return "";
  const d = parseISO(v);
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

// Calendario propio para elegir un feriado, con los tokens semánticos de la app
// (border/background/primary/muted) para que armonice con la página de horarios.
export function FeriadoDatePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [mesVista, setMesVista] = useState<Date>(() => {
    const d = value ? parseISO(value) : new Date();
    return isValid(d) ? d : new Date();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const seleccionada = value && isValid(parseISO(value)) ? parseISO(value) : null;

  // Al abrir, encuadrar el mes en la fecha ya elegida (si hay).
  function alternar() {
    setOpen((abierto) => {
      if (!abierto && seleccionada) setMesVista(seleccionada);
      return !abierto;
    });
  }
  const inicioMes = startOfMonth(mesVista);
  const dias = eachDayOfInterval({ start: inicioMes, end: endOfMonth(mesVista) });
  const offsetPrimerDia = (getDay(inicioMes) + 6) % 7; // lunes primero

  function elegir(dia: Date) {
    onChange(format(dia, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={alternar}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2 text-left text-sm outline-none transition-colors",
          open ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-primary/60"
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn(seleccionada ? "text-foreground" : "text-muted-foreground")}>
          {seleccionada ? aVisible(value) : "dd/mm/aaaa"}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-64 rounded-xl border border-border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMesVista((m) => subMonths(m, 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold capitalize">
              {format(mesVista, "MMMM yyyy", { locale: es })}
            </span>
            <button
              type="button"
              onClick={() => setMesVista((m) => addMonths(m, 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="mb-2 border-t border-border" />

          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: offsetPrimerDia }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {dias.map((dia) => {
              const esSel = seleccionada ? isSameDay(dia, seleccionada) : false;
              const esHoy = isSameDay(dia, new Date());
              return (
                <button
                  key={dia.toISOString()}
                  type="button"
                  onClick={() => elegir(dia)}
                  aria-pressed={esSel}
                  aria-label={format(dia, "d 'de' MMMM", { locale: es })}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors",
                    esSel
                      ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                      : esHoy
                        ? "font-bold text-primary ring-1 ring-primary"
                        : "text-foreground hover:bg-muted"
                  )}
                >
                  {format(dia, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
