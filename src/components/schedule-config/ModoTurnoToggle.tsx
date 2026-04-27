"use client";

import { cn } from "@/lib/utils";

type ModoTurnoToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export function ModoTurnoToggle({ value, onChange, disabled = false }: ModoTurnoToggleProps) {
  return (
    <div className="rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
            Duración por tipo de turno
          </p>
          <p className="mt-0.5 text-xs text-[#2A2829]/60 dark:text-[#94a3b8] leading-relaxed">
            {value
              ? "Cada tipo de turno tiene su propia duración. El intervalo entre turnos se determina por el tipo elegido."
              : "Todos los turnos tienen la misma duración fija definida en la configuración de horario."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label="Activar duración por tipo de turno"
          disabled={disabled}
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] focus:ring-offset-2",
            value
              ? "bg-[var(--brand-color)]"
              : "bg-[#E0E0DB] dark:bg-[#1a2840]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
              value ? "translate-x-6" : "translate-x-1"
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
