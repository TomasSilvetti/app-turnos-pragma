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
  onSubmit: (data: ScheduleConfigFormData) => Promise<boolean | void> | boolean | void;
  initialData?: ScheduleConfig & { serviceTypeIds?: string[] };
  serviceTypes: ServiceType[];
  error?: string;
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
  error,
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
    daysOfWeek.length === 0 ||
    serviceTypeIds.length === 0;

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

  async function handleSubmit() {
    if (saveDisabled) return;
    const result = await onSubmit({ nombre: nombre.trim(), startTime, endTime, intervalMinutes, daysOfWeek, serviceTypeIds });
    if (result !== false) onClose();
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
      <div className="w-full max-w-lg rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0DB] dark:border-[#2d3548] shrink-0">
          <h2 id="schedule-modal-title" className="font-heading text-lg text-[var(--brand-color)] dark:text-[#93c5fd]">
            {isEditing ? "Editar horario" : "Agregar horario"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-md p-1 text-[#2A2829]/50 dark:text-[#94a3b8] hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] hover:text-[#2A2829] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">

          {/* Nombre */}
          <div>
            <label htmlFor="schedule-nombre" className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-1">
              Nombre <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </label>
            <input
              id="schedule-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Lunes a viernes mañana"
              className="w-full rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#2A2829]/40 dark:placeholder:text-slate-500 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            />
          </div>

          {/* Horario */}
          <div>
            <p className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-2">
              Horario de atención <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="schedule-start" className="block text-xs text-[#2A2829]/60 dark:text-[#94a3b8] mb-1">
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
                <label htmlFor="schedule-end" className="block text-xs text-[#2A2829]/60 dark:text-[#94a3b8] mb-1">
                  Cierre
                </label>
                <TimePicker24h
                  id="schedule-end"
                  value={endTime}
                  onChange={setEndTime}
                  hasError={endTimeInvalid}
                  dropdownAlign="right"
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
            <p className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-2">
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
                      ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white"
                      : "border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b]"
                  )}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          {/* Días */}
          <div>
            <p className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-2">
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
                      ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white"
                      : "border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b]"
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
              <p className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-2">
                Tipos de turno disponibles
              </p>
              {serviceTypeIds.length === 0 && (
                <p className="mb-2 text-xs text-red-500 dark:text-red-400">
                  Seleccioná al menos un tipo de turno para guardar.
                </p>
              )}
              <div className="space-y-2">
                {serviceTypes.map((tipo) => {
                  const checked = serviceTypeIds.includes(tipo.id);
                  return (
                    <label
                      key={tipo.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                        checked
                          ? "border-[var(--brand-color)] bg-[#eef1f6] text-[var(--brand-color)]"
                          : "border-[#E0E0DB] dark:border-[#2d3548] text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b]"
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
                            ? "border-[var(--brand-color)] bg-[var(--brand-color)]"
                            : "border-[#C8C8C2] dark:border-[#2d3548] bg-white dark:bg-[#0f172a]"
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

        {/* Error de conflicto */}
        {error && (
          <div className="mx-5 mb-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#E0E0DB] dark:border-[#2d3548] shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveDisabled}
            className="bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
