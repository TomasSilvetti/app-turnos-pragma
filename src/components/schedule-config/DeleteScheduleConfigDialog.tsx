"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReservadoItem = {
  clientName: string;
  clientPhone: string;
  status: "pending" | "confirmed";
};

type CheckResult = {
  disponibles: number;
  reservados: ReservadoItem[];
};

type Props = {
  configId: string;
  configName: string;
  onConfirmKeep: () => void;
  onConfirmReschedule: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
};

export function DeleteScheduleConfigDialog({
  configId,
  configName,
  onConfirmKeep,
  onConfirmReschedule,
  onCancel,
  isDeleting,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [check, setCheck] = useState<CheckResult | null>(null);

  useEffect(() => {
    fetch(`/api/schedule-configs/${configId}/appointments-check`)
      .then((r) => {
        if (!r.ok) throw new Error("Error al verificar turnos");
        return r.json();
      })
      .then((data: CheckResult) => setCheck(data))
      .catch(() => setCheck({ disponibles: 0, reservados: [] }))
      .finally(() => setLoading(false));
  }, [configId]);

  const hasReservados = (check?.reservados?.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-config-dialog-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-5 shadow-lg">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--brand-color)]" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle
                size={20}
                className={`mt-0.5 shrink-0 ${hasReservados ? "text-amber-500" : "text-red-500"}`}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <h2
                  id="delete-config-dialog-title"
                  className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]"
                >
                  {hasReservados ? "Hay turnos reservados" : "¿Estás seguro?"}
                </h2>
                <p className="mt-1 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
                  Configuración:{" "}
                  <span className="font-medium text-[var(--brand-color)]">{configName}</span>
                </p>

                {!hasReservados && (
                  <p className="mt-2 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
                    {check && check.disponibles > 0
                      ? `Se eliminarán ${check.disponibles} turno${check.disponibles !== 1 ? "s" : ""} disponible${check.disponibles !== 1 ? "s" : ""} sin reserva.`
                      : "Esta acción no se puede deshacer."}
                  </p>
                )}

                {hasReservados && (
                  <>
                    <p className="mt-2 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
                      Los siguientes clientes tienen turnos reservados en esta configuración:
                    </p>

                    <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {check!.reservados.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/30 px-3 py-2"
                        >
                          <Users size={13} className="shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] truncate">{r.clientName}</p>
                            <p className="text-xs text-[#2A2829]/60 dark:text-[#94a3b8]">{r.clientPhone}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/30 rounded-md px-3 py-2">
                      ¿Qué querés hacer con estos turnos?
                    </p>
                  </>
                )}
              </div>
            </div>

            {hasReservados ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={onConfirmKeep}
                  disabled={isDeleting}
                  className="w-full bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-40"
                >
                  {isDeleting ? "Eliminando..." : "Mantener turno por esta vez"}
                </Button>
                <Button
                  type="button"
                  onClick={onConfirmReschedule}
                  disabled={isDeleting}
                  className="w-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
                >
                  Reprogramar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onCancel}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
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
                  onClick={onConfirmReschedule}
                  disabled={isDeleting}
                  className="flex-1 text-white bg-red-500 hover:bg-red-600 disabled:opacity-40"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
