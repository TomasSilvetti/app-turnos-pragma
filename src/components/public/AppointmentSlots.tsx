"use client";

import { Clock } from "lucide-react";

export type Appointment = {
  id: string;
  time: string;
  price: number;
  booked?: boolean;
  disabled?: boolean;
  serviceTypes?: { id: string; title: string; price: number }[];
};

type Props = {
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
};

export default function AppointmentSlots({ appointments, onSelect }: Props) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#2d3548] shadow-sm p-6 flex flex-col items-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#2d3548] flex items-center justify-center">
          <Clock size={22} className="text-gray-300 dark:text-[#475569]" aria-hidden="true" />
        </div>
        <p className="font-body text-sm text-gray-400 dark:text-[#64748b] text-center">
          No hay turnos disponibles para este día
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#2d3548] shadow-sm p-5">
      <h2 className="font-heading text-xs text-gray-400 dark:text-[#64748b] mb-4 uppercase tracking-widest">
        Turnos disponibles
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {appointments.map((appointment) => {
          const unavailable = appointment.booked || appointment.disabled;
          return (
            <button
              key={appointment.id}
              onClick={() => !unavailable && onSelect(appointment)}
              disabled={unavailable}
              aria-label={
                appointment.booked
                  ? `Turno a las ${appointment.time} — Reservado`
                  : appointment.disabled
                  ? `Turno a las ${appointment.time} — No disponible`
                  : `Seleccionar turno a las ${appointment.time}`
              }
              className={
                unavailable
                  ? "group flex items-center justify-between rounded-lg border border-gray-100 dark:border-[#2d3548] bg-gray-50 dark:bg-[#151e2d] px-4 py-3 cursor-not-allowed text-left"
                  : "group flex items-center justify-between rounded-lg border border-gray-200 dark:border-[#2d3548] bg-white dark:bg-[#253045] px-4 py-3 hover:border-[var(--brand-color)] hover:bg-[var(--brand-color)] transition-all duration-200 text-left cursor-pointer shadow-sm hover:shadow-md"
              }
            >
              <div className="flex items-center gap-2">
                <Clock
                  size={14}
                  className={
                    unavailable
                      ? "text-gray-300 dark:text-[#475569]"
                      : "text-[var(--brand-color)] group-hover:text-white transition-colors"
                  }
                />
                <span
                  className={
                    unavailable
                      ? "font-heading text-sm text-gray-400 dark:text-[#475569]"
                      : "font-heading text-sm text-[#2A2829] dark:text-[#e2e8f0] group-hover:text-white transition-colors"
                  }
                >
                  {appointment.time}
                </span>
              </div>
              {appointment.booked ? (
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#475569] bg-gray-100 dark:bg-[#2d3548] px-2 py-0.5 rounded-full">
                  Ocupado
                </span>
              ) : appointment.disabled ? (
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#475569] bg-gray-100 dark:bg-[#2d3548] px-2 py-0.5 rounded-full">
                  No disponible
                </span>
              ) : (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  Disponible
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
