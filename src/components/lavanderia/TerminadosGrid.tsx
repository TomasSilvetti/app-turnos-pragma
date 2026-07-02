"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PackageCheck, Check, Clock, User, AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuscadorOT } from "./BuscadorOT";
import { WhatsappIcon } from "./WhatsappIcon";
import { linkWhatsappPrendasListas } from "@/lib/lavanderia/telefono";
import { lavFetch } from "@/lib/lavanderia/client";
import { useResaltarOT } from "@/hooks/useResaltarOT";
import { formatoDuracion } from "@/lib/lavanderia/timeline";
import { cn } from "@/lib/utils";
import type { DiaSnap } from "@/lib/lavanderia/tablero";
import type { TerminadoSnap } from "@/lib/lavanderia/terminados";

// Card de una OT terminada pendiente de entrega, con acción de entregar.
function CardTerminado({
  ot,
  resaltada,
  onEntregar,
  onVolver,
}: {
  ot: TerminadoSnap;
  resaltada: boolean;
  onEntregar: (ot: TerminadoSnap) => Promise<void>;
  onVolver: (ot: TerminadoSnap) => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [volviendo, setVolviendo] = useState(false);

  const volver = async () => {
    setVolviendo(true);
    try {
      await onVolver(ot);
    } finally {
      setVolviendo(false);
    }
  };

  const titulo = ot.numero ? `OT ${ot.numero}` : ot.nombreCliente || "OT";
  const waLink = linkWhatsappPrendasListas(ot.telefono);
  const esCombinada = ot.partesCompletadas != null;
  const parteBadge = esCombinada
    ? `completa · ${ot.partesCompletadas} partes`
    : ot.parteTotal
      ? `${ot.parteIndice}/${ot.parteTotal}`
      : null;

  const entregar = async () => {
    setProcesando(true);
    try {
      await onEntregar(ot);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <article
      id={`ot-card-${ot.id}`}
      className={cn(
        "flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3 shadow-[0_2px_10px_-4px_rgba(16,24,40,0.18)] dark:border-emerald-500/40 dark:bg-emerald-500/5",
        resaltada && "ot-resaltada-flash"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {titulo}
            {parteBadge && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {parteBadge}
              </span>
            )}
          </p>
          {ot.nombreCliente && ot.numero && (
            <p className="truncate text-xs text-muted-foreground">{ot.nombreCliente}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          <Clock className="size-3" />
          {formatoDuracion(ot.duracionMin)}
        </span>
      </div>

      {ot.items.length > 0 && (
        <div className="rounded-xl bg-white/60 px-2 py-1.5 text-xs dark:bg-white/5">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1">
            {ot.items.map((it, i) => (
              <Fragment key={i}>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground/90" title={it.descripcion}>
                    {it.descripcion}
                  </span>
                  {it.procesos.length > 0 && (
                    <span className="block truncate text-[10px] text-muted-foreground" title={it.procesos.join(", ")}>
                      {it.procesos.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">×{it.cantidad}</span>
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
        <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
          {ot.empleadoTrabajo && (
            <>
              <User className="size-3 shrink-0" /> {ot.empleadoTrabajo}
            </>
          )}
          {ot.dia && (
            <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 font-medium capitalize text-slate-500">
              {ot.dia} {ot.fechaCorta}
            </span>
          )}
        </span>

        {confirmando ? (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <Button
              size="xs"
              onClick={entregar}
              disabled={procesando}
              className="rounded-full border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
            >
              {procesando ? <Loader2 className="animate-spin" /> : <Check />} Confirmar
            </Button>
            <Button size="xs" variant="outline" onClick={() => setConfirmando(false)} disabled={procesando} className="rounded-full">
              No
            </Button>
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" title="Reenviar aviso por WhatsApp">
                <Button
                  size="xs"
                  variant="ghost"
                  className="rounded-full text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#1ebe5b]"
                >
                  <WhatsappIcon className="size-4" />
                </Button>
              </a>
            )}
            <Button
              size="xs"
              variant="ghost"
              onClick={volver}
              disabled={volviendo}
              title="Se marcó terminada por error: volver al tablero"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              {volviendo ? <Loader2 className="animate-spin" /> : <RotateCcw />} Al tablero
            </Button>
            <Button
              size="xs"
              onClick={() => setConfirmando(true)}
              className="rounded-full border-0 bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_4px_12px_-3px_rgba(56,120,255,0.6)] hover:from-sky-600 hover:to-indigo-600"
            >
              <PackageCheck /> Entregar
            </Button>
          </span>
        )}
      </div>
    </article>
  );
}

export function TerminadosGrid() {
  const [ots, setOts] = useState<TerminadoSnap[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resaltadaId, resaltar } = useResaltarOT();

  const cargar = useCallback(async () => {
    try {
      const r = await lavFetch("/api/lavanderia/terminados");
      if (!r.ok) {
        setError("No se pudieron cargar las OTs terminadas");
        return;
      }
      const d: { ots: TerminadoSnap[] } = await r.json();
      setOts(d.ots ?? []);
      setError(null);
    } catch {
      setError("Error de red al cargar terminados");
    }
  }, []);

  useEffect(() => {
    // Carga inicial: el setState ocurre dentro del fetch async, no sincrónicamente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  // Agrupamos por fecha (día en que se terminó) para reutilizar el buscador del
  // tablero, que espera un DiaSnap[].
  const diasBuscador = useMemo<DiaSnap[]>(() => {
    if (!ots) return [];
    const porFecha = new Map<string, TerminadoSnap[]>();
    for (const ot of ots) {
      const arr = porFecha.get(ot.fecha) ?? [];
      arr.push(ot);
      porFecha.set(ot.fecha, arr);
    }
    return [...porFecha.entries()].map(([fecha, lista]) => ({
      fecha,
      esHoy: false,
      dia: lista[0]?.dia ?? "",
      fechaCorta: lista[0]?.fechaCorta ?? "",
      turnos: [],
      capacidadMin: 0,
      ocupacionMin: 0,
      ahoraMin: null,
      extra: null,
      ots: lista,
    }));
  }, [ots]);

  const entregar = async (ot: TerminadoSnap) => {
    // Optimista: se quita de la grilla al instante.
    setOts((prev) => prev?.filter((o) => o.id !== ot.id) ?? prev);
    try {
      const r = await lavFetch("/api/lavanderia/terminados", {
        method: "PATCH",
        body: JSON.stringify({ id: ot.id }),
      });
      if (!r.ok) await cargar(); // revierte trayendo el estado real
    } catch {
      await cargar();
    }
  };

  // Deshace un "terminar" hecho por error: la OT vuelve al tablero (en progreso).
  const volver = async (ot: TerminadoSnap) => {
    setOts((prev) => prev?.filter((o) => o.id !== ot.id) ?? prev);
    try {
      const r = await lavFetch("/api/lavanderia/terminados", {
        method: "PATCH",
        body: JSON.stringify({ id: ot.id, accion: "volver" }),
      });
      if (!r.ok) await cargar();
    } catch {
      await cargar();
    }
  };

  if (!ots && !error) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Terminados</h1>
          <p className="text-sm text-slate-500">
            OTs terminadas pendientes de entrega. Buscá y marcá cada una como entregada al retirarla el cliente.
          </p>
        </div>
        <BuscadorOT dias={diasBuscador} onSeleccionar={(ot) => resaltar(ot.id, (ot as TerminadoSnap).fecha)} />
      </div>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {ots && ots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-20 text-center text-muted-foreground">
          <Inbox className="size-8" />
          <p className="text-sm">No hay OTs terminadas pendientes de entrega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ots?.map((ot) => (
            <CardTerminado key={ot.id} ot={ot} resaltada={ot.id === resaltadaId} onEntregar={entregar} onVolver={volver} />
          ))}
        </div>
      )}
    </div>
  );
}
