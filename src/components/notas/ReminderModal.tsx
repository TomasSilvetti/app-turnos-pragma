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

export type ReminderValues = {
  time: string;
  daysOfWeek: number[];
  text: string;
  intervalMinutes: number | null;
  endTime: string;
};

// Opciones de frecuencia para el recordatorio por intervalo.
const INTERVALOS = [
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
  { label: "3 horas", value: 180 },
  { label: "4 horas", value: 240 },
  { label: "6 horas", value: 360 },
  { label: "8 horas", value: 480 },
  { label: "12 horas", value: 720 },
];

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
  const [esIntervalo, setEsIntervalo] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [endTime, setEndTime] = useState("21:00");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setTime(initial?.time ?? "09:00");
      setDays(initial?.daysOfWeek ?? []);
      setText(initial?.text ?? "");
      setEsIntervalo((initial?.intervalMinutes ?? null) !== null);
      setIntervalMinutes(initial?.intervalMinutes ?? 60);
      setEndTime(initial?.endTime || "21:00");
      setGuardando(false);
    }
  }, [open, initial]);

  const toggleDay = (v: number) =>
    setDays((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));

  const guardar = async () => {
    setGuardando(true);
    await onSave({
      time,
      daysOfWeek: days,
      text: text.trim(),
      intervalMinutes: esIntervalo ? intervalMinutes : null,
      endTime: esIntervalo ? endTime : "",
    });
    setGuardando(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "Nuevo recordatorio" : "Editar recordatorio"}>
      <div className="space-y-5">
        {/* Tipo: hora fija vs intervalo recurrente */}
        <div className="flex rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setEsIntervalo(false)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !esIntervalo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Hora fija
          </button>
          <button
            type="button"
            onClick={() => setEsIntervalo(true)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              esIntervalo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Cada cierto tiempo
          </button>
        </div>

        {esIntervalo ? (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Frecuencia</label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                {INTERVALOS.map((i) => (
                  <option key={i.value} value={i.value}>
                    Cada {i.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Desde</label>
                <TimeField value={time} onChange={setTime} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hasta</label>
                <TimeField value={endTime} onChange={setEndTime} />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Hora</label>
            <TimeField value={time} onChange={setTime} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{esIntervalo ? "Días (opcional)" : "Repetir"}</label>
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
            {esIntervalo
              ? days.length === 0
                ? "Suena todos los días dentro de la franja horaria elegida."
                : "Suena en los días marcados, dentro de la franja horaria."
              : days.length === 0
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
