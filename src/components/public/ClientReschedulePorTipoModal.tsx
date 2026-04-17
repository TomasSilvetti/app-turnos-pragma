"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { X, CheckCircle2, CalendarClock, Clock, AlertCircle, Loader2 } from "lucide-react";
import MiniCalendar from "./MiniCalendar";
import DayScheduleColumn, { type ScheduledAppointment } from "./DayScheduleColumn";
import DayScheduleBookingForm, { type ServiceTypeOption } from "./DayScheduleBookingForm";
import type { ClientBookingInfo } from "./ClientBookingOptionsModal";
import type { PreviewAppointment } from "./DayScheduleColumn";

type DayScheduleData = {
  startTime: string;
  endTime: string;
  appointments: ScheduledAppointment[];
  serviceTypes: ServiceTypeOption[];
};

type Props = {
  booking: ClientBookingInfo;
  slug: string;
  onClose: () => void;
};

export default function ClientReschedulePorTipoModal({ booking, slug, onClose }: Props) {
  const today = new Date();

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySchedule, setDaySchedule] = useState<DayScheduleData | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [porTipoDaysOfWeek, setPorTipoDaysOfWeek] = useState<number[] | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewAppointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/public/business/${slug}/payment-methods`)
      .then((r) => r.json())
      .then((data: { methods: string[] }) => setPaymentMethods(data.methods ?? []))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    fetch(`/api/p/${slug}/employees/${booking.employeeId}/schedule-days`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { daysOfWeek: number[] } | null) =>
        setPorTipoDaysOfWeek(data?.daysOfWeek ?? null)
      )
      .catch(() => setPorTipoDaysOfWeek(null));
  }, [slug, booking.employeeId]);

  useEffect(() => {
    if (!selectedDate) {
      setDaySchedule(null);
      return;
    }
    setIsLoadingSchedule(true);
    fetch(
      `/api/p/${slug}/employees/${booking.employeeId}/day-schedule?date=${selectedDate}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DayScheduleData | null) => setDaySchedule(data))
      .catch(() => setDaySchedule(null))
      .finally(() => setIsLoadingSchedule(false));
  }, [slug, booking.employeeId, selectedDate]);

  const porTipoAvailableDates = useMemo<string[] | undefined>(() => {
    if (!porTipoDaysOfWeek || porTipoDaysOfWeek.length === 0) return undefined;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return eachDayOfInterval({
      start: startOfMonth(viewMonth),
      end: endOfMonth(viewMonth),
    })
      .filter(
        (d) => d >= todayStart && porTipoDaysOfWeek.includes((getDay(d) + 6) % 7)
      )
      .map((d) => format(d, "yyyy-MM-dd"));
  }, [porTipoDaysOfWeek, viewMonth]);

  const handleMonthChange = useCallback((month: Date) => {
    setViewMonth(month);
    setSelectedDate(null);
    setDaySchedule(null);
    setPreview(null);
    setError(null);
  }, []);

  const handleDaySelect = useCallback((date: string) => {
    setSelectedDate(date);
    setPreview(null);
    setError(null);
  }, []);

  async function handleConfirm(startTime: string) {
    if (!selectedDate || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/client/reschedule-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          requestedDate: selectedDate,
          requestedTime: startTime,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "No se pudo enviar la solicitud");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  const formattedDate = format(parseISO(booking.date), "EEEE d 'de' MMMM", {
    locale: es,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-por-tipo-title"
    >
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-lg flex flex-col gap-5 p-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="reschedule-por-tipo-title"
              className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0] leading-tight"
            >
              Reprogramar turno
            </h2>
            {booking.serviceType && (
              <p className="font-body text-sm text-[var(--brand-color)] dark:text-[#93c5fd] font-medium mt-0.5">
                {booking.serviceType}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} className="text-[#2A2829] dark:text-[#e2e8f0]" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2
                size={28}
                className="text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
                Solicitud enviada
              </h3>
              <p className="font-body text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
                Tu solicitud de reprogramación fue enviada. El negocio la revisará y te
                contactará para confirmar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-6 py-2.5 hover:bg-[#1c2a40] transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            {/* Turno actual */}
            <div className="rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-2">
              <p className="font-body text-xs text-gray-400 dark:text-[#64748b] uppercase tracking-widest">
                Turno actual
              </p>
              <div className="flex items-center gap-2 text-[#2A2829]/70 dark:text-[#94a3b8]">
                <CalendarClock size={14} aria-hidden="true" />
                <span className="font-body text-sm capitalize">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-[#2A2829]/70 dark:text-[#94a3b8]">
                <Clock size={14} aria-hidden="true" />
                <span className="font-body text-sm">{booking.time} hs</span>
              </div>
            </div>

            {/* Mini calendario */}
            <MiniCalendar
              availableDates={porTipoAvailableDates}
              selectedDate={selectedDate}
              viewMonth={viewMonth}
              onMonthChange={handleMonthChange}
              onDaySelect={handleDaySelect}
              originalDate={booking.date}
            />

            {/* Columna temporal + formulario */}
            {selectedDate &&
              (isLoadingSchedule ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    size={22}
                    className="animate-spin text-[var(--brand-color)] dark:text-[#93c5fd]"
                  />
                </div>
              ) : daySchedule ? (
                <>
                  <DayScheduleColumn
                    startTime={daySchedule.startTime}
                    endTime={daySchedule.endTime}
                    appointments={daySchedule.appointments}
                    previewAppointment={preview}
                  />
                  <DayScheduleBookingForm
                    startTime={daySchedule.startTime}
                    endTime={daySchedule.endTime}
                    serviceTypes={daySchedule.serviceTypes}
                    appointments={daySchedule.appointments}
                    paymentMethods={paymentMethods}
                    onConfirm={(startTime) => handleConfirm(startTime)}
                    onPreviewChange={setPreview}
                    confirmLabel="Solicitar reprogramación"
                  />
                </>
              ) : (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
                  <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
                    No hay horario de atención configurado para este día.
                  </p>
                </div>
              ))}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-[#ef4444]/5 border border-[#ef4444]/20 px-3 py-2"
              >
                <AlertCircle
                  size={16}
                  className="text-[#ef4444] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="font-body text-xs text-[#ef4444]">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
