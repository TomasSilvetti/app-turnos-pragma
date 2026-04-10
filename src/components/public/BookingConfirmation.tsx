"use client";

import { CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
  businessName: string;
  date: string; // YYYY-MM-DD
  time: string;
  price: number;
  onBack: () => void;
};

export default function BookingConfirmation({
  businessName,
  date,
  time,
  price,
  onBack,
}: Props) {
  const formattedDate = format(parseISO(date), "EEEE d 'de' MMMM", {
    locale: es,
  });

  return (
    <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 flex flex-col items-center gap-6 py-10 text-center">
      {/* Ícono de éxito */}
      <div className="h-16 w-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
        <CheckCircle size={36} className="text-[#22c55e]" aria-hidden="true" />
      </div>

      {/* Título */}
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl text-[#2A2829]">
          ¡Reserva confirmada!
        </h2>
        <p className="font-body text-sm text-[#2A2829] opacity-60">
          Te esperamos pronto
        </p>
      </div>

      {/* Resumen */}
      <div className="w-full rounded-lg bg-[#F4F5F7] border border-[#E0E0DB] p-4 flex flex-col gap-3 text-left">
        <div className="flex flex-col gap-0.5">
          <span className="font-small text-[10px] text-[#2A2829] opacity-50 uppercase tracking-wide">
            Negocio
          </span>
          <span className="font-body text-sm text-[#2A2829] font-medium">
            {businessName}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-small text-[10px] text-[#2A2829] opacity-50 uppercase tracking-wide">
            Fecha
          </span>
          <span className="font-body text-sm text-[#2A2829] font-medium capitalize">
            {formattedDate}
          </span>
        </div>

        <div className="flex justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-small text-[10px] text-[#2A2829] opacity-50 uppercase tracking-wide">
              Hora
            </span>
            <span className="font-body text-sm text-[#2A2829] font-medium">
              {time}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-right">
            <span className="font-small text-[10px] text-[#2A2829] opacity-50 uppercase tracking-wide">
              Precio
            </span>
            <span className="font-body text-sm text-[#253551] font-medium">
              ${price.toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </div>

      {/* Volver */}
      <button
        onClick={onBack}
        className="font-body text-sm text-[#253551] underline underline-offset-2 hover:text-[#1c2a40] transition-colors"
      >
        Ver otros turnos disponibles
      </button>
    </div>
  );
}
