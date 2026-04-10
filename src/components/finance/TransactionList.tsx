"use client";

import type { Ingreso, Egreso } from "@/app/dashboard/finanzas/page";

type Props = {
  ingresos: Ingreso[];
  egresos: Egreso[];
  loading: boolean;
};

type Transaction =
  | { type: "ingreso"; data: Ingreso; sortKey: string }
  | { type: "egreso"; data: Egreso; sortKey: string };

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatFechaIngreso(fecha: string, hora: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const diaSemana = DIAS[date.getDay()];
  const mes = MESES[month - 1];
  return `${hora} · ${diaSemana} ${day} ${mes}`;
}

function formatFechaEgreso(createdAt: string): string {
  const date = new Date(createdAt);
  const diaSemana = DIAS[date.getDay()];
  const day = date.getDate();
  const mes = MESES[date.getMonth()];
  const hora = date.toTimeString().slice(0, 5);
  return `${hora} · ${diaSemana} ${day} ${mes}`;
}

function formatARS(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function TransactionList({ ingresos, egresos, loading }: Props) {
  const transactions: Transaction[] = [
    ...ingresos.map((ing) => ({
      type: "ingreso" as const,
      data: ing,
      sortKey: `${ing.fecha}T${ing.hora}`,
    })),
    ...egresos.map((eg) => ({
      type: "egreso" as const,
      data: eg,
      sortKey: eg.createdAt,
    })),
  ].sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  return (
    <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 flex flex-col gap-4">
      <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280]">
        Movimientos
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-[#F4F5F7] rounded animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">Sin movimientos registrados.</p>
      ) : (
        <ul className="space-y-1">
          {transactions.map((tx, idx) => {
            if (tx.type === "ingreso") {
              const ing = tx.data;
              return (
                <li
                  key={`ing-${idx}`}
                  className="flex items-center justify-between py-1.5 border-b border-[#E0E0DB] last:border-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-[#2A2829]">
                      {formatFechaIngreso(ing.fecha, ing.hora)}
                    </span>
                    <span className="font-small text-[11px] text-[#6b7280] truncate">
                      {ing.clienteNombre.toLowerCase()}
                    </span>
                  </div>
                  <span className="font-small text-sm text-[#22c55e] font-medium ml-2 shrink-0">
                    +{formatARS(ing.monto)}
                  </span>
                </li>
              );
            } else {
              const eg = tx.data;
              return (
                <li
                  key={`eg-${eg.id}`}
                  className="flex items-center justify-between py-1.5 border-b border-[#E0E0DB] last:border-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-[#2A2829] truncate">
                      {eg.descripcion}
                    </span>
                    <span className="font-small text-[11px] text-[#6b7280]">
                      {formatFechaEgreso(eg.createdAt)}
                    </span>
                  </div>
                  <span className="font-small text-sm text-[#ef4444] font-medium ml-2 shrink-0">
                    −{formatARS(eg.monto)}
                  </span>
                </li>
              );
            }
          })}
        </ul>
      )}
    </div>
  );
}
