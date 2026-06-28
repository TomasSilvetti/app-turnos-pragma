"use client";

import { Fragment, useState } from "react";
import { Play, Check, Loader2, AlertTriangle, Clock, User, Flame, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import { altoOT, formatoDuracion } from "@/lib/lavanderia/timeline";
import { useTableroAcciones } from "./TableroAccionesContext";
import type { OTSnap } from "@/lib/lavanderia/tablero";

export function ItemOT({
  ot,
  soloLectura = false,
  dragHandle,
  onAbrir,
}: {
  ot: OTSnap;
  // En el tablero del admin las tarjetas se arrastran y no se inician/terminan.
  soloLectura?: boolean;
  dragHandle?: React.ReactNode;
  // Click en la tarjeta (fuera del handle y los botones) abre el detalle.
  onAbrir?: () => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const { refrescar, aplicarLocal } = useTableroAcciones();

  const accion = async (accion: "empezar" | "terminar") => {
    setProcesando(true);
    // Optimista: la tarjeta cambia de estado ya, sin esperar al PATCH ni al
    // refetch (que ademas puede leer del cache del navegador y traer datos viejos).
    const nuevoEstado = accion === "empezar" ? "en_progreso" : "terminado";
    aplicarLocal(ot.id, { estado: nuevoEstado });
    try {
      const r = await lavFetch(`/api/lavanderia/ots/${ot.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion }),
      });
      // Reconciliamos con el estado real (posicion, empleado). Si fallo, esto
      // revierte el parche optimista al traer el snapshot verdadero.
      await refrescar();
    } finally {
      setProcesando(false);
    }
  };

  const titulo = ot.numero ? `OT ${ot.numero}` : ot.nombreCliente || "OT";
  // yyyy-MM-dd → dd/MM para mostrar al usuario.
  const fechaNecesariaCorta = ot.fechaNecesaria
    ? (() => {
        const [, m, d] = ot.fechaNecesaria!.split("-");
        return `${d}/${m}`;
      })()
    : null;

  return (
    <article
      onClick={onAbrir}
      style={{ minHeight: altoOT(ot.duracionMin) }}
      className={cn(
        "flex flex-col gap-1.5 overflow-hidden rounded-2xl border p-2.5 text-left shadow-[0_2px_10px_-4px_rgba(16,24,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(16,24,40,0.28)]",
        onAbrir && "cursor-pointer",
        ot.estado === "terminado" && "border-emerald-200/70 bg-emerald-50/60 opacity-80 dark:border-emerald-500/40 dark:bg-emerald-500/5",
        ot.estado === "en_progreso" &&
          "border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/60 dark:bg-amber-500/10",
        ot.estado === "pendiente" && "border-white/70 bg-white/80 backdrop-blur",
        ot.urgente && ot.estado !== "terminado" && "ring-1 ring-red-300"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          {dragHandle && <span onClick={(e) => e.stopPropagation()}>{dragHandle}</span>}
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

      {(ot.urgente || fechaNecesariaCorta) && (
        <div className="flex flex-wrap items-center gap-1">
          {ot.urgente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <Flame className="size-3" /> Urgente
            </span>
          )}
          {fechaNecesariaCorta && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <CalendarClock className="size-3" /> Para {fechaNecesariaCorta}
            </span>
          )}
        </div>
      )}

      {ot.items.length > 0 && (
        <div className="rounded-xl bg-slate-50/70 px-2 py-1.5 text-xs dark:bg-white/5">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2.5 gap-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">Prenda</span>
            <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">Cant</span>
            <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">T/u</span>
            {ot.items.map((it, i) => (
              <Fragment key={i}>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground/90" title={it.descripcion}>
                    {it.descripcion}
                  </span>
                  {it.servicios.length > 0 && (
                    <span className="block truncate text-[10px] text-muted-foreground" title={it.servicios.join(", ")}>
                      {it.servicios.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{it.cantidad}</span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {formatoDuracion(Math.round(it.duracionMin / it.cantidad))}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
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
            onClick={(e) => {
              e.stopPropagation();
              accion("empezar");
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              accion("terminar");
            }}
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
