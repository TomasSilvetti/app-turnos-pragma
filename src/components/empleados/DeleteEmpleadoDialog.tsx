"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Empleado } from "./types";

type DeleteEmpleadoDialogProps = {
  empleado: Empleado;
  error?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteEmpleadoDialog({
  empleado,
  error,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteEmpleadoDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-empleado-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-5 shadow-lg">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
          <div>
            <h2 id="delete-empleado-title" className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
              ¿Estás seguro?
            </h2>
            <p className="mt-1 text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Empleado: <span className="text-[var(--brand-color)]">{empleado.nombre}</span>
            </p>
            <p className="mt-1 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
              Su cuenta quedará desactivada y no podrá iniciar sesión.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
          >
            {isDeleting ? "Desactivando..." : "Confirmar eliminación"}
          </Button>
        </div>
      </div>
    </div>
  );
}
