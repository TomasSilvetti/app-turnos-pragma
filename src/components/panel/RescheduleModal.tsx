"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { X, AlertCircle } from "lucide-react";
import MiniCalendar from "@/components/public/MiniCalendar";
import AppointmentSlots, {
  type Appointment,
} from "@/components/public/AppointmentSlots";
import type { RescheduleItem } from "./RescheduleList";

// Mock de fechas y slots — se reemplaza al conectar con porcion-004
const MOCK_AVAILABLE_DATES = (() => {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i * 2);
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return dates;
})();

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "1", time: "09:00", price: 2500 },
  { id: "2", time: "10:00", price: 2500 },
  { id: "3", time: "11:00", price: 2500 },
  { id: "4", time: "14:00", price: 3000 },
  { id: "5", time: "15:00", price: 3000 },
  { id: "6", time: "16:00", price: 3000 },
];

type Props = {
  item: RescheduleItem;
  onClose: () => void;
  onRescheduled: (bookingId: string) => void;
};

export default function RescheduleModal({ item, onClose, onRescheduled }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(MOCK_AVAILABLE_DATES[0]);
  const [viewMonth, setViewMonth] = useState<Date>(() => parseISO(MOCK_AVAILABLE_DATES[0]));
  const [selectedSlot, setSelectedSlot] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDaySelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot: Appointment) => {
    setSelectedSlot(slot);
    setError(null);
  }, []);

  async function handleConfirm() {
    if (!selectedSlot || isLoading) return;
    setIsLoading(true);
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
      setIsLoading(false);
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
      <div className="w-full max-w-md rounded-lg bg-white border border-[#E0E0DB] shadow-lg flex flex-col gap-5 p-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="reschedule-modal-title"
              className="font-heading text-lg text-[#2A2829] leading-tight"
            >
              Reprogramar turno
            </h2>
            <p className="font-body text-sm text-[#253551] font-medium mt-0.5">
              {item.clientName} — {item.clientPhone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F4F5F7] transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} className="text-[#2A2829]" />
          </button>
        </div>

        {/* Datos del cliente (precargados, no editables) */}
        <div className="rounded-lg bg-[#F4F5F7] border border-[#E0E0DB] p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reschedule-name"
              className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide opacity-60"
            >
              Nombre del cliente
            </label>
            <input
              id="reschedule-name"
              type="text"
              value={item.clientName}
              disabled
              className="font-body text-sm text-[#2A2829] border border-[#E0E0DB] rounded-md px-3 py-2 bg-white opacity-60 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reschedule-phone"
              className="font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide opacity-60"
            >
              Teléfono
            </label>
            <input
              id="reschedule-phone"
              type="tel"
              value={item.clientPhone}
              disabled
              className="font-body text-sm text-[#2A2829] border border-[#E0E0DB] rounded-md px-3 py-2 bg-white opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Selector de fecha */}
        <MiniCalendar
          availableDates={MOCK_AVAILABLE_DATES}
          selectedDate={selectedDate}
          viewMonth={viewMonth}
          onMonthChange={setViewMonth}
          onDaySelect={handleDaySelect}
        />

        {/* Slots del día seleccionado */}
        {MOCK_APPOINTMENTS.length === 0 ? (
          <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 text-center">
            <p className="font-body text-sm text-[#2A2829] opacity-50">
              No hay turnos disponibles. Revisá tu configuración de horarios.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-white border border-[#E0E0DB] p-5">
            <h3 className="font-heading text-sm text-[#2A2829] mb-4 uppercase tracking-wide">
              Elegí el nuevo turno
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {MOCK_APPOINTMENTS.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleSlotSelect(slot)}
                  className={[
                    "flex flex-col items-start gap-1 rounded-lg border p-4 transition-colors text-left",
                    selectedSlot?.id === slot.id
                      ? "border-[#253551] bg-[#eef1f6]"
                      : "border-[#E0E0DB] bg-[#F4F5F7] hover:border-[#253551] hover:bg-[#eef1f6]",
                  ].join(" ")}
                  aria-pressed={selectedSlot?.id === slot.id}
                  aria-label={`Turno a las ${slot.time} por $${slot.price.toLocaleString("es-AR")}`}
                >
                  <span className="font-heading text-base text-[#2A2829]">{slot.time}</span>
                  <span className="font-body text-sm text-[#253551] font-medium">
                    ${slot.price.toLocaleString("es-AR")}
                  </span>
                </button>
              ))}
            </div>
          </div>
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
            className="flex-1 font-body text-sm text-[#2A2829] border border-[#E0E0DB] rounded-md py-2.5 hover:bg-[#F4F5F7] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || isLoading}
            className="flex-1 font-body text-sm text-white bg-[#253551] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
