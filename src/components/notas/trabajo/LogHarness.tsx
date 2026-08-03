"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Wrench, OctagonAlert, Flag, ListPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hhmm, type LogTrabajo, type TipoLog } from "@/lib/notas/trabajoClient";

// El log es sólo lectura: lo escribe el puente del harness. Cada hito y cada
// problema traen su captura, que es lo que permite auditar de un vistazo qué
// hizo la sesión sin abrir el proyecto.

const ESTILOS: Record<TipoLog, { icono: typeof CheckCircle2; color: string; nombre: string }> = {
  hito: { icono: CheckCircle2, color: "text-emerald-500", nombre: "Hito" },
  problema: { icono: AlertTriangle, color: "text-amber-500", nombre: "Problema" },
  solucion: { icono: Wrench, color: "text-sky-500", nombre: "Solución" },
  bloqueo: { icono: OctagonAlert, color: "text-destructive", nombre: "Bloqueo" },
  handoff: { icono: Flag, color: "text-muted-foreground", nombre: "Handoff" },
};

export function LogHarness({
  logs,
  onCrearItem,
}: {
  logs: LogTrabajo[];
  onCrearItem: (entrada: LogTrabajo) => void;
}) {
  const [ampliada, setAmpliada] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">
        Todavía no hay registro. Aparece acá en cuanto el harness tome la tarea.
      </p>
    );
  }

  return (
    <>
      <ol className="space-y-3">
        {logs.map((l) => {
          const { icono: Icono, color, nombre } = ESTILOS[l.tipo] ?? ESTILOS.hito;
          return (
            <li
              key={l.id}
              className={cn(
                "rounded-lg border p-3",
                l.requiereIntervencion ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-background"
              )}
            >
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Icono className={cn("size-4 shrink-0", color)} />
                <span className="font-medium text-foreground">{nombre}</span>
                {l.paso != null && <span className="tabular-nums">· paso {l.paso}</span>}
                <span className="ml-auto tabular-nums">{hhmm(l.createdAt)}</span>
                {l.cuenta && <span>· cuenta {l.cuenta}</span>}
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed">{l.texto}</p>

              {l.imagenes && l.imagenes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.imagenes.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setAmpliada(img.url)}
                      className="overflow-hidden rounded-md border border-border transition-colors hover:border-primary/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" loading="lazy" className="h-24 w-auto max-w-[12rem] object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {l.requiereIntervencion && (
                <button
                  type="button"
                  onClick={() => onCrearItem(l)}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 px-2.5 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <ListPlus className="size-3.5" />
                  Crear ítem de trabajo con esto
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {ampliada && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAmpliada(null)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
