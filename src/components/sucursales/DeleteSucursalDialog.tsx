"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Sucursal } from "./types";

type DeleteSucursalDialogProps = {
  sucursal: Sucursal;
  error?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteSucursalDialog({
  sucursal,
  error,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteSucursalDialogProps) {
  const hasEmployees = sucursal.employeeCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-sucursal-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-5 shadow-lg">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
          <div>
            <h2 id="delete-sucursal-title" className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
              ¿Estás seguro?
            </h2>
            <p className="mt-1 text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Sucursal: <span className="text-[var(--brand-color)]">{sucursal.name}</span>
            </p>

            {hasEmployees ? (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Esta sucursal tiene{" "}
                  <strong>{sucursal.employeeCount}</strong>{" "}
                  {sucursal.employeeCount === 1 ? "empleado asignado" : "empleados asignados"}.
                  Al eliminarla, {sucursal.employeeCount === 1 ? "quedará" : "quedarán"} sin sucursal asignada.
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
                Esta acción no se puede deshacer.
              </p>
            )}
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
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
