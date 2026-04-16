"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, startOfMonth } from "date-fns";
import { X, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import MiniCalendar from "./MiniCalendar";
import type { ClientBookingInfo } from "./ClientBookingOptionsModal";

type Slot = { id: string; time: string };

type Props = {
  booking: ClientBookingInfo;
  slug: string;
  onClose: () => void;
};

export default function ClientRescheduleModal({ booking, slug, onClose }: Props) {
  const today = new Date();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  // Fetch available dates for the month
  const fetchDates = useCallback(
    async (month: Date) => {
      setLoadingDates(true);
      setAvailableDates([]);
      setSelectedDate(null);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const monthStr = format(month, "yyyy-MM");
        const res = await fetch(
          `/api/p/${slug}/availability?month=${monthStr}&employeeId=${booking.employeeId}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const dates: string[] = Array.from(
          new Set((data.slots ?? []).map((s: { date: string }) => s.date))
        );
        setAvailableDates(dates);
      } catch {
        setAvailableDates([]);
      } finally {
        setLoadingDates(false);
      }
    },
    [slug, booking.employeeId]
  );

  useEffect(() => {
    fetchDates(viewMonth);
  }, [viewMonth, fetchDates]);

  // Fetch slots for the selected day
  const handleDaySelect = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      setSlots([]);
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/p/${slug}/availability?month=${date.slice(0, 7)}&employeeId=${booking.employeeId}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const daySlots: Slot[] = (data.slots ?? [])
          .filter((s: { date: string; booked?: boolean; disabled?: boolean }) =>
            s.date === date && !s.booked && !s.disabled
          )
          .map((s: { id: string; time: string }) => ({ id: s.id, time: s.time }));
        setSlots(daySlots);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [slug, booking.employeeId]
  );

  async function handleConfirm() {
    if (!selectedSlot || !selectedDate || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/client/reschedule-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          requestedDate: selectedDate,
          requestedTime: selectedSlot.time,
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

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 bg-black/40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-reschedule-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-lg flex flex-col gap-5 p-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="client-reschedule-modal-title"
              className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0] leading-tight"
            >
              Solicitar reprogramación
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

        {/* Estado de éxito */}
        {success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" aria-hidden="true" />
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
            {/* Selector de fecha */}
            {loadingDates ? (
              <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-10 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-[var(--brand-color)] dark:text-[#93c5fd]" />
              </div>
            ) : (
              <MiniCalendar
                availableDates={availableDates}
                selectedDate={selectedDate}
                viewMonth={viewMonth}
                onMonthChange={(m) => setViewMonth(m)}
                onDaySelect={handleDaySelect}
                originalDate={booking.date}
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
                  <h3 className="font-heading text-xs text-[#2A2829] dark:text-[#e2e8f0] mb-4 uppercase tracking-wide">
                    Elegí el nuevo horario
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => { setSelectedSlot(slot); setError(null); }}
                          className={[
                            "flex items-center justify-center rounded-lg border-2 p-3 transition-all duration-150 font-heading text-sm",
                            isSelected
                              ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white shadow-md"
                              : "border-[#E0E0DB] dark:border-[#2d3548] bg-[#F4F5F7] dark:bg-[#253045] text-[#2A2829] dark:text-[#e2e8f0] hover:border-[var(--brand-color)] hover:bg-[#eef1f6] dark:hover:bg-[#2d3548]",
                          ].join(" ")}
                          aria-pressed={isSelected}
                          aria-label={`Solicitar turno a las ${slot.time}`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
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
                disabled={!selectedSlot || isSubmitting}
                className="flex-1 font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
