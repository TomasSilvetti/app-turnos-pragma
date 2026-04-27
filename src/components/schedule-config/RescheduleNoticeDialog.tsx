"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onClose: () => void;
};

export function RescheduleNoticeDialog({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-notice-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-5 shadow-lg">
        <div className="mb-4 flex items-start gap-3">
          <CheckCircle
            size={20}
            className="mt-0.5 shrink-0 text-green-500"
            aria-hidden="true"
          />
          <div>
            <h2
              id="reschedule-notice-title"
              className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]"
            >
              Cambios guardados
            </h2>
            <p className="mt-2 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
              Los clientes con turnos conflictivos fueron guardados en el módulo de{" "}
              <span className="font-medium text-[var(--brand-color)] dark:text-[#93c5fd]">
                Reprogramaciones
              </span>
              . Visitá esa sección para coordinar sus nuevos horarios.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onClose}
          className="w-full bg-[var(--brand-color)] text-white hover:bg-[#1c2a40]"
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
