"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const DIA_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type DisponibilidadItem = {
  diaSemana: number; // 0=Lunes … 6=Domingo
  horaInicio: string;
  horaFin: string;
};

type InitialConfig = {
  cualquierVacante: boolean;
  disponibilidades: DisponibilidadItem[];
};

type Props = {
  isOpen: boolean;
  initialConfig?: InitialConfig | null;
  onConfirm: (cualquierVacante: boolean, disponibilidades: DisponibilidadItem[]) => void;
  onClose: () => void;
};

export default function WaitlistAvailabilityModal({ isOpen, initialConfig, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<"cualquier" | "configurar">("cualquier");
  const [diasActivos, setDiasActivos] = useState<Set<number>>(new Set());
  const [rangos, setRangos] = useState<Record<number, { horaInicio: string; horaFin: string }>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (initialConfig) {
      setModo(initialConfig.cualquierVacante ? "cualquier" : "configurar");
      const dias = new Set(initialConfig.disponibilidades.map((d) => d.diaSemana));
      setDiasActivos(dias);
      const r: Record<number, { horaInicio: string; horaFin: string }> = {};
      for (const d of initialConfig.disponibilidades) {
        r[d.diaSemana] = { horaInicio: d.horaInicio, horaFin: d.horaFin };
      }
      setRangos(r);
    } else {
      setModo("cualquier");
      setDiasActivos(new Set());
      setRangos({});
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") trapFocus(e);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function trapFocus(e: KeyboardEvent) {
    if (!dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function toggleDia(index: number) {
    setDiasActivos((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        if (!rangos[index]) {
          setRangos((r) => ({ ...r, [index]: { horaInicio: "09:00", horaFin: "18:00" } }));
        }
      }
      return next;
    });
  }

  function handleConfirmar() {
    if (modo === "cualquier") {
      onConfirm(true, []);
      return;
    }
    const disponibilidades: DisponibilidadItem[] = Array.from(diasActivos).map((d) => ({
      diaSemana: d,
      horaInicio: rangos[d]?.horaInicio ?? "09:00",
      horaFin: rangos[d]?.horaFin ?? "18:00",
    }));
    onConfirm(false, disponibilidades);
  }

  const puedeConfirmar = modo === "cualquier" || diasActivos.size > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" aria-hidden="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-avail-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-xl bg-white border border-[#E0E0DB] p-6 shadow-lg focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#2A2829]/40 hover:text-[#2A2829] transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col gap-5">
          <h2 id="waitlist-avail-title" className="font-heading text-base text-[#2A2829]">
            ¿En qué momentos querés que te avisemos?
          </h2>

          {/* Selector de modo */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setModo("cualquier")}
              className={[
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                modo === "cualquier"
                  ? "border-[var(--brand-color)] bg-[var(--brand-color)]/5"
                  : "border-[#E0E0DB] hover:bg-[#F4F5F7]",
              ].join(" ")}
              aria-pressed={modo === "cualquier"}
            >
              <span
                className={[
                  "h-4 w-4 rounded-full border-2 shrink-0",
                  modo === "cualquier"
                    ? "border-[var(--brand-color)] bg-[var(--brand-color)]"
                    : "border-[#E0E0DB]",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="font-body text-sm text-[#2A2829]">Notificarme cualquier vacante</span>
            </button>

            <button
              type="button"
              onClick={() => setModo("configurar")}
              className={[
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                modo === "configurar"
                  ? "border-[var(--brand-color)] bg-[var(--brand-color)]/5"
                  : "border-[#E0E0DB] hover:bg-[#F4F5F7]",
              ].join(" ")}
              aria-pressed={modo === "configurar"}
            >
              <span
                className={[
                  "h-4 w-4 rounded-full border-2 shrink-0",
                  modo === "configurar"
                    ? "border-[var(--brand-color)] bg-[var(--brand-color)]"
                    : "border-[#E0E0DB]",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="font-body text-sm text-[#2A2829]">Configurar disponibilidad</span>
            </button>
          </div>

          {/* Configuración de días y rangos */}
          {modo === "configurar" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5">
                {DIAS.map((letra, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDia(i)}
                    aria-label={`${diasActivos.has(i) ? "Desactivar" : "Activar"} ${DIA_LABELS[i]}`}
                    aria-pressed={diasActivos.has(i)}
                    className={[
                      "h-9 w-9 rounded-lg font-body text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-1",
                      diasActivos.has(i)
                        ? "bg-[var(--brand-color)] text-white"
                        : "bg-[#F4F5F7] text-[#2A2829]/60 hover:bg-[#E0E0DB]",
                    ].join(" ")}
                  >
                    {letra}
                  </button>
                ))}
              </div>

              {Array.from(diasActivos)
                .sort((a, b) => a - b)
                .map((diaIndex) => (
                  <div key={diaIndex} className="flex items-center gap-2">
                    <span className="font-body text-xs text-[#2A2829]/60 w-16 shrink-0">
                      {DIA_LABELS[diaIndex]}
                    </span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        value={rangos[diaIndex]?.horaInicio ?? "09:00"}
                        onChange={(e) =>
                          setRangos((r) => ({
                            ...r,
                            [diaIndex]: { ...r[diaIndex], horaInicio: e.target.value },
                          }))
                        }
                        aria-label={`Hora inicio ${DIA_LABELS[diaIndex]}`}
                        className="flex-1 rounded-lg border border-[#E0E0DB] px-2 py-1.5 font-body text-xs text-[#2A2829] focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] focus:ring-offset-1"
                      />
                      <span className="font-body text-xs text-[#2A2829]/40">–</span>
                      <input
                        type="time"
                        value={rangos[diaIndex]?.horaFin ?? "18:00"}
                        onChange={(e) =>
                          setRangos((r) => ({
                            ...r,
                            [diaIndex]: { ...r[diaIndex], horaFin: e.target.value },
                          }))
                        }
                        aria-label={`Hora fin ${DIA_LABELS[diaIndex]}`}
                        className="flex-1 rounded-lg border border-[#E0E0DB] px-2 py-1.5 font-body text-xs text-[#2A2829] focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] focus:ring-offset-1"
                      />
                    </div>
                  </div>
                ))}

              {diasActivos.size === 0 && (
                <p className="font-body text-xs text-[#2A2829]/50">
                  Seleccioná al menos un día de la semana.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!puedeConfirmar}
            className="w-full rounded-lg bg-[var(--brand-color)] px-4 py-2.5 font-body text-sm font-medium text-white hover:bg-[var(--brand-color-dark,#1c2a40)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-2"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
