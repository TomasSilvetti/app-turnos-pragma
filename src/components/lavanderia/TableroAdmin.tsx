"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, GripVertical, Clock, AlertTriangle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { distribuirEnTurnos, formatoDuracion, nombreTurno } from "@/lib/lavanderia/timeline";
import type { DiaSnap, OTSnap, TableroSnapshot } from "@/lib/lavanderia/tablero";

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "border-border bg-card",
  en_progreso: "border-amber-400 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-500/10",
  terminado: "border-border bg-muted/40 opacity-70",
};

function TarjetaArrastrable({ ot }: { ot: OTSnap }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ot.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-lg border p-2 text-sm shadow-sm", ESTADO_COLOR[ot.estado], isDragging && "opacity-50")}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {ot.numero ? `OT ${ot.numero}` : ot.nombreCliente || "OT"}
          {ot.aRevisar && <AlertTriangle className="ml-1 inline size-3 text-amber-500" />}
        </p>
        {ot.nombreCliente && ot.numero && <p className="truncate text-xs text-muted-foreground">{ot.nombreCliente}</p>}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="size-3" />
        {formatoDuracion(ot.duracionMin)}
      </span>
    </div>
  );
}

function GapExtra({ horaInicio, horaFin, onClick }: { horaInicio: string; horaFin: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col items-center gap-0.5 rounded-lg border border-dashed border-border bg-muted/30 py-3 text-center transition-colors hover:border-primary hover:bg-primary/5"
    >
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary">
        <Sparkles className="size-3.5" /> Activar turno extra
      </span>
      <span className="text-[11px] text-muted-foreground/70">
        {horaInicio}–{horaFin}
      </span>
    </button>
  );
}

