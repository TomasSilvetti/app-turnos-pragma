"use client";

import { ClienteCard, ClienteResumen } from "./ClienteCard";

type Props = {
  clientes: ClienteResumen[];
  loading: boolean;
};

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 animate-pulse flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[#E0E0DB] dark:bg-[#2d3548] shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-32 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-2" />
        <div className="h-3 w-20 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
      </div>
    </div>
  );
}

export function ClienteListado({ clientes, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-10 text-center">
        <span className="material-symbols-outlined text-[#6b7280] dark:text-[#94a3b8] mb-3 block" style={{ fontSize: "32px" }} translate="no">
          group
        </span>
        <p className="text-sm text-[#6b7280] dark:text-[#94a3b8]">
          Todavía no hay clientes registrados con turnos.
        </p>
        <p className="text-xs text-[#94a3b8] dark:text-[#64748b] mt-1">
          Cuando un cliente reserve un turno con cuenta, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {clientes.map((cliente) => (
        <ClienteCard key={cliente.id} cliente={cliente} />
      ))}
    </div>
  );
}
