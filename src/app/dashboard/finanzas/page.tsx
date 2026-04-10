"use client";

import { useEffect, useState, useTransition } from "react";
import { FinancialSummaryCards } from "@/components/finance/FinancialSummaryCards";
import { ExpenseSection } from "@/components/finance/ExpenseSection";
import { TransactionList } from "@/components/finance/TransactionList";

export type Ingreso = {
  hora: string;
  fecha: string;
  clienteNombre: string;
  monto: number;
};

export type Egreso = {
  id: string;
  descripcion: string;
  monto: number;
  createdAt: string;
};

export type FinancialSummary = {
  totalIngresos: number;
  totalEgresos: number;
  balanceNeto: number;
  ingresos: Ingreso[];
  egresos: Egreso[];
};

export default function FinanzasPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  async function fetchSummary() {
    try {
      const res = await fetch("/api/finanzas/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, []);

  function handleExpenseAdded(egreso: Egreso) {
    startTransition(() => {
      setSummary((prev) => {
        if (!prev) return prev;
        const nuevoTotal = prev.totalEgresos + egreso.monto;
        return {
          ...prev,
          totalEgresos: nuevoTotal,
          balanceNeto: prev.totalIngresos - nuevoTotal,
          egresos: [egreso, ...prev.egresos],
        };
      });
    });
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-[#2A2829]">Finanzas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen de ingresos, egresos y balance de tu negocio.
        </p>
      </div>

      <FinancialSummaryCards
        totalIngresos={summary?.totalIngresos ?? 0}
        totalEgresos={summary?.totalEgresos ?? 0}
        balanceNeto={summary?.balanceNeto ?? 0}
        loading={loading}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ExpenseSection onExpenseAdded={handleExpenseAdded} />
        <TransactionList
          ingresos={summary?.ingresos ?? []}
          egresos={summary?.egresos ?? []}
          loading={loading}
        />
      </div>
    </div>
  );
}
