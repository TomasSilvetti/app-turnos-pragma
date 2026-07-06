"use client";

// El effect sincroniza props→estado al abrir el modal.
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal";
import { TimePicker24h } from "@/components/ui/TimePicker24h";
import { CALENDAR_COLORS, DIAS_CORTOS, MESES, fromDateStr } from "@/lib/notas/calendar";

export type CalendarEventValues = {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
};

function fechaBonita(dateStr: string): string {
  const d = fromDateStr(dateStr);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function CalendarEventModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: CalendarEventValues;
  onClose: () => void;
  onSave: (v: CalendarEventValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [title, setTitle] = useState(initial.title);
  const [color, setColor] = useState(initial.color);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setStartTime(initial.startTime);
      setEndTime(initial.endTime);
      setTitle(initial.title);
      setColor(initial.color);
      setGuardando(false);
    }
  }, [open, initial]);

  const guardar = async () => {
    setGuardando(true);
    await onSave({ date: initial.date, startTime, endTime, title: title.trim(), color });
    setGuardando(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "Nueva actividad" : "Editar actividad"}>
      <div className="space-y-5">
        <p className="text-sm font-medium capitalize text-muted-foreground">{fechaBonita(initial.date)}</p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Actividad</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: reunión, gimnasio, estudiar…"
            maxLength={200}
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Desde</label>
            <TimePicker24h value={startTime} onChange={setStartTime} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Hasta</label>
            <TimePicker24h value={endTime} onChange={setEndTime} dropdownAlign="right" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2">
            {CALENDAR_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-label={`Color ${c.name}`}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform",
                  color === c.name ? "scale-110 border-foreground" : "border-transparent"
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {mode === "edit" && onDelete ? (
            <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Eliminar actividad">
              <Trash2 />
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando || startTime >= endTime}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
        {startTime >= endTime && (
          <p className="-mt-2 text-xs text-destructive">La hora de fin debe ser mayor que la de inicio.</p>
        )}
      </div>
    </Modal>
  );
}
