"use client";

import { ChevronLeft, ChevronRight, Plus, Sunrise, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/useCalendar";
import {
  DIAS_CORTOS,
  FRANJAS,
  MESES,
  TIMELINE_END,
  TIMELINE_START,
  type Franja,
  colorHex,
  formatDur,
  hoyStr,
  minutesToTime,
  toDateStr,
  weekDays,
} from "@/lib/notas/calendar";
import { timeToMinutes } from "@/lib/notas/time";

const ICONO_FRANJA: Record<Franja, typeof Sunrise> = {
  manana: Sunrise,
  tarde: Sun,
  noche: Moon,
};

const SPAN = TIMELINE_END - TIMELINE_START;
const clamp = (n: number) => Math.max(TIMELINE_START, Math.min(TIMELINE_END, n));
const pct = (min: number) => ((clamp(min) - TIMELINE_START) / SPAN) * 100;

type Seg = { s: number; e: number };

// Huecos libres (complemento de los intervalos ocupados dentro de 6:00–24:00).
function huecos(eventos: CalendarEvent[]): Seg[] {
  const ocup = eventos
    .map((ev) => ({ s: clamp(timeToMinutes(ev.startTime)), e: clamp(timeToMinutes(ev.endTime)) }))
    .filter((x) => x.e > x.s)
    .sort((a, b) => a.s - b.s);

  const merged: Seg[] = [];
  for (const it of ocup) {
    const last = merged[merged.length - 1];
    if (!last || it.s > last.e) merged.push({ ...it });
    else last.e = Math.max(last.e, it.e);
  }

  const gaps: Seg[] = [];
  let prev = TIMELINE_START;
  for (const m of merged) {
    if (m.s > prev) gaps.push({ s: prev, e: m.s });
    prev = m.e;
  }
  if (prev < TIMELINE_END) gaps.push({ s: prev, e: TIMELINE_END });
  return gaps;
}

export function WeekView({
  refDate,
  events,
  onPrev,
  onNext,
  onSelectFranja,
  onSelectSlot,
  onEditEvent,
}: {
  refDate: Date;
  events: CalendarEvent[];
  onPrev: () => void;
  onNext: () => void;
  onSelectFranja: (dateStr: string, franja: Franja) => void;
  onSelectSlot: (dateStr: string, startTime: string, endTime: string) => void;
  onEditEvent: (ev: CalendarEvent) => void;
}) {
  const dias = weekDays(refDate);
  const hoy = hoyStr();

  const porDia = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const arr = porDia.get(ev.date) ?? [];
    arr.push(ev);
    porDia.set(ev.date, arr);
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
          const evsDia = (porDia.get(ds) ?? []).slice().sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          const gaps = huecos(evsDia);

          return (
            <div key={ds} className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className={cn("flex items-center gap-1.5 text-sm font-semibold", esHoy && "text-primary")}>
                  {DIAS_CORTOS[d.getDay()]} {d.getDate()}
                  {esHoy && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Hoy</span>}
                </span>
              </div>

              {/* Accesos rápidos por franja */}
              <div className="mb-2.5 grid grid-cols-3 gap-2">
                {FRANJAS.map((fr) => {
                  const Icon = ICONO_FRANJA[fr.id];
                  return (
                    <button
                      key={fr.id}
                      onClick={() => onSelectFranja(ds, fr.id)}
                      className="group flex items-center justify-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Icon className="size-3.5" />
                      <span>{fr.label}</span>
                      <Plus className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>

              {/* Línea de tiempo 6:00 → 24:00 */}
              <div className="relative h-10 w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                {/* Huecos disponibles (clickeables para crear en ese tramo) */}
                {gaps.map((g) => {
                  const dur = g.e - g.s;
                  const ancho = pct(g.e) - pct(g.s);
                  return (
                    <button
                      key={`gap-${g.s}`}
                      onClick={() => onSelectSlot(ds, minutesToTime(g.s), minutesToTime(Math.min(g.s + 60, g.e)))}
                      title={`Libre ${formatDur(dur)} · tocá para agregar`}
                      className="group absolute inset-y-0 flex items-center justify-center transition-colors hover:bg-primary/5"
                      style={{ left: `${pct(g.s)}%`, width: `${ancho}%` }}
                    >
                      {ancho > 7 && (
                        <span className="truncate px-1 text-[10px] font-medium text-muted-foreground/70">
                          {formatDur(dur)}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Actividades ocupadas (clickeables para editar) */}
                {evsDia.map((ev) => {
                  const s = clamp(timeToMinutes(ev.startTime));
                  const e = clamp(timeToMinutes(ev.endTime));
                  if (e <= s) return null;
                  const ancho = pct(e) - pct(s);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEditEvent(ev)}
                      title={`${ev.title || "Ocupado"} · ${ev.startTime}–${ev.endTime}`}
                      className="absolute inset-y-0.5 flex items-center overflow-hidden rounded-md px-1.5 text-left text-white shadow-sm transition-transform hover:z-10 hover:scale-[1.03]"
                      style={{ left: `${pct(s)}%`, width: `${ancho}%`, backgroundColor: colorHex(ev.color) }}
                    >
                      <span className="truncate text-[10px] font-semibold leading-none">
                        {ev.title || "Ocupado"}
                      </span>
                    </button>
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
