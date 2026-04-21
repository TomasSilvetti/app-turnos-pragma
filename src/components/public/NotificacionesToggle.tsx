"use client";

type Props = {
  enabled: boolean;
  loading?: boolean;
  onChange: () => void;
};

export default function NotificacionesToggle({ enabled, loading = false, onChange }: Props) {
  return (
    <div className="flex items-start gap-3 pt-2 border-t border-[#E0E0DB] mt-1">
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-[#2A2829]/70 leading-relaxed">
          Recibí recordatorios de tus turnos y avisos cuando se libere un lugar en lista de espera.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Activar notificaciones push"
        disabled={loading}
        onClick={onChange}
        className={[
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          enabled ? "bg-[var(--brand-color)]" : "bg-[#E0E0DB]",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            enabled ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
