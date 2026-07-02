"use client";

import { cn } from "@/lib/utils";
import { formatoDuracion } from "@/lib/lavanderia/timeline";
import type { DiaSnap } from "@/lib/lavanderia/tablero";

// Nivel de ocupación de un día como clases de color: la card y la barra cambian
// de tono según qué tan lleno está (vacío → lleno). Se usa tanto para la card
// comprimida como para su barra.
export function nivelOcupacion(dia: DiaSnap): { pct: number; card: string; barra: string } {
  const cap = dia.capacidadMin;
  const ocup = dia.ocupacionMin;
  const pct = cap > 0 ? Math.min(100, Math.round((ocup / cap) * 100)) : 0;

  if (cap === 0) return { pct, card: "border-white/60 bg-white/40", barra: "bg-slate-300" };
  if (pct >= 100)
    return { pct, card: "border-rose-300/70 bg-rose-50/70", barra: "bg-gradient-to-t from-rose-500 to-red-400" };
  if (pct >= 85)
    return { pct, card: "border-amber-300/70 bg-amber-50/70", barra: "bg-gradient-to-t from-amber-500 to-orange-400" };
  if (pct >= 50)
    return { pct, card: "border-sky-200/70 bg-sky-50/70", barra: "bg-gradient-to-t from-sky-500 to-indigo-400" };
  if (pct > 0)
    return { pct, card: "border-emerald-200/70 bg-emerald-50/70", barra: "bg-gradient-to-t from-emerald-500 to-teal-400" };
  return { pct, card: "border-slate-200/70 bg-white/50", barra: "bg-slate-300" };
}

// Contenido de una columna en la vista comprimida (14 días): solo el % de
// ocupación del día como barra vertical, para ver de un vistazo la profundidad
// de la cola.
export function BarraDiaMini({ dia }: { dia: DiaSnap }) {
  const cap = dia.capacidadMin;
  const ocup = dia.ocupacionMin;
  const { pct, barra } = nivelOcupacion(dia);

  return (
    <div className="flex flex-1 flex-col items-center overflow-hidden p-2">
      <p className="truncate text-center text-[11px] font-semibold capitalize leading-tight text-slate-700">
        {dia.dia}
      </p>
      <p className="text-[10px] leading-tight text-slate-400">{dia.fechaCorta}</p>

      <div className="relative mx-auto mt-2 flex w-5 flex-1 items-end overflow-hidden rounded-full bg-slate-200/70 shadow-inner">
        <div className={cn("w-full rounded-full transition-[height] duration-500", barra)} style={{ height: `${pct}%` }} />
      </div>

      <p className="mt-1.5 text-center text-[11px] font-bold tabular-nums text-slate-600">
        {cap > 0 ? `${pct}%` : "—"}
      </p>
      <p className="truncate text-center text-[9px] text-slate-400">
        {cap > 0 ? formatoDuracion(ocup) : "Sin turnos"}
      </p>
    </div>
  );
}
