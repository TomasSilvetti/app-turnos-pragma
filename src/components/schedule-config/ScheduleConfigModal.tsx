"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimePicker24h } from "@/components/ui/TimePicker24h";
import { cn } from "@/lib/utils";
import type { ScheduleConfig } from "./ScheduleConfigList";

export type ServiceType = {
  id: string;
  titulo: string;
};

export type ScheduleConfigFormData = {
  nombre: string;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  daysOfWeek: string[];
  serviceTypeIds: string[];
};

type ScheduleConfigModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ScheduleConfigFormData) => void;
  initialData?: ScheduleConfig & { serviceTypeIds?: string[] };
  serviceTypes: ServiceType[];
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const DIAS_NOMBRE: Record<string, string> = {
  L: "Lun",
  M: "Mar",
  X: "Mié",
  J: "Jue",
  V: "Vie",
  S: "Sáb",
  D: "Dom",
};
const INTERVALOS = [15, 30, 45, 60] as const;

export function ScheduleConfigModal({
  open,
  onClose,
  onSubmit,
  initialData,
  serviceTypes,
}: ScheduleConfigModalProps) {
  const isEditing = !!initialData;

  const [nombre, setNombre] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(30);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [serviceTypeIds, setServiceTypeIds] = useState<string[]>([]);

  // Pre-cargar datos en modo edición
  useEffect(() => {
    if (open && initialData) {
      setNombre(initialData.nombre);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setIntervalMinutes(initialData.intervalMinutes);
      setDaysOfWeek(initialData.daysOfWeek);
      setServiceTypeIds(initialData.serviceTypeIds ?? []);
    } else if (open && !initialData) {
      setNombre("");
      setStartTime("");
      setEndTime("");
      setIntervalMinutes(30);
      setDaysOfWeek([]);
      setServiceTypeIds([]);
    }
  }, [open, initialData]);

  if (!open) return null;

  const endTimeInvalid =
    startTime !== "" && endTime !== "" && endTime <= startTime;

  const saveDisabled =
    nombre.trim() === "" ||
    startTime === "" ||
    endTime === "" ||
    endTimeInvalid ||
    daysOfWeek.length === 0;

  function toggleDay(dia: string) {
    setDaysOfWeek((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  }

  function toggleServiceType(id: string) {
    setServiceTypeIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (saveDisabled) return;
    onSubmit({ nombre: nombre.trim(), startTime, endTime, intervalMinutes, daysOfWeek, serviceTypeIds });
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg rounded-lg border border-[#E0E0DB] bg-white shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0DB] shrink-0">
          <h2 id="schedule-modal-title" className="font-heading text-lg text-[#253551]">
            {isEditing ? "Editar horario" : "Agregar horario"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-md p-1 text-[#2A2829]/50 hover:bg-[#F4F5F7] hover:text-[#2A2829] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">

          {/* Nombre */}
          <div>
            <label htmlFor="schedule-nombre" className="block text-sm font-medium text-[#2A2829] mb-1">
              Nombre <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </label>
            <input
              id="schedule-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Lunes a viernes mañana"
              className="w-full rounded-md border border-[#E0E0DB] bg-white px-3 py-2 text-sm text-[#2A2829] placeholder:text-[#2A2829]/40 focus:border-[#253551] focus:outline-none focus:ring-1 focus:ring-[#253551]"
            />
          </div>

          {/* Horario */}
          <div>
            <p className="block text-sm font-medium text-[#2A2829] mb-2">
              Horario de atención <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="schedule-start" className="block text-xs text-[#2A2829]/60 mb-1">
                  Apertura
                </label>
                <TimePicker24h
                  id="schedule-start"
                  value={startTime}
                  onChange={setStartTime}
                  hasError={false}
                />
              </div>
              <div>
                <label htmlFor="schedule-end" className="block text-xs text-[#2A2829]/60 mb-1">
                  Cierre
                </label>
                <TimePicker24h
                  id="schedule-end"
                  value={endTime}
                  onChange={setEndTime}
                  hasError={endTimeInvalid}
                />
              </div>
            </div>
            {endTimeInvalid && (
              <p className="mt-1 text-xs text-[#ef4444]">
                La hora de cierre debe ser posterior a la de apertura.
              </p>
            )}
          </div>

          {/* Intervalo */}
          <div>
            <p className="block text-sm font-medium text-[#2A2829] mb-2">
              Intervalo entre turnos
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Seleccioná el intervalo en minutos"
            >
              {INTERVALOS.map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setIntervalMinutes(min)}
                  aria-pressed={intervalMinutes === min}
                  className={cn(
                    "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                    intervalMinutes === min
                      ? "border-[#253551] bg-[#253551] text-white"
                      : "border-[#E0E0DB] bg-white text-[#2A2829] hover:bg-[#F4F5F7]"
                  )}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          {/* Días */}
          <div>
            <p className="block text-sm font-medium text-[#2A2829] mb-2">
              Días habilitados <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Seleccioná los días de atención"
            >
              {DIAS.map((dia) => (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDay(dia)}
                  aria-pressed={daysOfWeek.includes(dia)}
                  className={cn(
                    "h-10 w-12 rounded-md border text-xs font-medium transition-colors",
                    daysOfWeek.includes(dia)
                      ? "border-[#253551] bg-[#253551] text-white"
                      : "border-[#E0E0DB] bg-white text-[#2A2829] hover:bg-[#F4F5F7]"
                  )}
                >
                  {DIAS_NOMBRE[dia]}
                </button>
              ))}
            </div>
          </div>

          {/* Tipos de turno */}
          {serviceTypes.length > 0 && (
            <div>
              <p className="block text-sm font-medium text-[#2A2829] mb-2">
                Tipos de turno disponibles
              </p>
              <div className="space-y-2">
                {serviceTypes.map((tipo) => {
                  const checked = serviceTypeIds.includes(tipo.id);
                  return (
                    <label
                      key={tipo.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                        checked
                          ? "border-[#253551] bg-[#eef1f6] text-[#253551]"
                          : "border-[#E0E0DB] text-[#2A2829] hover:bg-[#F4F5F7]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServiceType(tipo.id)}
                        className="sr-only"
                        aria-label={tipo.titulo}
                      />
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-[#253551] bg-[#253551]"
                            : "border-[#C8C8C2] bg-white"
                        )}
                        aria-hidden="true"
                      >
                        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      {tipo.titulo}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#E0E0DB] shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveDisabled}
            className="bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
