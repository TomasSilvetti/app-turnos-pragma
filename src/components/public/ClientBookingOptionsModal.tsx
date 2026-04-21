"use client";

import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { X, AlertCircle, Loader2, CalendarClock, Trash2, Clock } from "lucide-react";

export type ClientBookingInfo = {
  bookingId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  serviceType: string;
  minAdvanceHours: number;
  employeeId: string;
};

type Props = {
  booking: ClientBookingInfo;
  slug: string;
  onClose: () => void;
  onCancelSuccess: (bookingId: string) => void;
  onReschedule: (booking: ClientBookingInfo) => void;
};

type View = "main" | "warn-respaldo" | "confirm-cancel";

function isWithinMinAdvance(date: string, time: string, minAdvanceHours: number): boolean {
  if (minAdvanceHours === 0) return false;
  const appointmentDateTime = new Date(`${date}T${time}:00`);
  const diffHours = (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours < minAdvanceHours;
}

export default function ClientBookingOptionsModal({
  booking,
  onClose,
  onCancelSuccess,
  onReschedule,
}: Props) {
  const [view, setView] = useState<View>("main");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRespaldo, setCheckingRespaldo] = useState(false);
  const [profesionalRespaldo, setProfesionalRespaldo] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const blocked = isWithinMinAdvance(booking.date, booking.time, booking.minAdvanceHours);

  const formattedDate = format(parseISO(booking.date), "EEEE d 'de' MMMM", { locale: es });

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

  async function handleClickCancelar() {
    setCheckingRespaldo(true);
    try {
      const res = await fetch(`/api/lista-espera/check-respaldo?bookingId=${encodeURIComponent(booking.bookingId)}`);
      if (res.ok) {
        const data = await res.json() as { esRespaldo: boolean; profesionalNombre: string | null };
        if (data.esRespaldo) {
          setProfesionalRespaldo(data.profesionalNombre);
          setView("warn-respaldo");
          return;
        }
      }
    } catch {
      // Si el endpoint no está disponible aún, continuar sin warning
    } finally {
      setCheckingRespaldo(false);
    }
    setView("confirm-cancel");
  }

  async function handleConfirmCancel() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/bookings/${booking.bookingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "No se pudo cancelar el turno");
      }
      onCancelSuccess(booking.bookingId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar el turno");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-booking-modal-title"
    >
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-lg flex flex-col gap-5 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="client-booking-modal-title"
              className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0] leading-tight"
            >
              {view === "main" ? "Tu turno" : "Cancelar turno"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} className="text-[#2A2829] dark:text-[#e2e8f0]" />
          </button>
        </div>

        {/* Detalle del turno */}
        <div className="rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-2">
          {booking.serviceType && (
            <p className="font-body text-sm font-semibold text-[#2A2829] dark:text-[#e2e8f0]">
              {booking.serviceType}
            </p>
          )}
          <div className="flex items-center gap-2 text-[#2A2829]/70 dark:text-[#94a3b8]">
            <CalendarClock size={14} aria-hidden="true" />
            <span className="font-body text-sm capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-[#2A2829]/70 dark:text-[#94a3b8]">
            <Clock size={14} aria-hidden="true" />
            <span className="font-body text-sm">{booking.time} hs</span>
          </div>
        </div>

        {/* Aviso de tiempo mínimo */}
        {blocked && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-3"
          >
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-sm text-amber-700 dark:text-amber-400">
              Este turno no puede modificarse. Se requiere un mínimo de{" "}
              <strong>{booking.minAdvanceHours} hora{booking.minAdvanceHours === 1 ? "" : "s"}</strong>{" "}
              de anticipación.
            </p>
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

        {view === "warn-respaldo" ? (
          <div className="flex flex-col gap-4">
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-3"
            >
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-body text-sm text-amber-700 dark:text-amber-400">
                Si cancelás este turno también saldrás de la lista de espera
                {profesionalRespaldo ? ` de ${profesionalRespaldo}` : ""}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("main")}
                className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isLoading}
                className="flex-1 font-body text-sm text-white bg-[#ef4444] rounded-md py-2.5 hover:bg-[#dc2626] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        ) : view === "main" ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onReschedule(booking)}
              disabled={blocked}
              className="w-full font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reprogramar
            </button>
            <button
              type="button"
              onClick={handleClickCancelar}
              disabled={blocked || checkingRespaldo}
              className="w-full font-body text-sm text-[#ef4444] border border-[#ef4444]/30 rounded-md py-2.5 hover:bg-[#ef4444]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {checkingRespaldo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} aria-hidden="true" />}
              Cancelar turno
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8]">
              ¿Estás seguro de que querés cancelar este turno?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("main")}
                disabled={isLoading}
                className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isLoading}
                className="flex-1 font-body text-sm text-white bg-[#ef4444] rounded-md py-2.5 hover:bg-[#dc2626] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
