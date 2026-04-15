"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { X, AlertCircle, Loader2 } from "lucide-react";
import MiniCalendar from "@/components/public/MiniCalendar";
import type { RescheduleItem } from "./RescheduleList";

type Slot = { id: string; time: string };

type Sucursal = { id: string; name: string; address: string };
type Employee = { id: string; name: string };

type RescheduleContext = {
  sucursalId: string | null;
  empleadoId: string;
  sucursalValid: boolean;
  empleadoValid: boolean;
  noEmpleadosDisponibles: boolean;
  slug: string;
};

type Props = {
  item: RescheduleItem;
  onClose: () => void;
  onRescheduled: (bookingId: string) => void;
};

export default function RescheduleModal({ item, onClose, onRescheduled }: Props) {
  const today = new Date();

  const [viewMonth, setViewMonth] = useState<Date>(today);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noConfigs, setNoConfigs] = useState(false);

  // Contexto del turno original
  const [context, setContext] = useState<RescheduleContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState(false);

  // Selectores de sucursal y empleado
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null);
  const [sucursalesLoading, setSucursalesLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);
  const [empleadoWarning, setEmpleadoWarning] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Cargar contexto del turno al montar
  useEffect(() => {
    setContextLoading(true);
    fetch(`/api/panel/reschedules/${item.bookingId}/context`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<RescheduleContext>;
      })
      .then((ctx) => {
        setContext(ctx);
        setContextError(false);
      })
      .catch(() => setContextError(true))
      .finally(() => setContextLoading(false));
  }, [item.bookingId]);

  // Cargar sucursales cuando tenemos el context
  useEffect(() => {
    if (!context) return;
    setSucursalesLoading(true);
    fetch(`/api/p/${context.slug}/branches`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<Sucursal[]>;
      })
      .then((data) => {
        setSucursales(data);
        // Pre-seleccionar sucursal si es válida
        if (context.sucursalValid && context.sucursalId) {
          setSelectedSucursalId(context.sucursalId);
        } else if (data.length === 1) {
          setSelectedSucursalId(data[0].id);
        }
      })
      .catch(() => setSucursales([]))
      .finally(() => setSucursalesLoading(false));
  }, [context]);

  // Cargar empleados cuando cambia la sucursal seleccionada
  useEffect(() => {
    if (!context || !selectedSucursalId) {
      setEmployees([]);
      setSelectedEmpleadoId(null);
      return;
    }
    setEmpleadosLoading(true);
    setEmployees([]);
    setSelectedEmpleadoId(null);
    setEmpleadoWarning(false);
    fetch(`/api/p/${context.slug}/branches/${selectedSucursalId}/employees`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<Employee[]>;
      })
      .then((data) => {
        setEmployees(data);
        // Pre-seleccionar empleado si coincide con el del turno y es válido
        const isOriginalSucursal = context.sucursalId === selectedSucursalId;
        if (isOriginalSucursal && context.empleadoValid) {
          const found = data.find((e) => e.id === context.empleadoId);
          if (found) {
            setSelectedEmpleadoId(found.id);
          } else if (data.length === 1) {
            setSelectedEmpleadoId(data[0].id);
          } else {
            setEmpleadoWarning(true);
          }
        } else if (data.length === 1) {
          setSelectedEmpleadoId(data[0].id);
        }
      })
      .catch(() => setEmployees([]))
      .finally(() => setEmpleadosLoading(false));
  }, [context, selectedSucursalId]);

  // Cargar fechas disponibles cuando cambia el mes o el empleado
  const fetchDates = useCallback(async (month: Date, empleadoId: string | null) => {
    if (!empleadoId) {
      setAvailableDates([]);
      return;
    }
    setLoadingDates(true);
    setAvailableDates([]);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setNoConfigs(false);
    try {
      const monthStr = format(month, "yyyy-MM");
      const res = await fetch(`/api/panel/reschedules/available-slots?month=${monthStr}&employeeId=${empleadoId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAvailableDates(data.dates ?? []);
      if (data.noConfigs) setNoConfigs(true);
    } catch {
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, []);

  useEffect(() => {
    fetchDates(viewMonth, selectedEmpleadoId);
  }, [viewMonth, selectedEmpleadoId, fetchDates]);

  // Fetch slots when date is selected
  const handleDaySelect = useCallback(async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    try {
      const employeeParam = selectedEmpleadoId ? `&employeeId=${selectedEmpleadoId}` : "";
      const res = await fetch(`/api/panel/reschedules/available-slots?date=${date}${employeeParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlots(data.appointments ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedEmpleadoId]);

  function handleMonthChange(month: Date) {
    setViewMonth(month);
  }

  function handleSucursalSelect(id: string) {
    setSelectedSucursalId(id);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setError(null);
  }

  function handleEmpleadoSelect(id: string) {
    setSelectedEmpleadoId(id);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!selectedSlot || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/panel/reschedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: item.bookingId,
          appointmentId: selectedSlot.id,
          clientName: item.clientName,
          clientPhone: item.clientPhone,
        }),
      });

      if (!res.ok) throw new Error();
      onRescheduled(item.bookingId);
    } catch {
      setError("No se pudo reprogramar el turno. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canAdvance = !context?.noEmpleadosDisponibles;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-lg flex flex-col gap-5 p-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="reschedule-modal-title"
              className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0] leading-tight"
            >
              Reprogramar turno
            </h2>
            <p className="font-body text-sm text-[var(--brand-color)] dark:text-[#93c5fd] font-medium mt-0.5">
              {item.clientName} — {item.clientPhone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} className="text-[#2A2829] dark:text-[#e2e8f0]" />
          </button>
        </div>

        {/* Datos del cliente (precargados, no editables) */}
        <div className="rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reschedule-name"
              className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide opacity-60 dark:opacity-100"
            >
              Nombre del cliente
            </label>
            <input
              id="reschedule-name"
              type="text"
              value={item.clientName}
              disabled
              className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md px-3 py-2 bg-white dark:bg-[#1e293b] opacity-60 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reschedule-phone"
              className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide opacity-60 dark:opacity-100"
            >
              Teléfono
            </label>
            <input
              id="reschedule-phone"
              type="tel"
              value={item.clientPhone}
              disabled
              className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md px-3 py-2 bg-white dark:bg-[#1e293b] opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Cargando contexto */}
        {contextLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-[var(--brand-color)] dark:text-[#93c5fd]" />
          </div>
        )}

        {/* Error de contexto */}
        {contextError && !contextLoading && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-[#ef4444]/5 border border-[#ef4444]/20 px-3 py-3"
          >
            <AlertCircle size={16} className="text-[#ef4444] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-sm text-[#ef4444]">
              No se pudo cargar la información del turno.
            </p>
          </div>
        )}

        {/* Sin empleados disponibles en ninguna sucursal */}
        {context?.noEmpleadosDisponibles && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-3"
          >
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-sm text-amber-700 dark:text-amber-400">
              No hay empleados disponibles para reprogramar este turno. Creá un empleado y asignalo a una sucursal antes de continuar.
            </p>
          </div>
        )}

        {/* Selectores de sucursal y empleado */}
        {context && !context.noEmpleadosDisponibles && !contextLoading && (
          <>
            {/* Selector de sucursal */}
            {sucursalesLoading ? (
              <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 animate-pulse">
                <div className="h-4 w-32 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-3" />
                <div className="h-10 w-full bg-[#E0E0DB] dark:bg-[#2d3548] rounded-md" />
              </div>
            ) : sucursales.length === 0 ? (
              <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4">
                <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
                  No hay sucursales disponibles en este momento.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
                <p className="font-body text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                  Sucursal
                </p>
                <div className="flex flex-col gap-2">
                  {sucursales.map((s) => {
                    const isSelected = selectedSucursalId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSucursalSelect(s.id)}
                        className={[
                          "flex flex-col rounded-md px-3 py-2.5 text-sm transition-colors text-left",
                          isSelected
                            ? "bg-[var(--brand-color)] text-white"
                            : "bg-[#F4F5F7] dark:bg-[#0f172a] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#E8E9EB] dark:hover:bg-[#1e293b]",
                        ].join(" ")}
                        aria-pressed={isSelected}
                      >
                        <span className="font-body font-medium">{s.name}</span>
                        {s.address && (
                          <span
                            className={[
                              "font-body text-xs mt-0.5",
                              isSelected ? "text-white/70" : "text-[#2A2829]/50 dark:text-[#94a3b8]",
                            ].join(" ")}
                          >
                            {s.address}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selector de empleado */}
            {selectedSucursalId && (
              empleadosLoading ? (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 animate-pulse">
                  <div className="h-4 w-40 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-3" />
                  <div className="h-10 w-full bg-[#E0E0DB] dark:bg-[#2d3548] rounded-md" />
                </div>
              ) : employees.length === 0 ? (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4">
                  <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
                    No hay empleados disponibles en esta sucursal.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
                  {empleadoWarning && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2"
                    >
                      <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="font-body text-xs text-amber-700 dark:text-amber-400">
                        El empleado original ya no está disponible. Seleccioná una sucursal y un empleado para continuar.
                      </p>
                    </div>
                  )}
                  <p className="font-body text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                    Profesional
                  </p>
                  <div className="flex flex-col gap-2">
                    {employees.map((emp) => {
                      const isSelected = selectedEmpleadoId === emp.id;
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleEmpleadoSelect(emp.id)}
                          className={[
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors text-left",
                            isSelected
                              ? "bg-[var(--brand-color)] text-white"
                              : "bg-[#F4F5F7] dark:bg-[#0f172a] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#E8E9EB] dark:hover:bg-[#1e293b]",
                          ].join(" ")}
                          aria-pressed={isSelected}
                        >
                          <span
                            className={[
                              "h-7 w-7 rounded-full flex items-center justify-center font-body text-xs font-semibold uppercase shrink-0",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-[var(--brand-color)]/10 text-[var(--brand-color)]",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {emp.name.charAt(0)}
                          </span>
                          <span className="font-body font-medium">{emp.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Selector de fecha (solo cuando hay empleado seleccionado) */}
        {selectedEmpleadoId && canAdvance && (
          <>
            {/* Sin configuraciones activas */}
            {noConfigs && !loadingDates && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-3"
              >
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="font-body text-sm text-amber-700 dark:text-amber-400">
                  No hay configuraciones de turno activas. Por favor creá una nueva configuración para poder reprogramar.
                </p>
              </div>
            )}

            {loadingDates ? (
              <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-10 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-[var(--brand-color)] dark:text-[#93c5fd]" />
              </div>
            ) : (
              <MiniCalendar
                availableDates={availableDates}
                selectedDate={selectedDate}
                viewMonth={viewMonth}
                onMonthChange={handleMonthChange}
                onDaySelect={handleDaySelect}
              />
            )}

            {/* Slots del día seleccionado */}
            {selectedDate && (
              loadingSlots ? (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-8 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-[var(--brand-color)] dark:text-[#93c5fd]" />
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 text-center">
                  <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50">
                    No hay turnos disponibles para este día.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
                  <h3 className="font-heading text-sm text-[#2A2829] dark:text-[#e2e8f0] mb-4 uppercase tracking-wide">
                    Elegí el nuevo turno
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => { setSelectedSlot(slot); setError(null); }}
                          className={[
                            "flex items-center justify-center rounded-lg border-2 p-4 transition-all duration-150 font-heading text-base",
                            isSelected
                              ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white shadow-md scale-[1.02]"
                              : "border-[#E0E0DB] dark:border-[#2d3548] bg-[#F4F5F7] dark:bg-[#253045] text-[#2A2829] dark:text-[#e2e8f0] hover:border-[var(--brand-color)] hover:bg-[#eef1f6] dark:hover:bg-[#2d3548]",
                          ].join(" ")}
                          aria-pressed={isSelected}
                          aria-label={`Turno a las ${slot.time}`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-[#ef4444]/5 border border-[#ef4444]/20 px-3 py-2"
          >
            <AlertCircle size={16} className="text-[#ef4444] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-xs text-[#ef4444]">{error}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || isSubmitting || !canAdvance}
            className="flex-1 font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
