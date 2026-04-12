"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { X, AlertCircle, Loader2 } from "lucide-react";
import MiniCalendar from "@/components/public/MiniCalendar";
import type { RescheduleItem } from "./RescheduleList";

type Slot = { id: string; time: string };

type Props = {
  item: RescheduleItem;
  onClose: () => void;
  onRescheduled: (bookingId: string) => void;
};

export default function RescheduleModal({ item, onClose, onRescheduled }: Props) {
  const today = new Date();
  const initialMonth = format(today, "yyyy-MM");

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

  // Fetch available dates when month changes
  const fetchDates = useCallback(async (month: Date) => {
    setLoadingDates(true);
    setAvailableDates([]);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setNoConfigs(false);
    try {
      const monthStr = format(month, "yyyy-MM");
      const res = await fetch(`/api/panel/reschedules/available-slots?month=${monthStr}`);
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
    fetchDates(viewMonth);
  }, [viewMonth, fetchDates]);

  // Fetch slots when date is selected
  const handleDaySelect = useCallback(async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/panel/reschedules/available-slots?date=${date}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlots(data.appointments ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  function handleMonthChange(month: Date) {
    setViewMonth(month);
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
            {isSubmitting ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
