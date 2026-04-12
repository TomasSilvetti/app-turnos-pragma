"use client";

type Props = {
  totalIngresos: number;
  totalEgresos: number;
  balanceNeto: number;
  loading: boolean;
};

function formatARS(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 animate-pulse">
      <div className="h-3 w-24 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-3" />
      <div className="h-7 w-32 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
    </div>
  );
}

export function FinancialSummaryCards({ totalIngresos, totalEgresos, balanceNeto, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const balancePositivo = balanceNeto > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Ingresos */}
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
        <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8] mb-1">
          Ingresos
        </p>
        <p className="font-heading text-2xl text-[#22c55e]">
          {formatARS(totalIngresos)}
        </p>
      </div>

      {/* Egresos */}
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
        <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8] mb-1">
          Egresos
        </p>
        <p className="font-heading text-2xl text-[#ef4444]">
          {formatARS(totalEgresos)}
        </p>
      </div>

      {/* Balance neto */}
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
        <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8] mb-1">
          Balance neto
        </p>
        <p
          className={`font-heading text-2xl ${
            balancePositivo ? "text-[#253551]" : "text-[#ef4444]"
          }`}
        >
          {formatARS(balanceNeto)}
        </p>
      </div>
    </div>
  );
}
