"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onActivate: () => void;
  onClose: () => void;
};

export default function NotificacionesWaitlistModal({ isOpen, onActivate, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") trapFocus(e);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function trapFocus(e: KeyboardEvent) {
    if (!dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-modal-title"
        aria-describedby="notif-modal-desc"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-xl bg-white border border-[#E0E0DB] p-6 shadow-lg focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#2A2829]/40 hover:text-[#2A2829] transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col gap-4">
          <div>
            <h2
              id="notif-modal-title"
              className="font-heading text-base text-[#2A2829] mb-2"
            >
              Activá las notificaciones
            </h2>
            <p
              id="notif-modal-desc"
              className="font-body text-sm text-[#2A2829]/70 leading-relaxed"
            >
              Sin notificaciones activadas no te avisaremos cuando se libere un turno, por lo que no tiene sentido estar en la lista de espera.
            </p>
          </div>

          <button
            type="button"
            onClick={onActivate}
            className="w-full rounded-lg bg-[var(--brand-color)] px-4 py-2.5 font-body text-sm font-medium text-white hover:bg-[var(--brand-color-dark,#1c2a40)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-2"
          >
            Activar notificaciones
          </button>
        </div>
      </div>
    </div>
  );
}
