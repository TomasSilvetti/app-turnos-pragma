"use client";

import { useState } from "react";
import { Play, Check, Loader2, AlertTriangle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import { altoOT, formatoDuracion } from "@/lib/lavanderia/timeline";
import type { OTSnap } from "@/lib/lavanderia/tablero";

export function ItemOT({
  ot,
  soloLectura = false,
  dragHandle,
}: {
  ot: OTSnap;
  // En el tablero del admin las tarjetas se arrastran y no se inician/terminan.
  soloLectura?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const [procesando, setProcesando] = useState(false);

  const accion = async (accion: "empezar" | "terminar") => {
    setProcesando(true);
    try {
      await lavFetch(`/api/lavanderia/ots/${ot.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion }),
      });
      // El SSE refresca el tablero; no actualizamos estado local.
    } finally {
      setProcesando(false);
    }
  };

  const titulo = ot.numero ? `OT ${ot.numero}` : ot.nombreCliente || "OT";

  return (
    <article
      style={{ minHeight: altoOT(ot.duracionMin) }}
      className={cn(
        "flex flex-col gap-1.5 overflow-hidden rounded-2xl border p-2.5 text-left shadow-[0_2px_10px_-4px_rgba(16,24,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(16,24,40,0.28)]",
        ot.estado === "terminado" && "border-emerald-200/70 bg-emerald-50/60 opacity-80 dark:border-emerald-500/40 dark:bg-emerald-500/5",
        ot.estado === "en_progreso" &&
          "border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/60 dark:bg-amber-500/10",
        ot.estado === "pendiente" && "border-white/70 bg-white/80 backdrop-blur"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          {dragHandle}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{titulo}</p>
            {ot.nombreCliente && ot.numero && (
              <p className="truncate text-xs text-muted-foreground">{ot.nombreCliente}</p>
            )}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          <Clock className="size-3" />
          {formatoDuracion(ot.duracionMin)}
        </span>
      </div>

      {ot.items.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {ot.items.map((it, i) => (
            <li key={i} className="truncate">
              {it.cantidad > 1 ? `${it.cantidad}× ` : ""}
              {it.descripcion}
            </li>
          ))}
        </ul>
      )}

      {ot.aRevisar && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3" /> A revisar
        </span>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {ot.empleadoTrabajo ? (
          <span className="inline-flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <User className="size-3" /> {ot.empleadoTrabajo}
          </span>
        ) : (
          <span />
        )}

        {ot.estado === "pendiente" && ot.puedeEmpezar && !soloLectura && (
          <Button
            size="xs"
            onClick={() => accion("empezar")}
            disabled={procesando}
            className="rounded-full border-0 bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_4px_12px_-3px_rgba(56,120,255,0.6)] hover:from-sky-600 hover:to-indigo-600"
          >
            {procesando ? <Loader2 className="animate-spin" /> : <Play />} Empezar
          </Button>
        )}
        {ot.estado === "en_progreso" && !soloLectura && (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => accion("terminar")}
            disabled={procesando}
            className="rounded-full border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_4px_12px_-3px_rgba(16,185,129,0.55)] hover:from-emerald-600 hover:to-teal-600"
          >
            {procesando ? <Loader2 className="animate-spin" /> : <Check />} Terminar
          </Button>
        )}
        {ot.estado === "en_progreso" && soloLectura && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Clock className="size-3" /> En progreso
          </span>
        )}
        {ot.estado === "terminado" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-3" /> Listo
          </span>
        )}
      </div>
    </article>
  );
}
