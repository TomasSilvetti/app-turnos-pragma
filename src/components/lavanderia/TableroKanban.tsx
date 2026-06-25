"use client";

import { Loader2, WifiOff } from "lucide-react";
import { useTableroStream } from "@/hooks/useTableroStream";
import { ColumnaDia } from "./ColumnaDia";

export function TableroKanban({ empleadoId }: { empleadoId: string }) {
  const { snapshot, conectado } = useTableroStream(empleadoId);

  if (!snapshot) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // La columna "ancha" es la de hoy; si hoy no es laborable, la primera.
  const idxHoy = snapshot.dias.findIndex((d) => d.esHoy);
  const anchaIdx = idxHoy >= 0 ? idxHoy : 0;

  return (
    <div className="px-3 py-5 sm:px-5">
      <div className="mb-4">
        {conectado ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            En vivo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm backdrop-blur">
            <WifiOff className="size-3.5" /> Reconectando…
          </span>
        )}
      </div>
      <div className="flex w-full items-stretch gap-2 pb-4">
        {snapshot.dias.map((dia, i) => (
          <ColumnaDia key={dia.fecha} dia={dia} ancha={anchaIdx === i} />
        ))}
      </div>
    </div>
  );
}
