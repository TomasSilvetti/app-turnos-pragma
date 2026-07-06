"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/useCalendar";
import { DIAS_CORTOS, MESES, hoyStr, monthGrid, ocupacionColor, ocupacionPct, toDateStr } from "@/lib/notas/calendar";

export function MonthView({
  year,
  month,
  events,
  onPrev,
  onNext,
  onSelectDay,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (dateStr: string) => void;
}) {
  const dias = monthGrid(year, month);
  const hoy = hoyStr();

  const porDia = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const arr = porDia.get(ev.date) ?? [];
    arr.push(ev);
    porDia.set(ev.date, arr);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {MESES[month]} <span className="text-muted-foreground">{year}</span>
        </h2>
        <div className="flex gap-1">
          <button onClick={onPrev} aria-label="Mes anterior" className="rounded-lg border border-border p-1.5 transition-colors hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={onNext} aria-label="Mes siguiente" className="rounded-lg border border-border p-1.5 transition-colors hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}

        {dias.map((d) => {
          const ds = toDateStr(d);
          const delMes = d.getMonth() === month;
          const esHoy = ds === hoy;
          const evs = porDia.get(ds) ?? [];
          const conEventos = evs.length > 0;
          const pctOcup = conEventos ? ocupacionPct(evs) : 0;
          return (
            <button
              key={ds}
              onClick={() => onSelectDay(ds)}
              style={conEventos ? { backgroundColor: ocupacionColor(pctOcup) } : undefined}
              className={cn(
                "flex min-h-[64px] flex-col items-start justify-between gap-1 rounded-lg border border-border/60 p-1.5 text-left transition-colors hover:border-primary/40",
                !conEventos && "hover:bg-muted/40",
                !delMes && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  esHoy && "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                )}
              >
                {d.getDate()}
              </span>
              {conEventos && (
                <span
                  className="self-end rounded-md bg-background/70 px-1.5 py-0.5 text-[11px] font-bold leading-none text-foreground"
                  title={`${pctOcup}% ocupado (6:00–24:00)`}
                >
                  {pctOcup}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
