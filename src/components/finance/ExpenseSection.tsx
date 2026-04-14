"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NumericInput } from "@/components/ui/NumericInput";
import type { Egreso } from "@/app/dashboard/finanzas/page";

type Props = {
  onExpenseAdded: (egreso: Egreso) => void;
};

export function ExpenseSection({ onExpenseAdded }: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = descripcion.trim().length > 0 && monto != null && monto > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/finanzas/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: descripcion.trim(), monto }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Error al registrar el egreso");
        return;
      }

      onExpenseAdded(json.expense as Egreso);
      setDescripcion("");
      setMonto(undefined);
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex flex-col gap-4">
      {/* Formulario */}
      <div>
        <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8] mb-3">
          Agregar egreso
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div>
            <label htmlFor="descripcion" className="text-xs text-[#2A2829] dark:text-[#e2e8f0] mb-1 block">
              Descripción
            </label>
            <input
              id="descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Compra de insumos"
              className="w-full rounded-md border border-[#E0E0DB] dark:border-[#2d3548] bg-[#F4F5F7] dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-[#9ca3af] dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/30"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="monto" className="text-xs text-[#2A2829] dark:text-[#e2e8f0] mb-1 block">
              Monto ($)
            </label>
            <NumericInput
              id="monto"
              value={monto}
              onChange={setMonto}
              placeholder="0"
              disabled={submitting}
              className="w-full bg-[#F4F5F7] dark:bg-[#0f172a]"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            aria-label="Agregar egreso"
            className="mt-1 flex items-center justify-center gap-1.5 rounded-md bg-[#ef4444] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">add</span>
            {submitting ? "Guardando..." : "Agregar"}
          </button>
        </form>
      </div>

    </div>
  );
}
