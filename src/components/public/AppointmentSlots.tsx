"use client";

import { Clock } from "lucide-react";

export type Appointment = {
  id: string;
  time: string;
  price: number;
  booked?: boolean;
  serviceTypes?: { id: string; title: string; price: number }[];
};

type Props = {
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
};

export default function AppointmentSlots({ appointments, onSelect }: Props) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
          <Clock size={22} className="text-gray-300" aria-hidden="true" />
        </div>
        <p className="font-body text-sm text-gray-400 text-center">
          No hay turnos disponibles para este día
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
      <h2 className="font-heading text-xs text-gray-400 mb-4 uppercase tracking-widest">
        Turnos disponibles
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {appointments.map((appointment) => (
          <button
            key={appointment.id}
            onClick={() => !appointment.booked && onSelect(appointment)}
            disabled={appointment.booked}
            aria-label={
              appointment.booked
                ? `Turno a las ${appointment.time} — Reservado`
                : `Seleccionar turno a las ${appointment.time}`
            }
            className={
              appointment.booked
                ? "group flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 cursor-not-allowed text-left"
                : "group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-[#253551] hover:bg-[#253551] transition-all duration-200 text-left cursor-pointer shadow-sm hover:shadow-md"
            }
          >
            <div className="flex items-center gap-2">
              <Clock
                size={14}
                className={
                  appointment.booked
                    ? "text-gray-300"
                    : "text-[#253551] group-hover:text-white transition-colors"
                }
              />
              <span
                className={
                  appointment.booked
                    ? "font-heading text-sm text-gray-400"
                    : "font-heading text-sm text-[#2A2829] group-hover:text-white transition-colors"
                }
              >
                {appointment.time}
              </span>
            </div>
            {appointment.booked ? (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Ocupado
              </span>
            ) : (
              <span className="text-[10px] font-medium text-emerald-600 group-hover:text-emerald-300 transition-colors">
                Disponible
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
