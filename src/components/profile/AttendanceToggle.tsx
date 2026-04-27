"use client";

import { useEffect, useState } from "react";

type State = {
  attendsAppointments: boolean;
  hasActiveSchedule: boolean;
};

export function AttendanceToggle() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/attends-appointments")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setState(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    if (!state || saving) return;
    const next = !state.attendsAppointments;

    setSaving(true);
    setErrorMsg(null);

    const res = await fetch("/api/profile/attends-appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendsAppointments: next }),
    });

    if (res.ok) {
      const data = await res.json();
      setState((prev) => prev ? { ...prev, attendsAppointments: data.attendsAppointments } : prev);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "No se pudo guardar el cambio.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-48 bg-[#E0E0DB] dark:bg-[#1a2840] rounded mb-2" />
        <div className="h-4 w-64 bg-[#E0E0DB] dark:bg-[#1a2840] rounded" />
      </div>
    );
  }

  if (!state) return null;

  const canToggleOff = state.attendsAppointments && state.hasActiveSchedule;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8]">
        Atención al cliente
      </p>

      <div className="flex items-start gap-3">
        <button
          role="switch"
          aria-checked={state.attendsAppointments}
          aria-label="Mostrar turnos disponibles para este usuario"
          disabled={canToggleOff || saving}
          onClick={handleToggle}
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
            state.attendsAppointments
              ? "bg-[var(--brand-color)]"
              : "bg-[#cbd5e1] dark:bg-[#475569]"
          } ${canToggleOff || saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
              state.attendsAppointments ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
            Visible para clientes
          </span>
          <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">
            Si desactivás esta opción, los clientes no podrán reservar turnos con vos.
          </p>
        </div>
      </div>

      {canToggleOff && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Debés desactivar tu configuración de turnos antes de desactivar tu atención al cliente.
        </p>
      )}

      {errorMsg && (
        <p className="text-xs text-[#ef4444] mt-1">{errorMsg}</p>
      )}
    </div>
  );
}
