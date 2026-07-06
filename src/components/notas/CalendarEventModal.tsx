"use client";

// El effect sincroniza props→estado al abrir el modal.
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal";
import { TimePicker24h } from "@/components/ui/TimePicker24h";
import { Bell } from "lucide-react";
import { CALENDAR_COLORS, DIAS_CORTOS, MESES, fromDateStr } from "@/lib/notas/calendar";

export type CalendarEventValues = {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
  reminderOffsets: number[];
};

// Presets de "cuánto antes" avisar (minutos). Se pueden combinar varios.
const PRESETS_RECORDATORIO: { min: number; label: string }[] = [
  { min: 0, label: "Al momento" },
  { min: 5, label: "5 min antes" },
  { min: 10, label: "10 min antes" },
  { min: 15, label: "15 min antes" },
  { min: 30, label: "30 min antes" },
  { min: 60, label: "1 hora antes" },
  { min: 120, label: "2 horas antes" },
  { min: 1440, label: "1 día antes" },
];

function etiquetaOffset(min: number): string {
  const p = PRESETS_RECORDATORIO.find((x) => x.min === min);
  if (p) return p.label;
  if (min === 0) return "Al momento";
  if (min % 1440 === 0) return `${min / 1440} día${min / 1440 > 1 ? "s" : ""} antes`;
  if (min % 60 === 0) return `${min / 60} h antes`;
  return `${min} min antes`;
}

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
  const [recordatorios, setRecordatorios] = useState<number[]>(initial.reminderOffsets ?? []);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setStartTime(initial.startTime);
      setEndTime(initial.endTime);
      setTitle(initial.title);
      setColor(initial.color);
      setRecordatorios(initial.reminderOffsets ?? []);
      setGuardando(false);
    }
  }, [open, initial]);

  const toggleRecordatorio = (min: number) => {
    setRecordatorios((prev) =>
      prev.includes(min) ? prev.filter((x) => x !== min) : [...prev, min].sort((a, b) => a - b)
    );
  };

  const guardar = async () => {
    setGuardando(true);
    await onSave({
      date: initial.date,
      startTime,
      endTime,
      title: title.trim(),
      color,
      reminderOffsets: recordatorios,
    });
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

        {/* Recordatorios: se pueden activar varios (cuánto antes avisar). */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <Bell className="size-4 text-muted-foreground" />
            Recordatorios
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS_RECORDATORIO.map((p) => {
              const activo = recordatorios.includes(p.min);
              return (
                <button
                  key={p.min}
                  type="button"
                  onClick={() => toggleRecordatorio(p.min)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    activo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {recordatorios.length > 0 ? (
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Avisaré {recordatorios.map(etiquetaOffset).join(", ").toLowerCase()}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin recordatorios. Tocá una opción para agregar (podés elegir varias).</p>
          )}
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
