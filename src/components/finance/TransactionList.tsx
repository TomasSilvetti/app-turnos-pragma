"use client";

import { useState } from "react";
import type { Ingreso, Egreso } from "@/app/dashboard/finanzas/page";

type Props = {
  ingresos: Ingreso[];
  egresos: Egreso[];
  loading: boolean;
  onEgresoDeleted: (id: string, monto: number) => void;
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

export function TransactionList({ ingresos, egresos, loading, onEgresoDeleted }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, monto: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finanzas/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        onEgresoDeleted(id, monto);
      }
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }
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
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex flex-col gap-4">
      <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8]">
        Movimientos
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-[#F4F5F7] dark:bg-[#2d3548] rounded animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-[#9ca3af] dark:text-slate-500">Sin movimientos registrados.</p>
      ) : (
        <ul className="space-y-1">
          {transactions.map((tx, idx) => {
            if (tx.type === "ingreso") {
              const ing = tx.data;
              return (
                <li
                  key={`ing-${idx}`}
                  className="flex items-center justify-between py-1.5 border-b border-[#E0E0DB] dark:border-[#2d3548] last:border-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-[#2A2829] dark:text-[#e2e8f0]">
                      {formatFechaIngreso(ing.fecha, ing.hora)}
                    </span>
                    <span className="font-small text-[11px] text-[#6b7280] dark:text-[#94a3b8] truncate">
                      {ing.clienteNombre.toLowerCase()}
                    </span>
                    <span className="font-small text-[11px] text-[#9ca3af] dark:text-slate-500 truncate">
                      atendido por {ing.empleadoNombre.toLowerCase()}
                    </span>
                  </div>
                  <span className="font-small text-sm text-[#22c55e] font-medium ml-2 shrink-0">
                    +{formatARS(ing.monto)}
                  </span>
                </li>
              );
            } else {
              const eg = tx.data;
              const isConfirming = confirmingId === eg.id;
              const isDeleting = deletingId === eg.id;
              return (
                <li
                  key={`eg-${eg.id}`}
                  className="flex items-center justify-between py-1.5 border-b border-[#E0E0DB] dark:border-[#2d3548] last:border-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-[#2A2829] dark:text-[#e2e8f0] truncate">
                      {eg.descripcion}
                    </span>
                    <span className="font-small text-[11px] text-[#6b7280] dark:text-[#94a3b8]">
                      {formatFechaEgreso(eg.createdAt)}
                    </span>
                    <span className="font-small text-[11px] text-[#9ca3af] dark:text-slate-500 truncate">
                      cargado por {eg.adminNombre?.toLowerCase() ?? "desconocido"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="font-small text-sm text-[#ef4444] font-medium">
                      −{formatARS(eg.monto)}
                    </span>
                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(eg.id, eg.monto)}
                          disabled={isDeleting}
                          className="text-[11px] px-2 py-0.5 rounded bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-50 transition-colors"
                        >
                          {isDeleting ? "..." : "Sí"}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          disabled={isDeleting}
                          className="text-[11px] px-2 py-0.5 rounded bg-[#E0E0DB] dark:bg-[#2d3548] text-[#6b7280] dark:text-[#94a3b8] hover:bg-[#d1d5db] dark:hover:bg-[#374151] disabled:opacity-50 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(eg.id)}
                        className="text-[#9ca3af] hover:text-[#ef4444] transition-colors"
                        title="Eliminar egreso"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            }
          })}
        </ul>
      )}
    </div>
  );
}
