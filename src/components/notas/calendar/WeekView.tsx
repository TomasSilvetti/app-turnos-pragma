"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/useCalendar";
import {
  DIAS_CORTOS,
  FRANJAS,
  MESES,
  type Franja,
  colorHex,
  franjaDeHora,
  hoyStr,
  toDateStr,
  weekDays,
} from "@/lib/notas/calendar";

export function WeekView({
  refDate,
  events,
  onPrev,
  onNext,
  onSelectFranja,
  onEditEvent,
}: {
  refDate: Date;
  events: CalendarEvent[];
  onPrev: () => void;
  onNext: () => void;
  onSelectFranja: (dateStr: string, franja: Franja) => void;
  onEditEvent: (ev: CalendarEvent) => void;
}) {
  const dias = weekDays(refDate);
  const hoy = hoyStr();

  // eventos[fecha][franja] = CalendarEvent[]
  const porDiaFranja = new Map<string, Map<Franja, CalendarEvent[]>>();
  for (const ev of events) {
    const f = franjaDeHora(ev.startTime);
    const m = porDiaFranja.get(ev.date) ?? new Map<Franja, CalendarEvent[]>();
    const arr = m.get(f) ?? [];
    arr.push(ev);
    m.set(f, arr);
    porDiaFranja.set(ev.date, m);
  }

  const primero = dias[0];
  const ultimo = dias[6];
  const rango =
    primero.getMonth() === ultimo.getMonth()
      ? `${primero.getDate()}–${ultimo.getDate()} ${MESES[primero.getMonth()]}`
      : `${primero.getDate()} ${MESES[primero.getMonth()].slice(0, 3)} – ${ultimo.getDate()} ${MESES[ultimo.getMonth()].slice(0, 3)}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{rango}</h2>
        <div className="flex gap-1">
          <button onClick={onPrev} aria-label="Semana anterior" className="rounded-lg border border-border p-1.5 transition-colors hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={onNext} aria-label="Semana siguiente" className="rounded-lg border border-border p-1.5 transition-colors hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {dias.map((d) => {
          const ds = toDateStr(d);
          const esHoy = ds === hoy;
          const franjas = porDiaFranja.get(ds);
          return (
            <div key={ds} className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-semibold",
                    esHoy && "text-primary"
                  )}
                >
                  {DIAS_CORTOS[d.getDay()]} {d.getDate()}
                  {esHoy && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Hoy</span>}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {FRANJAS.map((fr) => {
                  const evs = franjas?.get(fr.id) ?? [];
                  return (
                    <div key={fr.id} className="flex flex-col gap-1">
                      <button
                        onClick={() => onSelectFranja(ds, fr.id)}
                        className="group flex items-center justify-between gap-1 rounded-lg bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <span>{fr.emoji} {fr.label}</span>
                        <Plus className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                      {evs.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => onEditEvent(ev)}
                          className="rounded-lg px-2 py-1 text-left text-[11px] font-medium text-white transition-transform hover:scale-[1.02]"
                          style={{ backgroundColor: colorHex(ev.color) }}
                        >
                          <span className="block truncate">{ev.title || "Ocupado"}</span>
                          <span className="block opacity-90">{ev.startTime}–{ev.endTime}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
