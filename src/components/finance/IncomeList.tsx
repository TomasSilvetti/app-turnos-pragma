"use client";

import type { Ingreso } from "@/app/dashboard/finanzas/page";

type Props = {
  ingresos: Ingreso[];
  loading: boolean;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatFecha(fecha: string, hora: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const diaSemana = DIAS[date.getDay()];
  const mes = MESES[month - 1];
  return `${hora} · ${diaSemana} ${day} ${mes}`;
}

function formatARS(value: number): string {
  return "+$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function IncomeList({ ingresos, loading }: Props) {
  return (
    <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 flex flex-col gap-4">
      <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280]">
        Ingresos — Turnos confirmados
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[#F4F5F7] rounded animate-pulse" />
          ))}
        </div>
      ) : ingresos.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">Sin ingresos registrados.</p>
      ) : (
        <ul className="space-y-1">
          {ingresos.map((ingreso, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-[#E0E0DB] last:border-0"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-[#2A2829]">
                  {formatFecha(ingreso.fecha, ingreso.hora)}
                </span>
                <span className="font-small text-[11px] text-[#6b7280] truncate">
                  {ingreso.clienteNombre.toLowerCase()}
                </span>
              </div>
              <span className="font-small text-sm text-[#22c55e] font-medium ml-2 shrink-0">
                {formatARS(ingreso.monto)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
