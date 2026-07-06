"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { useCalendar, type CalendarEvent } from "@/hooks/useCalendar";
import { NotasNav } from "@/components/notas/NotasNav";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { OfflineBadge } from "@/components/notas/OfflineBadge";
import { MonthView } from "@/components/notas/calendar/MonthView";
import { WeekView } from "@/components/notas/calendar/WeekView";
import { CalendarEventModal, type CalendarEventValues } from "@/components/notas/CalendarEventModal";
import {
  FRANJAS,
  type Franja,
  addDays,
  addMonths,
  monthGrid,
  toDateStr,
  weekDays,
} from "@/lib/notas/calendar";

type Vista = "month" | "week";
type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  eventId?: string;
  values: CalendarEventValues;
};

const HOY = new Date();

export default function CalendarioPage() {
  const { ready, deviceId } = useNotaDevice();
  const deviceReady = ready && Boolean(deviceId);

  const [vista, setVista] = useState<Vista>("month");
  const [year, setYear] = useState(HOY.getFullYear());
  const [month, setMonth] = useState(HOY.getMonth());
  const [weekRef, setWeekRef] = useState<Date>(HOY);

  // Rango visible según la vista, para pedir sólo los eventos necesarios.
  const [from, to] = useMemo(() => {
    if (vista === "month") {
      const grid = monthGrid(year, month);
      return [toDateStr(grid[0]), toDateStr(grid[grid.length - 1])];
    }
    const dias = weekDays(weekRef);
    return [toDateStr(dias[0]), toDateStr(dias[6])];
  }, [vista, year, month, weekRef]);

  const { events, cargando, crear, editar, eliminar } = useCalendar(deviceReady, from, to);

  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    values: { date: "", startTime: "09:00", endTime: "10:00", title: "", color: "blue" },
  });

  const abrirCrearDia = (dateStr: string) => {
    setModal({
      open: true,
      mode: "create",
      values: { date: dateStr, startTime: "09:00", endTime: "10:00", title: "", color: "blue" },
    });
  };

  const abrirCrearFranja = (dateStr: string, franja: Franja) => {
    const fr = FRANJAS.find((f) => f.id === franja)!;
    setModal({
      open: true,
      mode: "create",
      values: { date: dateStr, startTime: fr.start, endTime: fr.end, title: "", color: "blue" },
    });
  };

  const abrirCrearSlot = (dateStr: string, startTime: string, endTime: string) => {
    setModal({
      open: true,
      mode: "create",
      values: { date: dateStr, startTime, endTime, title: "", color: "blue" },
    });
  };

  const abrirEditar = (ev: CalendarEvent) => {
    setModal({
      open: true,
      mode: "edit",
      eventId: ev.id,
      values: { date: ev.date, startTime: ev.startTime, endTime: ev.endTime, title: ev.title, color: ev.color },
    });
  };

  const guardar = async (v: CalendarEventValues) => {
    if (modal.mode === "edit" && modal.eventId) await editar(modal.eventId, v);
    else await crear(v);
    setModal((m) => ({ ...m, open: false }));
  };

  const borrar = async () => {
    if (modal.eventId) await eliminar(modal.eventId);
    setModal((m) => ({ ...m, open: false }));
  };

  const prevMonth = () => {
    const { year: y, month: mo } = addMonths(year, month, -1);
    setYear(y);
    setMonth(mo);
  };
  const nextMonth = () => {
    const { year: y, month: mo } = addMonths(year, month, 1);
    setYear(y);
    setMonth(mo);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-2">
        <NotasNav actual="calendario" />
        <div className="flex items-center gap-2">
          <OfflineBadge />
          <ThemeToggle />
        </div>
      </header>

      {/* Toggle de vista mes / semana */}
      <div className="mb-5 flex rounded-lg border border-border p-1">
        <button
          onClick={() => setVista("month")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            vista === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          Mes
        </button>
        <button
          onClick={() => setVista("week")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            vista === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          Semana
        </button>
      </div>

      {!deviceReady ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="relative">
          {cargando && (
            <div className="pointer-events-none absolute right-0 top-0 z-10">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {vista === "month" ? (
            <MonthView
              year={year}
              month={month}
              events={events}
              onPrev={prevMonth}
              onNext={nextMonth}
              onSelectDay={abrirCrearDia}
            />
          ) : (
            <WeekView
              refDate={weekRef}
              events={events}
              onPrev={() => setWeekRef((d) => addDays(d, -7))}
              onNext={() => setWeekRef((d) => addDays(d, 7))}
              onSelectFranja={abrirCrearFranja}
              onSelectSlot={abrirCrearSlot}
              onEditEvent={abrirEditar}
            />
          )}
        </div>
      )}

      <CalendarEventModal
        open={modal.open}
        mode={modal.mode}
        initial={modal.values}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={guardar}
        onDelete={modal.mode === "edit" ? borrar : undefined}
      />
    </div>
  );
}
