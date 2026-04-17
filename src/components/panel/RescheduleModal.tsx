"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { X, AlertCircle, Loader2, MessageCircle } from "lucide-react";
import MiniCalendar from "@/components/public/MiniCalendar";
import DayScheduleColumn, { type ScheduledAppointment, type PreviewAppointment } from "@/components/public/DayScheduleColumn";
import DayScheduleBookingForm, { type ServiceTypeOption } from "@/components/public/DayScheduleBookingForm";
import type { RescheduleItem } from "./RescheduleList";

type Slot = { id: string; time: string };

type DayScheduleData = {
  startTime: string;
  endTime: string;
  appointments: ScheduledAppointment[];
  serviceTypes: ServiceTypeOption[];
};

type RescheduleContext = {
  sucursalId: string | null;
  empleadoId: string;
  sucursalValid: boolean;
  empleadoValid: boolean;
  noEmpleadosDisponibles: boolean;
  slug: string;
  modoTurno: string;
  serviceTypeId: string | null;
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

  // Modal de notificación post-confirmación
  const [showNotification, setShowNotification] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<Slot | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);

  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noConfigs, setNoConfigs] = useState(false);

  // Contexto del turno original
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState(false);

  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);
  const [modoTurno, setModoTurno] = useState<string>("FIJO");
  const [serviceTypeId, setServiceTypeId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  // POR_TIPO: columna temporal + formulario
  const [daySchedule, setDaySchedule] = useState<DayScheduleData | null>(null);
  const [preview, setPreview] = useState<PreviewAppointment | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

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
        setContextError(false);
        setSelectedEmpleadoId(ctx.empleadoId);
        setModoTurno(ctx.modoTurno ?? "FIJO");
        setServiceTypeId(ctx.serviceTypeId ?? null);
        setSlug(ctx.slug ?? null);
      })
      .catch(() => setContextError(true))
      .finally(() => setContextLoading(false));
  }, [item.bookingId]);

  // Cargar métodos de pago cuando se conoce el slug (para POR_TIPO)
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/business/${slug}/payment-methods`)
      .then((r) => r.json())
      .then((data: { methods: string[] }) => setPaymentMethods(data.methods ?? []))
      .catch(() => {});
  }, [slug]);

  // Cargar fechas disponibles cuando cambia el mes, el empleado o el modo
  const fetchDates = useCallback(async (month: Date, empleadoId: string | null, modo: string, slugVal: string | null) => {
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
      if (modo === "POR_TIPO" && slugVal) {
        const res = await fetch(`/api/p/${slugVal}/employees/${empleadoId}/schedule-days`);
        if (!res.ok) throw new Error();
        const data = await res.json() as { daysOfWeek: number[] };
        const dows = data.daysOfWeek ?? [];
        if (dows.length === 0) { setNoConfigs(true); return; }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const year = month.getFullYear();
        const monthIdx = month.getMonth();
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const available: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(year, monthIdx, day);
          if (d < today) continue;
          const isoDay = (d.getDay() + 6) % 7;
          if (dows.includes(isoDay)) {
            available.push(`${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
          }
        }
        setAvailableDates(available);
      } else {
        const monthStr = format(month, "yyyy-MM");
        const res = await fetch(`/api/panel/reschedules/available-slots?month=${monthStr}&employeeId=${empleadoId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAvailableDates(data.dates ?? []);
        if (data.noConfigs) setNoConfigs(true);
      }
    } catch {
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, []);

  useEffect(() => {
    fetchDates(viewMonth, selectedEmpleadoId, modoTurno, slug);
  }, [viewMonth, selectedEmpleadoId, modoTurno, slug, fetchDates]);

  // Fetch slots/schedule when date is selected
  const handleDaySelect = useCallback(async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setDaySchedule(null);
    setPreview(null);
    setLoadingSlots(true);
    try {
      if (modoTurno === "POR_TIPO" && slug && selectedEmpleadoId) {
        const res = await fetch(`/api/p/${slug}/employees/${selectedEmpleadoId}/day-schedule?date=${date}`);
        if (!res.ok) throw new Error();
        const data = await res.json() as DayScheduleData;
        setDaySchedule(data);
      } else {
        const employeeParam = selectedEmpleadoId ? `&employeeId=${selectedEmpleadoId}` : "";
        const res = await fetch(`/api/panel/reschedules/available-slots?date=${date}${employeeParam}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const fetchedSlots: Slot[] = data.appointments ?? [];
        if (date === item.appointmentDate) {
          const originalTime = item.appointmentTime;
          const alreadyPresent = fetchedSlots.some((s) => s.time === originalTime);
          if (!alreadyPresent) {
            const originalSlot: Slot = { id: `__original__`, time: originalTime };
            const inserted = [...fetchedSlots, originalSlot].sort((a, b) => a.time.localeCompare(b.time));
            setSlots(inserted);
            return;
          }
        }
        setSlots(fetchedSlots);
      }
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedEmpleadoId, modoTurno, slug, item.appointmentDate, item.appointmentTime]);

  function handleMonthChange(month: Date) {
    setViewMonth(month);
  }

  async function handleConfirmPorTipo(startTime: string) {
    if (!selectedDate || isSubmitting) return;
    if (selectedDate === item.appointmentDate && startTime === item.appointmentTime) {
      setError("El nuevo horario debe ser diferente al turno actual.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/reschedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: item.bookingId,
          date: selectedDate,
          requestedTime: startTime,
          clientName: item.clientName,
          clientPhone: item.clientPhone,
        }),
      });
      if (!res.ok) throw new Error();
      setConfirmedSlot({ id: `__pt__${startTime}`, time: startTime });
      setConfirmedDate(selectedDate);
      setShowNotification(true);
    } catch {
      setError("No se pudo reprogramar el turno. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!selectedSlot || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const isPorTipo = modoTurno === "POR_TIPO";
      const body = isPorTipo
        ? { bookingId: item.bookingId, date: selectedDate, requestedTime: selectedSlot.time, clientName: item.clientName, clientPhone: item.clientPhone }
        : { bookingId: item.bookingId, appointmentId: selectedSlot.id, clientName: item.clientName, clientPhone: item.clientPhone };

      const res = await fetch("/api/panel/reschedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();
      setConfirmedSlot(selectedSlot);
      setConfirmedDate(selectedDate);
      setShowNotification(true);
    } catch {
      setError("No se pudo reprogramar el turno. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function buildWhatsAppUrl() {
    if (!confirmedSlot || !confirmedDate) return "#";
    const phone = item.clientPhone.replace(/\D/g, "");
    const oldDateFormatted = format(parseISO(item.appointmentDate), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
    const newDateFormatted = format(parseISO(confirmedDate), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
    const message = [
      `Hola ${item.clientName}, te informamos que tu turno ha sido reprogramado.`,
      "",
      `*Turno anterior:*`,
      `Fecha: ${oldDateFormatted}`,
      `Hora: ${item.appointmentTime}`,
      "",
      `*Nuevo turno:*`,
      `Fecha: ${newDateFormatted}`,
      `Hora: ${confirmedSlot.time}`,
      "",
      "¡Te esperamos!",
    ].join("\n");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  return (
    <>
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

        {/* Selector de fecha (solo cuando el contexto cargó y hay empleado) */}
        {selectedEmpleadoId && !contextLoading && (
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
                originalDate={item.appointmentDate}
              />
            )}

            {/* Día seleccionado: POR_TIPO → columna temporal + formulario */}
            {selectedDate && modoTurno === "POR_TIPO" && (
              loadingSlots ? (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-8 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-[var(--brand-color)] dark:text-[#93c5fd]" />
                </div>
              ) : daySchedule ? (
                <>
                  <DayScheduleColumn
                    startTime={daySchedule.startTime}
                    endTime={daySchedule.endTime}
                    appointments={daySchedule.appointments}
                    previewAppointment={preview}
                    clientAppointmentVariant="amber"
                    clientAppointment={
                      selectedDate === item.appointmentDate
                        ? {
                            time: item.appointmentTime,
                            duracion:
                              (serviceTypeId
                                ? daySchedule.serviceTypes.find((s) => s.id === serviceTypeId)?.duracion
                                : undefined) ??
                              daySchedule.serviceTypes[0]?.duracion ??
                              30,
                            onClick: () => {},
                          }
                        : null
                    }
                  />
                  <DayScheduleBookingForm
                    startTime={daySchedule.startTime}
                    endTime={daySchedule.endTime}
                    serviceTypes={daySchedule.serviceTypes}
                    appointments={daySchedule.appointments}
                    paymentMethods={paymentMethods}
                    onConfirm={handleConfirmPorTipo}
                    onPreviewChange={setPreview}
                    confirmLabel="Reprogramar"
                  />
                </>
              ) : (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
                  <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
                    No hay horario de atención configurado para este día.
                  </p>
                </div>
              )
            )}

            {/* Día seleccionado: FIJO → cards de slots */}
            {selectedDate && modoTurno !== "POR_TIPO" && (
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
                      const isOriginalSlot =
                        slot.id === "__original__" ||
                        (selectedDate === item.appointmentDate &&
                          slot.time === item.appointmentTime);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            if (isOriginalSlot) return;
                            setSelectedSlot(slot);
                            setError(null);
                          }}
                          disabled={isOriginalSlot}
                          className={[
                            "flex items-center justify-center rounded-lg border-2 p-4 transition-all duration-150 font-heading text-base",
                            isSelected
                              ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white shadow-md scale-[1.02]"
                              : isOriginalSlot
                              ? "border-amber-400 bg-amber-400 text-white cursor-default"
                              : "border-[#E0E0DB] dark:border-[#2d3548] bg-[#F4F5F7] dark:bg-[#253045] text-[#2A2829] dark:text-[#e2e8f0] hover:border-[var(--brand-color)] hover:bg-[#eef1f6] dark:hover:bg-[#2d3548]",
                          ].join(" ")}
                          aria-pressed={isSelected}
                          aria-label={`Turno a las ${slot.time}${isOriginalSlot ? " (turno original)" : ""}`}
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
          {modoTurno !== "POR_TIPO" && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedSlot || isSubmitting}
              className="flex-1 font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Confirmando..." : "Confirmar"}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Modal de notificación al cliente */}
    {showNotification && confirmedSlot && confirmedDate && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50">
        <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-xl flex flex-col gap-5 p-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
              Turno reprogramado
            </h3>
            <p className="font-body text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
              ¿Querés notificar al cliente sobre el cambio?
            </p>
          </div>

          <div className="rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] border border-[#E0E0DB] dark:border-[#2d3548] p-3 flex flex-col gap-1.5 text-xs font-body">
            <div className="flex gap-2 text-[#2A2829]/50 dark:text-[#64748b]">
              <span className="font-medium uppercase tracking-wide">Antes</span>
              <span>{format(parseISO(item.appointmentDate), "d MMM yyyy", { locale: es })} · {item.appointmentTime}</span>
            </div>
            <div className="border-t border-[#E0E0DB] dark:border-[#2d3548] my-0.5" />
            <div className="flex gap-2 text-[#2A2829] dark:text-[#e2e8f0]">
              <span className="font-medium uppercase tracking-wide">Ahora</span>
              <span>{format(parseISO(confirmedDate), "d MMM yyyy", { locale: es })} · {confirmedSlot.time}</span>
            </div>
          </div>

          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { setShowNotification(false); onRescheduled(item.bookingId); }}
            className="flex items-center justify-center gap-2 w-full font-body text-sm text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-md py-2.5 transition-colors"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Notificar por WhatsApp
          </a>

          <button
            type="button"
            onClick={() => { setShowNotification(false); onRescheduled(item.bookingId); }}
            className="w-full font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
          >
            Omitir
          </button>
        </div>
      </div>
    )}
    </>
  );
}
