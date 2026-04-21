"use client";

import { useState, useEffect } from "react";
import { X, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimePicker24h } from "@/components/ui/TimePicker24h";
import { cn } from "@/lib/utils";
import type { ScheduleConfig } from "./ScheduleConfigList";

export type ServiceType = {
  id: string;
  titulo: string;
  descripcion?: string;
  precio?: number;
  duracion?: number | null;
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
  modoTurno: "FIJO" | "POR_TIPO";
  onServiceTypesChange?: (types: ServiceType[]) => void;
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

type InlineFormState = "idle" | "create" | { id: string };

export function ScheduleConfigModal({
  open,
  onClose,
  onSubmit,
  initialData,
  serviceTypes,
  modoTurno,
  onServiceTypesChange,
  error,
}: ScheduleConfigModalProps) {
  const isEditing = !!initialData;

  const [nombre, setNombre] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(30);
  const [customInterval, setCustomInterval] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [serviceTypeIds, setServiceTypeIds] = useState<string[]>([]);

  // Copia local de service types para CRUD inline
  const [localTypes, setLocalTypes] = useState<ServiceType[]>([]);

  // Estado del formulario de tipo de turno (bottom sheet)
  const [inlineForm, setInlineForm] = useState<InlineFormState>("idle");
  const [inlineTitulo, setInlineTitulo] = useState("");
  const [inlineDescripcion, setInlineDescripcion] = useState("");
  const [inlinePrecio, setInlinePrecio] = useState("");
  const [inlineDuracion, setInlineDuracion] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);

  // Sincronizar localTypes desde props
  useEffect(() => {
    setLocalTypes(serviceTypes);
  }, [serviceTypes]);

  // Pre-cargar datos en modo edición
  useEffect(() => {
    if (open && initialData) {
      setNombre(initialData.nombre);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setIntervalMinutes(initialData.intervalMinutes);
      const isPreset = INTERVALOS.includes(initialData.intervalMinutes as typeof INTERVALOS[number]);
      setShowCustomInput(!isPreset);
      setCustomInterval(isPreset ? "" : String(initialData.intervalMinutes));
      setDaysOfWeek(initialData.daysOfWeek);
      setServiceTypeIds(initialData.serviceTypeIds ?? []);
    } else if (open && !initialData) {
      setNombre("");
      setStartTime("");
      setEndTime("");
      setIntervalMinutes(30);
      setShowCustomInput(false);
      setCustomInterval("");
      setDaysOfWeek([]);
      setServiceTypeIds([]);
    }
    // Resetear formulario inline al abrir/cerrar
    setInlineForm("idle");
    setInlineError(null);
  }, [open, initialData]);

  if (!open) return null;

  const endTimeInvalid =
    startTime !== "" && endTime !== "" && endTime <= startTime;

  const customIntervalInvalid =
    showCustomInput &&
    (customInterval.trim() === "" || parseInt(customInterval, 10) < 1);

  const hasTypesWithDuracion = localTypes.some(
    (t) => t.duracion != null && Number(t.duracion) > 0
  );

  const saveDisabled =
    nombre.trim() === "" ||
    startTime === "" ||
    endTime === "" ||
    endTimeInvalid ||
    (modoTurno === "FIJO" && customIntervalInvalid) ||
    daysOfWeek.length === 0 ||
    serviceTypeIds.length === 0 ||
    (modoTurno === "POR_TIPO" && !hasTypesWithDuracion);

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
    const effectiveIntervalMinutes = modoTurno === "POR_TIPO" ? 0 : intervalMinutes;
    const result = await onSubmit({
      nombre: nombre.trim(),
      startTime,
      endTime,
      intervalMinutes: effectiveIntervalMinutes,
      daysOfWeek,
      serviceTypeIds,
    });
    if (result !== false) onClose();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // --- Inline form helpers ---

  function openInlineCreate() {
    setInlineForm("create");
    setInlineTitulo("");
    setInlineDescripcion("");
    setInlinePrecio("");
    setInlineDuracion("");
    setInlineError(null);
  }

  function openInlineEdit(tipo: ServiceType) {
    setInlineForm({ id: tipo.id });
    setInlineTitulo(tipo.titulo);
    setInlineDescripcion(tipo.descripcion ?? "");
    setInlinePrecio(tipo.precio != null ? Number(tipo.precio).toLocaleString("es-AR").replace(/,/g, ".") : "");
    setInlineDuracion(tipo.duracion != null ? String(tipo.duracion) : "");
    setInlineError(null);
  }

  function cancelInlineForm() {
    setInlineForm("idle");
    setInlineError(null);
  }

  async function handleInlineSave() {
    const titulo = inlineTitulo.trim();
    const precioNum = Number(inlinePrecio.replace(/\./g, ""));

    if (!titulo) {
      setInlineError("El nombre es requerido.");
      return;
    }
    if (isNaN(precioNum) || precioNum <= 0) {
      setInlineError("El precio debe ser un número mayor a cero.");
      return;
    }
    if (modoTurno === "POR_TIPO" && (!inlineDuracion || Number(inlineDuracion) < 1)) {
      setInlineError("La duración es requerida y debe ser mayor a cero.");
      return;
    }

    const duracionValue =
      modoTurno === "POR_TIPO" ? Number(inlineDuracion) : null;

    setInlineSaving(true);
    setInlineError(null);

    if (inlineForm === "create") {
      const res = await fetch("/api/service-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo,
          description: inlineDescripcion.trim(),
          price: precioNum,
          duracion: duracionValue,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newType: ServiceType = {
          id: data.id,
          titulo: data.title,
          precio: Number(data.price),
          duracion: data.duracion ?? null,
        };
        const updated = [...localTypes, newType];
        setLocalTypes(updated);
        onServiceTypesChange?.(updated);
        setInlineForm("idle");
      } else {
        const err = await res.json();
        setInlineError(err.error ?? "Error al crear el tipo de turno.");
      }
    } else if (typeof inlineForm === "object") {
      const res = await fetch(`/api/service-types/${inlineForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo,
          description: inlineDescripcion.trim(),
          price: precioNum,
          duracion: duracionValue,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = localTypes.map((t) =>
          t.id === inlineForm.id
            ? { id: data.id, titulo: data.title, precio: Number(data.price), duracion: data.duracion ?? null }
            : t
        );
        setLocalTypes(updated);
        onServiceTypesChange?.(updated);
        setInlineForm("idle");
      } else {
        const err = await res.json();
        setInlineError(err.error ?? "Error al actualizar el tipo de turno.");
      }
    }

    setInlineSaving(false);
  }

  async function handleInlineDelete(id: string) {
    setDeletingTypeId(id);
    const res = await fetch(`/api/service-types/${id}`, { method: "DELETE" });
    setDeletingTypeId(null);

    if (res.ok) {
      const updated = localTypes.filter((t) => t.id !== id);
      setLocalTypes(updated);
      setServiceTypeIds((prev) => prev.filter((tid) => tid !== id));
      onServiceTypesChange?.(updated);
    } else {
      const err = await res.json();
      setInlineError(err.error ?? "No se pudo eliminar el tipo de turno.");
    }
  }

  const inlineFormOpen = inlineForm !== "idle";

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

          {/* Intervalo — solo visible en modo FIJO */}
          {modoTurno === "FIJO" && (
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
                    onClick={() => {
                      setIntervalMinutes(min);
                      setShowCustomInput(false);
                      setCustomInterval("");
                    }}
                    aria-pressed={!showCustomInput && intervalMinutes === min}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                      !showCustomInput && intervalMinutes === min
                        ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white"
                        : "border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b]"
                    )}
                  >
                    {min} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(true);
                    setCustomInterval("");
                  }}
                  aria-pressed={showCustomInput}
                  className={cn(
                    "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                    showCustomInput
                      ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white"
                      : "border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#1e293b]"
                  )}
                >
                  Personalizado
                </button>
              </div>
              {showCustomInput && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={customInterval}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomInterval(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed >= 1) {
                        setIntervalMinutes(parsed);
                      }
                    }}
                    placeholder="Ej: 20"
                    aria-label="Intervalo personalizado en minutos"
                    className="w-24 rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#2A2829]/40 dark:placeholder:text-slate-500 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
                  />
                  <span className="text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">min</span>
                </div>
              )}
            </div>
          )}

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

          {/* Tipos de turno disponibles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                Tipos de turno disponibles
              </p>
              <button
                type="button"
                onClick={openInlineCreate}
                className="rounded-full border border-[var(--brand-color)] dark:border-[#93c5fd] px-3 py-0.5 text-xs font-medium text-[var(--brand-color)] dark:text-[#93c5fd] hover:bg-[var(--brand-color)]/10 transition-colors"
                aria-label="Agregar tipo de turno"
              >
                agregar+
              </button>
            </div>

            {/* Alerta: POR_TIPO sin duracion */}
            {modoTurno === "POR_TIPO" && !hasTypesWithDuracion && localTypes.length > 0 && (
              <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
                Necesitás al menos un tipo de turno con duración definida para guardar.
              </p>
            )}

            {serviceTypeIds.length === 0 && localTypes.length > 0 && (
              <p className="mb-2 text-xs text-red-500 dark:text-red-400">
                Seleccioná al menos un tipo de turno para guardar.
              </p>
            )}

            {/* Lista de tipos */}
            {localTypes.length > 0 ? (
              <div className="space-y-2">
                {localTypes.map((tipo) => {
                  const checked = serviceTypeIds.includes(tipo.id);
                  const isDeleting = deletingTypeId === tipo.id;
                  return (
                    <div
                      key={tipo.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                        checked
                          ? "border-[var(--brand-color)] bg-[#eef1f6] dark:bg-[#1e3a5f]/30 text-[var(--brand-color)]"
                          : "border-[#E0E0DB] dark:border-[#2d3548] text-[#2A2829] dark:text-[#e2e8f0]"
                      )}
                    >
                      {/* Checkbox */}
                      <label className="flex cursor-pointer items-center gap-3 flex-1 min-w-0">
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
                        <span className="truncate">{tipo.titulo}</span>
                        {modoTurno === "POR_TIPO" && tipo.duracion != null && (
                          <span className="ml-auto shrink-0 text-xs text-[#2A2829]/50 dark:text-[#94a3b8]">
                            {tipo.duracion} min
                          </span>
                        )}
                      </label>

                      {/* Acciones */}
                      {!inlineFormOpen && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openInlineEdit(tipo)}
                            aria-label={`Editar ${tipo.titulo}`}
                            className="rounded p-1 text-[#2A2829]/40 dark:text-[#94a3b8] hover:text-[var(--brand-color)] dark:hover:text-[#93c5fd] hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInlineDelete(tipo.id)}
                            disabled={isDeleting}
                            aria-label={`Eliminar ${tipo.titulo}`}
                            className="rounded p-1 text-[#2A2829]/40 dark:text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fef2f2] dark:hover:bg-[#2d1c1c] transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                            ) : (
                              <Trash2 size={13} aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#2A2829]/50 dark:text-[#94a3b8]">
                No hay tipos de turno. Usá el botón de arriba para agregar uno.
              </p>
            )}
          </div>
        </div>

        {/* Error de conflicto */}
        {error && (
          <div className="mx-5 mb-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
            {error}
          </div>
        )}

        {/* Bloqueo por POR_TIPO sin duracion */}
        {modoTurno === "POR_TIPO" && !hasTypesWithDuracion && localTypes.length === 0 && (
          <div className="mx-5 mb-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
            Debés tener al menos un tipo de turno con duración definida antes de agregar una configuración de horario.
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

      {/* Bottom sheet para crear/editar tipo de turno */}
      {inlineFormOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) cancelInlineForm(); }}
        >
          {/* Backdrop oscuro sobre el modal */}
          <div className="absolute inset-0 bg-black/50" onClick={cancelInlineForm} />

          {/* Sheet */}
          <div className="relative z-10 w-full rounded-t-2xl bg-white dark:bg-[#1e293b] shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[#E0E0DB] dark:bg-[#2d3548]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E0E0DB] dark:border-[#2d3548]">
              <h3 className="font-heading text-base text-[var(--brand-color)] dark:text-[#93c5fd]">
                {inlineForm === "create" ? "Nuevo tipo de turno" : "Editar tipo de turno"}
              </h3>
              <button
                type="button"
                onClick={cancelInlineForm}
                aria-label="Cerrar"
                className="rounded-md p-1 text-[#2A2829]/50 dark:text-[#94a3b8] hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Campos */}
            <div className="px-5 py-4 space-y-4">
              {/* Título */}
              <div>
                <label htmlFor="bs-titulo" className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-1">
                  Título <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="bs-titulo"
                  type="text"
                  value={inlineTitulo}
                  onChange={(e) => setInlineTitulo(e.target.value)}
                  placeholder="Ej: Consulta general"
                  className="w-full rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#2A2829]/40 dark:placeholder:text-slate-500 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="bs-descripcion" className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-1">
                  Descripción
                </label>
                <input
                  id="bs-descripcion"
                  type="text"
                  value={inlineDescripcion}
                  onChange={(e) => setInlineDescripcion(e.target.value)}
                  placeholder="Ej: Primera visita con radiografías"
                  className="w-full rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#2A2829]/40 dark:placeholder:text-slate-500 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
                />
              </div>

              {/* Precio y Duración */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bs-precio" className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-1">
                    Precio <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    id="bs-precio"
                    type="text"
                    inputMode="numeric"
                    value={inlinePrecio}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, "").replace(/\D/g, "");
                      if (raw === "") { setInlinePrecio(""); return; }
                      const num = parseInt(raw, 10);
                      setInlinePrecio(num.toLocaleString("es-AR").replace(/,/g, "."));
                    }}
                    placeholder="Ej: 2.000"
                    className="w-full rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#2A2829]/40 dark:placeholder:text-slate-500 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
                  />
                </div>
                <div>
                  <label htmlFor="bs-duracion" className="block text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] mb-1">
                    Duración (min) {modoTurno === "POR_TIPO" && <span className="text-[#ef4444]">*</span>}
                  </label>
                  <input
                    id="bs-duracion"
                    type="number"
                    min={1}
                    value={inlineDuracion}
                    onChange={(e) => setInlineDuracion(e.target.value)}
                    placeholder="Ej: 30"
                    disabled={modoTurno === "FIJO"}
                    className="w-full rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#2A2829]/40 dark:placeholder:text-slate-500 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800"
                  />
                </div>
              </div>

              {inlineError && (
                <p className="text-xs text-[#ef4444]">{inlineError}</p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 px-5 pb-8 pt-1">
              <Button
                variant="outline"
                onClick={cancelInlineForm}
                disabled={inlineSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleInlineSave}
                disabled={inlineSaving || !inlineTitulo.trim()}
                className="flex-1 bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inlineSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
