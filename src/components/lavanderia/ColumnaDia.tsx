"use client";

import { cn } from "@/lib/utils";
import { ItemOT } from "./ItemOT";
import {
  distribuirEnTurnos,
  formatoDuracion,
  horaActualEtiqueta,
  nombreTurno,
  type SeccionTurno,
} from "@/lib/lavanderia/timeline";
import type { DiaSnap, OTSnap } from "@/lib/lavanderia/tablero";

const ESTADO_BARRA: Record<string, string> = {
  pendiente: "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
  en_progreso: "bg-gradient-to-r from-amber-400 to-orange-400",
  terminado: "bg-gradient-to-r from-emerald-400 to-teal-400",
};

function LineaAhora({ ahoraMin }: { ahoraMin: number }) {
  return (
    <div className="relative my-1 flex items-center gap-1.5" aria-label="Hora actual">
      <span className="flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
        ▶ {horaActualEtiqueta(ahoraMin)}
      </span>
      <span className="h-0.5 flex-1 bg-red-500" />
    </div>
  );
}

// Contenido detallado (tarjetas) — para la columna de hoy y al expandir.
function ContenidoCompleto({
  dia,
  secciones,
  sinTurnos,
  onAbrirOT,
}: {
  dia: DiaSnap;
  secciones: SeccionTurno[];
  sinTurnos: OTSnap[];
  onAbrirOT?: (ot: OTSnap) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {secciones.map((sec) => (
        <div key={sec.turno.tipo} className={cn(sec.pasado && "opacity-60")}>
          <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>{nombreTurno(sec.turno.tipo)}</span>
            <span>
              {sec.turno.horaInicio}–{sec.turno.horaFin}
            </span>
          </div>
          {dia.esHoy && sec.ahora !== null && sec.ots.length === 0 && <LineaAhora ahoraMin={dia.ahoraMin!} />}
          <div className="space-y-2">
            {sec.ots.map((ot, i) => (
              <div key={ot.id}>
                {dia.esHoy && sec.ahora !== null && i === Math.floor(sec.ahora * sec.ots.length) && (
                  <LineaAhora ahoraMin={dia.ahoraMin!} />
                )}
                <ItemOT ot={ot} onAbrir={onAbrirOT ? () => onAbrirOT(ot) : undefined} />
              </div>
            ))}
          </div>
          {sec.ots.length === 0 && <p className="px-1 py-2 text-[11px] text-muted-foreground/70">Sin trabajos</p>}
        </div>
      ))}
      {sinTurnos.length > 0 && (
        <div className="space-y-2">
          {sinTurnos.map((ot) => (
            <ItemOT key={ot.id} ot={ot} onAbrir={onAbrirOT ? () => onAbrirOT(ot) : undefined} />
          ))}
        </div>
      )}
      {secciones.every((s) => s.ots.length === 0) && sinTurnos.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground/70">Día libre</p>
      )}
    </div>
  );
}

// Vista comprimida: solo barras de ocupación por turno, sin texto.
function ContenidoCompacto({ secciones }: { secciones: SeccionTurno[] }) {
  return (
    <div className="flex flex-col gap-2 p-1.5">
      {secciones.map((sec) => (
        <div key={sec.turno.tipo}>
          <p className="mb-1 px-0.5 text-center text-[10px] font-medium uppercase text-muted-foreground">
            {sec.turno.horaInicio.slice(0, 2)}–{sec.turno.horaFin.slice(0, 2)}
          </p>
          <div className="space-y-1">
            {sec.ots.map((ot) => (
              <div
                key={ot.id}
                title={`${ot.numero ? `OT ${ot.numero}` : ot.nombreCliente ?? "OT"} · ${formatoDuracion(ot.duracionMin)}`}
                style={{ height: Math.max(8, Math.round(ot.duracionMin * 0.25)) }}
                className={cn("flex items-center justify-center rounded", ESTADO_BARRA[ot.estado])}
              >
                {ot.numero && ot.duracionMin >= 60 && (
                  <span className="truncate px-1 text-[9px] font-semibold text-slate-700 dark:text-slate-100">{ot.numero}</span>
                )}
              </div>
            ))}
            {sec.ots.length === 0 && <div className="h-2 rounded bg-muted/50" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColumnaDia({ dia, ancha, onAbrirOT }: { dia: DiaSnap; ancha: boolean; onAbrirOT?: (ot: OTSnap) => void }) {
  const { secciones, sinTurnos } = distribuirEnTurnos(dia);
  const cap = dia.capacidadMin;
  const ocup = dia.ocupacionMin;
  const pct = cap > 0 ? Math.min(100, Math.round((ocup / cap) * 100)) : 0;

  const Header = (
    <header className="rounded-t-[1.25rem] border-b border-white/60 bg-white/70 p-3 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-1">
        <h2 className="truncate font-semibold capitalize text-slate-800">
          {dia.dia} <span className="font-normal text-slate-400">{dia.fechaCorta}</span>
        </h2>
        {dia.esHoy && (
          <span className="shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-[0_2px_8px_-2px_rgba(56,120,255,0.6)]">
            HOY
          </span>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70 shadow-inner">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 100
              ? "bg-gradient-to-r from-rose-400 to-red-500"
              : "bg-gradient-to-r from-sky-400 to-indigo-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 truncate text-[10px] font-medium text-slate-500">
        {cap > 0 ? `${formatoDuracion(ocup)} / ${formatoDuracion(cap)}` : "Sin turnos"}
      </p>
    </header>
  );

  if (ancha) {
    return (
      <section className="flex min-w-0 flex-[3] flex-col overflow-hidden rounded-[1.25rem] border border-sky-200/70 bg-white/55 shadow-[0_8px_30px_-10px_rgba(56,120,255,0.35)] ring-1 ring-sky-300/40 backdrop-blur-sm">
        {Header}
        <ContenidoCompleto dia={dia} secciones={secciones} sinTurnos={sinTurnos} onAbrirOT={onAbrirOT} />
      </section>
    );
  }

  return (
    <section className="group/col flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/45 shadow-[0_4px_20px_-12px_rgba(16,24,40,0.25)] backdrop-blur-sm transition-all duration-300 ease-in-out hover:flex-[3] hover:bg-white/60 hover:shadow-[0_12px_36px_-12px_rgba(16,24,40,0.3)]">
      {Header}
      <div className="group-hover/col:hidden">
        <ContenidoCompacto secciones={secciones} />
      </div>
      <div className="hidden group-hover/col:block">
        <ContenidoCompleto dia={dia} secciones={secciones} sinTurnos={sinTurnos} onAbrirOT={onAbrirOT} />
      </div>
    </section>
  );
}