function ColumnaAdmin({
  dia,
  onActivarExtra,
  onDesactivarExtra,
}: {
  dia: DiaSnap;
  onActivarExtra: (dia: DiaSnap) => void;
  onDesactivarExtra: (fecha: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${dia.fecha}` });
  const { secciones, sinTurnos } = distribuirEnTurnos(dia);
  const cap = dia.capacidadMin;
  const ocup = dia.ots.reduce((a, o) => a + o.duracionMin, 0);
  const pct = cap > 0 ? Math.min(100, Math.round((ocup / cap) * 100)) : 0;
  const mostrarGap = dia.extra?.disponible && !dia.extra.activo;

  return (
    <section className={cn("flex w-64 shrink-0 flex-col rounded-xl border", dia.esHoy ? "border-primary ring-1 ring-primary" : "border-border")}>
      <header className="rounded-t-xl border-b border-border bg-card p-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold capitalize">
            {dia.dia} <span className="text-muted-foreground">{dia.fechaCorta}</span>
          </h2>
          {dia.esHoy && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">HOY</span>}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {cap > 0 ? `${formatoDuracion(ocup)} / ${formatoDuracion(cap)} (${pct}%)` : "Sin turnos"}
        </p>
      </header>

      <SortableContext items={dia.ots.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn("flex min-h-32 flex-1 flex-col gap-2 p-2 transition-colors", isOver && "bg-primary/5")}>
          {secciones.map((sec, i) => (
            <div key={sec.turno.tipo} className="space-y-1.5">
              <div className="flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span className={cn("inline-flex items-center gap-1", sec.turno.tipo === "extra" && "text-primary")}>
                  {sec.turno.tipo === "extra" && <Sparkles className="size-3" />}
                  {nombreTurno(sec.turno.tipo)}
                </span>
                <span className="flex items-center gap-1.5">
                  {sec.turno.horaInicio}–{sec.turno.horaFin}
                  {sec.turno.tipo === "extra" && (
                    <button onClick={() => onDesactivarExtra(dia.fecha)} className="text-muted-foreground hover:text-destructive" title="Desactivar turno extra">
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              </div>
              {sec.ots.map((ot) => (
                <TarjetaArrastrable key={ot.id} ot={ot} />
              ))}
              {sec.ots.length === 0 && <p className="px-1 py-1 text-[11px] text-muted-foreground/60">Sin trabajos</p>}

              {/* Gap clickeable entre el turno mañana y el siguiente. */}
              {mostrarGap && sec.turno.horaFin === dia.extra!.horaInicio && i < secciones.length - 1 && (
                <GapExtra horaInicio={dia.extra!.horaInicio} horaFin={dia.extra!.horaFin} onClick={() => onActivarExtra(dia)} />
              )}
            </div>
          ))}

          {sinTurnos.map((ot) => (
            <TarjetaArrastrable key={ot.id} ot={ot} />
          ))}

          {secciones.length === 0 && sinTurnos.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground/60">{cap > 0 ? "Soltá acá" : "Día sin turnos"}</p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function TableroAdmin() {
  const [dias, setDias] = useState<DiaSnap[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activa, setActiva] = useState<OTSnap | null>(null);
  const [confirmar, setConfirmar] = useState<DiaSnap | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/ots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TableroSnapshot | null) => d && setDias(d.dias))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => cargar(), [cargar]);

  const cambiarExtra = (fecha: string, habilitado: boolean) => {
    lavFetch("/api/lavanderia/turnos/extra", { method: "PUT", body: JSON.stringify({ fecha, habilitado }) })
      .then((r) => {
        if (r.ok) cargar();
      })
      .catch(() => {})
      .finally(() => setConfirmar(null));
  };

  const fechaDeOT = (id: string) => dias.find((d) => d.ots.some((o) => o.id === id))?.fecha;

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    for (const d of dias) {
      const ot = d.ots.find((o) => o.id === id);
      if (ot) setActiva(ot);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiva(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const fechaOrigen = fechaDeOT(activeId);
    if (!fechaOrigen) return;

    let fechaDestino: string;
    let indiceDestino: number;
    if (overId.startsWith("col:")) {
      fechaDestino = overId.slice(4);
      indiceDestino = dias.find((d) => d.fecha === fechaDestino)?.ots.length ?? 0;
    } else {
      fechaDestino = fechaDeOT(overId) ?? fechaOrigen;
      const destino = dias.find((d) => d.fecha === fechaDestino);
      indiceDestino = destino ? destino.ots.findIndex((o) => o.id === overId) : 0;
    }

    if (fechaOrigen === fechaDestino && overId === activeId) return;

    const copia = dias.map((d) => ({ ...d, ots: [...d.ots] }));
    const dOrigen = copia.find((d) => d.fecha === fechaOrigen)!;
    const idx = dOrigen.ots.findIndex((o) => o.id === activeId);
    const [ot] = dOrigen.ots.splice(idx, 1);
    const dDestino = copia.find((d) => d.fecha === fechaDestino)!;
    const insertAt = Math.min(indiceDestino, dDestino.ots.length);
    dDestino.ots.splice(insertAt, 0, ot);
    setDias(copia);

    const afectadas = fechaOrigen === fechaDestino ? [dDestino] : [dOrigen, dDestino];
    const movimientos = afectadas.flatMap((d) => d.ots.map((o, i) => ({ id: o.id, fechaAsignada: d.fecha, orden: i })));
    lavFetch("/api/lavanderia/ots/reordenar", { method: "PUT", body: JSON.stringify({ movimientos }) })
      .then((r) => {
        if (!r.ok) cargar();
      })
      .catch(() => cargar());
  };

  if (cargando) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Tablero</h1>
        <p className="text-sm text-muted-foreground">
          Arrastrá las OTs para reordenarlas o moverlas entre días. Tocá el espacio entre turnos para activar el turno extra.
        </p>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {dias.map((dia) => (
            <ColumnaAdmin
              key={dia.fecha}
              dia={dia}
              onActivarExtra={setConfirmar}
              onDesactivarExtra={(fecha) => cambiarExtra(fecha, false)}
            />
          ))}
        </div>
        <DragOverlay>
          {activa && (
            <div className="rounded-lg border border-primary bg-card p-2 text-sm shadow-lg">
              {activa.numero ? `OT ${activa.numero}` : activa.nombreCliente || "OT"}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmar(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h3 className="font-semibold">Activar turno extra</h3>
            </div>
            <p className="mb-5 text-sm text-muted-foreground">
              ¿Activar el turno extra ({confirmar.extra?.horaInicio}–{confirmar.extra?.horaFin}) para el{" "}
              <span className="font-medium capitalize text-foreground">
                {confirmar.dia} {confirmar.fechaCorta}
              </span>
              ? Los trabajos se reacomodarán para ocupar ese espacio.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmar(null)}>
                Cancelar
              </Button>
              <Button onClick={() => cambiarExtra(confirmar.fecha, true)}>
                <Sparkles /> Activar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
