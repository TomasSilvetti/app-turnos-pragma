"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type DisableSlotModalProps = {
  open: boolean;
  time: string;
  date: Date;
  isDisabled: boolean;
  onClose: () => void;
  onDisable: () => Promise<void>;
  onEnable: () => Promise<void>;
};

export function DisableSlotModal({
  open,
  time,
  date,
  isDisabled,
  onClose,
  onDisable,
  onEnable,
}: DisableSlotModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const dayLabel = format(date, "EEEE d 'de' MMMM", { locale: es });

  async function handleAction() {
    setLoading(true);
    try {
      if (isDisabled) {
        await onEnable();
      } else {
        await onDisable();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Opciones para turno de las ${time}`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-[#1e293b] rounded-t-2xl sm:rounded-2xl shadow-xl p-6 flex flex-col gap-5 mx-auto">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eef1f6] dark:bg-[var(--brand-color)]/20 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-[var(--brand-color)]" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold text-[#2A2829] dark:text-[#e2e8f0] capitalize">
                {dayLabel}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                Turno de las <span className="font-medium text-[#2A2829] dark:text-[#e2e8f0]">{time}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#2d3548] transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-[#2d3548]" />

        <p className="text-sm text-gray-500 dark:text-slate-400">
          {isDisabled
            ? "Este turno está deshabilitado para este día. ¿Querés volver a habilitarlo?"
            : "Los clientes no podrán reservar este turno en este día."}
        </p>

        <button
          onClick={handleAction}
          disabled={loading}
          className={`w-full rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDisabled
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {loading
            ? isDisabled ? "Habilitando..." : "Desactivando..."
            : isDisabled ? "Habilitar turno" : "Desactivar turno"}
        </button>

        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-center transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
