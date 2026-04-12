"use client";

import { AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConflictingBooking = {
  clientName: string;
  clientPhone: string;
  status: "pending" | "confirmed";
  appointmentDate: string;
  appointmentTime: string;
};

type Props = {
  conflicting: ConflictingBooking[];
  onKeep: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  isSaving?: boolean;
};

export function EditConflictDialog({ conflicting, onKeep, onReschedule, onCancel, isSaving }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-conflict-dialog-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] p-5 shadow-lg">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h2
              id="edit-conflict-dialog-title"
              className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]"
            >
              Hay turnos reservados afectados
            </h2>
            <p className="mt-2 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
              Los siguientes clientes tienen turnos que quedarán fuera de la nueva configuración:
            </p>

            <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
              {conflicting.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/30 px-3 py-2"
                >
                  <Users size={13} className="shrink-0 text-amber-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] truncate">
                      {r.clientName}
                    </p>
                    <p className="text-xs text-[#2A2829]/60 dark:text-[#94a3b8]">
                      {r.clientPhone} · {r.appointmentDate} {r.appointmentTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/30 rounded-md px-3 py-2">
              ¿Qué querés hacer con estos turnos?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={onKeep}
            disabled={isSaving}
            className="w-full bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-40"
          >
            {isSaving ? "Guardando..." : "Mantener turno por esta vez"}
          </Button>
          <Button
            type="button"
            onClick={onReschedule}
            disabled={isSaving}
            className="w-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
          >
            Reprogramar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
