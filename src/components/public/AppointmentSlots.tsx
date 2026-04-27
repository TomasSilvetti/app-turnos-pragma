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
  onOccupiedSelect?: (appointment: Appointment) => void;
  clientBookingTimes?: string[]; // HH:MM — horarios con turno propio del cliente
};

export default function AppointmentSlots({ appointments, onSelect, onOccupiedSelect, clientBookingTimes }: Props) {
  const clientBookingSet = new Set(clientBookingTimes ?? []);
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-[#1a2840] shadow-sm p-6 flex flex-col items-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#1a2840] flex items-center justify-center">
          <Clock size={22} className="text-gray-300 dark:text-[#475569]" aria-hidden="true" />
        </div>
        <p className="font-body text-sm text-gray-400 dark:text-[#64748b] text-center">
          No hay turnos disponibles para este día
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-[#1a2840] shadow-sm p-5">
      <h2 className="font-heading text-xs text-gray-400 dark:text-[#64748b] mb-4 uppercase tracking-widest">
        Turnos disponibles
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {appointments.map((appointment) => {
          const unavailable = appointment.booked || appointment.disabled;
          const isClientBooking = clientBookingSet.has(appointment.time);
          const isOccupied = appointment.booked && !isClientBooking;
          return (
            <button
              key={appointment.id}
              onClick={() => {
                if (isClientBooking || !unavailable) {
                  onSelect(appointment);
                } else if (isOccupied && onOccupiedSelect) {
                  onOccupiedSelect(appointment);
                }
              }}
              disabled={appointment.disabled && !appointment.booked && !isClientBooking}
              aria-label={
                isClientBooking
                  ? `Tu turno a las ${appointment.time}`
                  : appointment.booked
                  ? `Turno a las ${appointment.time} — Ocupado, unirse a lista de espera`
                  : appointment.disabled
                  ? `Turno a las ${appointment.time} — No disponible`
                  : `Seleccionar turno a las ${appointment.time}`
              }
              className={
                isClientBooking
                  ? "group flex items-center justify-between rounded-lg border border-[var(--brand-color)]/40 bg-[var(--brand-color)]/10 px-4 py-3 text-left cursor-pointer hover:bg-[var(--brand-color)]/20 transition-all duration-200"
                  : isOccupied
                  ? "group flex items-center justify-between rounded-lg border border-gray-200 dark:border-[#1a2840] bg-gray-100 dark:bg-[#1a2438] px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#212d42] transition-all duration-200 text-left"
                  : appointment.disabled
                  ? "group flex items-center justify-between rounded-lg border border-gray-100 dark:border-[#1a2840] bg-gray-50 dark:bg-[#151e2d] px-4 py-3 cursor-not-allowed text-left"
                  : "group flex items-center justify-between rounded-lg border border-gray-200 dark:border-[#1a2840] bg-white dark:bg-[#253045] px-4 py-3 hover:border-[var(--brand-color)] hover:bg-[var(--brand-color)] transition-all duration-200 text-left cursor-pointer shadow-sm hover:shadow-md"
              }
            >
              <div className="flex items-center gap-2">
                <Clock
                  size={14}
                  className={
                    isClientBooking
                      ? "text-[var(--brand-color)]"
                      : isOccupied
                      ? "text-gray-400 dark:text-[#64748b]"
                      : appointment.disabled
                      ? "text-gray-300 dark:text-[#475569]"
                      : "text-[var(--brand-color)] group-hover:text-white transition-colors"
                  }
                />
                <span
                  className={
                    isClientBooking
                      ? "font-heading text-sm text-[var(--brand-color)] dark:text-[#93c5fd] font-semibold"
                      : isOccupied
                      ? "font-heading text-sm text-gray-500 dark:text-[#64748b]"
                      : appointment.disabled
                      ? "font-heading text-sm text-gray-400 dark:text-[#475569]"
                      : "font-heading text-sm text-[#2A2829] dark:text-[#e2e8f0] group-hover:text-white transition-colors"
                  }
                >
                  {appointment.time}
                </span>
              </div>
              {isClientBooking ? (
                <span className="text-[10px] font-medium text-[var(--brand-color)] dark:text-[#93c5fd] bg-[var(--brand-color)]/10 px-2 py-0.5 rounded-full">
                  Tu turno
                </span>
              ) : appointment.booked ? (
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#475569] bg-gray-100 dark:bg-[#1a2840] px-2 py-0.5 rounded-full">
                  Ocupado
                </span>
              ) : appointment.disabled ? (
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#475569] bg-gray-100 dark:bg-[#1a2840] px-2 py-0.5 rounded-full">
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
