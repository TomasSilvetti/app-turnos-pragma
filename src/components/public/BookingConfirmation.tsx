"use client";

import { CheckCircle, Copy, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

type Props = {
  businessName: string;
  date: string; // YYYY-MM-DD
  time: string;
  price: number;
  cbu: string | null;
  alias: string | null;
  clientName: string | null;
  onBack: () => void;
};

export default function BookingConfirmation({
  businessName,
  date,
  time,
  price,
  cbu,
  alias,
  clientName,
  onBack,
}: Props) {
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);

  function copyToClipboard(value: string, type: "cbu" | "alias") {
    navigator.clipboard.writeText(value).then(() => {
      if (type === "cbu") {
        setCopiedCbu(true);
        setTimeout(() => setCopiedCbu(false), 2000);
      } else {
        setCopiedAlias(true);
        setTimeout(() => setCopiedAlias(false), 2000);
      }
    });
  }

  const hasPaymentInfo = !!(cbu || alias);
  const formattedDate = format(parseISO(date), "EEEE d 'de' MMMM", {
    locale: es,
  });

  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex flex-col items-center gap-6 py-10 text-center">
      {/* Ícono de éxito */}
      <div className="h-16 w-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
        <CheckCircle size={36} className="text-[#22c55e]" aria-hidden="true" />
      </div>

      {/* Título */}
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl text-[#2A2829] dark:text-[#e2e8f0]">
          ¡Reserva confirmada!
        </h2>
        {clientName ? (
          <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-70 dark:opacity-100">
            Tu turno fue reservado,{" "}
            <span className="font-medium text-[#2A2829] dark:text-[#e2e8f0] opacity-100">
              {clientName}
            </span>
          </p>
        ) : (
          <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100">
            Te esperamos pronto
          </p>
        )}
      </div>

      {/* Resumen */}
      <div className="w-full rounded-lg bg-[#F4F5F7] dark:bg-[#151e2d] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3 text-left">
        <div className="flex flex-col gap-0.5">
          <span className="font-small text-[10px] text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide">
            Negocio
          </span>
          <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium">
            {businessName}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-small text-[10px] text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide">
            Fecha
          </span>
          <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium capitalize">
            {formattedDate}
          </span>
        </div>

        <div className="flex justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-small text-[10px] text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide">
              Hora
            </span>
            <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium">
              {time}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-right">
            <span className="font-small text-[10px] text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide">
              Precio
            </span>
            <span className="font-body text-sm text-[var(--brand-color)] font-medium">
              ${price.toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </div>

      {/* Datos de transferencia */}
      {hasPaymentInfo && (
        <div className="w-full flex flex-col gap-3">
          <p className="font-body text-xs text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide text-center">
            Datos para transferencia
          </p>
          <div className="w-full rounded-lg bg-[#F4F5F7] dark:bg-[#151e2d] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
            {alias && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-small text-[10px] text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide">
                    Alias
                  </span>
                  <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium truncate">
                    {alias}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(alias, "alias")}
                  className="shrink-0 p-1.5 rounded hover:bg-[#E0E0DB] dark:hover:bg-[#2d3548] transition-colors"
                  aria-label="Copiar alias"
                >
                  {copiedAlias ? (
                    <Check size={15} className="text-[#22c55e]" />
                  ) : (
                    <Copy size={15} className="text-[var(--brand-color)]" />
                  )}
                </button>
              </div>
            )}
            {cbu && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-small text-[10px] text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide">
                    CBU
                  </span>
                  <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium truncate">
                    {cbu}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(cbu, "cbu")}
                  className="shrink-0 p-1.5 rounded hover:bg-[#E0E0DB] dark:hover:bg-[#2d3548] transition-colors"
                  aria-label="Copiar CBU"
                >
                  {copiedCbu ? (
                    <Check size={15} className="text-[#22c55e]" />
                  ) : (
                    <Copy size={15} className="text-[var(--brand-color)]" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onBack}
          className="font-body text-sm text-[var(--brand-color)] underline underline-offset-2 hover:text-[#1c2a40] transition-colors"
        >
          Reservar otro turno
        </button>
      </div>
    </div>
  );
}
