"use client";

// El effect resetea el formulario cuando se abre el modal (sincroniza props→estado).
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal";
import { TimeField } from "./editor/TimeField";

// L,M,X,J,V,S,D en el orden pedido. value = getDay() (0=Dom..6=Sáb).
const DIAS = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "X", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 },
];

export type ReminderValues = { time: string; daysOfWeek: number[]; text: string };

export function ReminderModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: ReminderValues;
  onClose: () => void;
  onSave: (v: ReminderValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setTime(initial?.time ?? "09:00");
      setDays(initial?.daysOfWeek ?? []);
      setText(initial?.text ?? "");
      setGuardando(false);
    }
  }, [open, initial]);

  const toggleDay = (v: number) =>
    setDays((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));

  const guardar = async () => {
    setGuardando(true);
    await onSave({ time, daysOfWeek: days, text: text.trim() });
    setGuardando(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "Nuevo recordatorio" : "Editar recordatorio"}>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Hora</label>
          <TimeField value={time} onChange={setTime} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Repetir</label>
          <div className="flex gap-1.5">
            {DIAS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                aria-pressed={days.includes(d.value)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                  days.includes(d.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {days.length === 0
              ? "Sin días seleccionados: suena una sola vez en la próxima ocurrencia de esa hora."
              : "Suena cada semana en los días marcados."}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nota (opcional)</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej: tomar la pastilla"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {mode === "edit" && onDelete ? (
            <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Eliminar recordatorio">
              <Trash2 />
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
