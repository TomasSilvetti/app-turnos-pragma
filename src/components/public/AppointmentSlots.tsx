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
      <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 flex flex-col items-center gap-3 py-10">
        <Clock size={32} className="text-[#E0E0DB]" aria-hidden="true" />
        <p className="font-body text-sm text-[#2A2829] opacity-50 text-center">
          No hay turnos disponibles para este día
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-[#E0E0DB] p-5">
      <h2 className="font-heading text-sm text-[#2A2829] mb-4 uppercase tracking-wide">
        Turnos disponibles
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {appointments.map((appointment) => (
          <button
            key={appointment.id}
            onClick={() => !appointment.booked && onSelect(appointment)}
            disabled={appointment.booked}
            className={
              appointment.booked
                ? "flex flex-col items-start gap-1 rounded-lg border border-[#E0E0DB] bg-[#F4F5F7] p-4 cursor-not-allowed text-left opacity-80"
                : "flex flex-col items-start gap-1 rounded-lg border border-green-200 bg-green-50 p-4 hover:border-green-400 hover:bg-green-100 transition-colors text-left"
            }
            aria-label={
              appointment.booked
                ? `Turno a las ${appointment.time} — Reservado`
                : `Turno a las ${appointment.time} por $${appointment.price.toLocaleString("es-AR")}`
            }
          >
            <span className="font-heading text-base text-[#2A2829]">
              {appointment.time}
            </span>
            <span className="font-body text-sm text-[#253551] font-medium">
              ${appointment.price.toLocaleString("es-AR")}
            </span>
            {appointment.booked && (
              <span className="font-small text-xs text-[#2A2829] opacity-50 mt-0.5">
                Reservado
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
