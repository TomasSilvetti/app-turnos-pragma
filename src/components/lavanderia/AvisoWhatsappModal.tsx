"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsappIcon } from "./WhatsappIcon";
import { MENSAJE_PRENDAS_LISTAS, linkWhatsappPrendasListas } from "@/lib/lavanderia/telefono";
import type { OTSnap } from "@/lib/lavanderia/tablero";

// Aviso que se muestra al terminar una OT: ofrece avisarle al cliente por
// WhatsApp que su pedido está listo para retirar. El número se normaliza para
// que el link de wa.me funcione; si no hay un teléfono válido, se avisa.
export function AvisoWhatsappModal({ ot, onCerrar }: { ot: OTSnap; onCerrar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  const mensaje = MENSAJE_PRENDAS_LISTAS;
  const link = linkWhatsappPrendasListas(ot.telefono);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="inline-flex items-center gap-2 font-semibold">
            <Check className="size-5 text-emerald-500" /> OT terminada
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Avisale al cliente que su pedido está listo para retirar.
          </p>

          {link ? (
            <>
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-foreground/80">
                {mensaje}
              </div>
              {/* target con nombre fijo (sin rel=noopener, que fuerza contexto
                  nuevo en algunos navegadores) para reutilizar la misma pestaña. */}
              <a href={link} target="whatsapp" className="block" onClick={onCerrar}>
                <Button className="w-full border-0 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                  <WhatsappIcon className="size-4" /> Enviar por WhatsApp
                </Button>
              </a>
            </>
          ) : (
            <p className="inline-flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <PhoneOff className="size-4 shrink-0" />
              Esta OT no tiene un teléfono válido cargado para enviar el aviso.
            </p>
          )}

          <Button variant="outline" onClick={onCerrar} className="w-full">
            Listo
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
