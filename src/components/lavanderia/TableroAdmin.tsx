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
import { Loader2, GripVertical, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ItemOT } from "@/components/lavanderia/ItemOT";
import { lavFetch } from "@/lib/lavanderia/client";
import { distribuirEnTurnos, formatoDuracion, nombreTurno, type SeccionTurno } from "@/lib/lavanderia/timeline";
import type { DiaSnap, OTSnap, TableroSnapshot } from "@/lib/lavanderia/tablero";

// Tarjeta arrastrable: reusa el mismo diseño que el tablero del empleado (ItemOT),
// agregando un handle de arrastre y ocultando las acciones de empleado.
function TarjetaArrastrable({ ot }: { ot: OTSnap }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ot.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-50")}
    >
      <ItemOT
        ot={ot}
        soloLectura
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none text-slate-400 transition-colors hover:text-slate-600 active:cursor-grabbing"
            aria-label="Arrastrar"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

function GapExtra({ horaInicio, horaFin, onClick }: { horaInicio: string; horaFin: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col items-center gap-0.5 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 py-3 text-center transition-colors hover:border-amber-400 hover:bg-amber-100/80"
    >
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:text-amber-700">
        <Sparkles className="size-3.5" /> Activar turno extra
      </span>
      <span className="text-[11px] text-amber-500/80">
        {horaInicio}–{horaFin}
      </span>
    </button>
  );
}

const ESTADO_BARRA: Record<string, string> = {
  pendiente: "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
  en_progreso: "bg-gradient-to-r from-amber-400 to-orange-400",
  terminado: "bg-gradient-to-r from-emerald-400 to-teal-400",
};

// Vista comprimida: barras de ocupacion por turno (igual que el tablero del empleado).
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

// Vista completa con tarjetas arrastrables y el gap de turno extra.
function ContenidoCompleto({
  dia,
  secciones,
  sinTurnos,
  onActivarExtra,
  onDesactivarExtra,
}: {
  dia: DiaSnap;
  secciones: SeccionTurno[];
  sinTurnos: OTSnap[];
  onActivarExtra: (dia: DiaSnap) => void;
  onDesactivarExtra: (fecha: string) => void;
}) {
  const cap = dia.capacidadMin;
  const mostrarGap = dia.extra?.disponible && !dia.extra.activo;
  return (
    <div className="flex flex-col gap-2 p-2">
      {secciones.map((sec, i) => (
        <div key={sec.turno.tipo} className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1", sec.turno.tipo === "extra" && "text-amber-600")}>
              {sec.turno.tipo === "extra" && <Sparkles className="size-3" />}
              {nombreTurno(sec.turno.tipo)}
            </span>
            <span className="flex items-center gap-1.5">
              {sec.turno.horaInicio}–{sec.turno.horaFin}
              {sec.turno.tipo === "extra" && (
                <button
                  onClick={() => onDesactivarExtra(dia.fecha)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Desactivar turno extra"
                >
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
  );
}

function ColumnaAdmin({
  dia,
  ancha,
  onActivarExtra,
  onDesactivarExtra,
}: {
  dia: DiaSnap;
  ancha: boolean;
  onActivarExtra: (dia: DiaSnap) => void;
  onDesactivarExtra: (fecha: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${dia.fecha}` });
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
            pct >= 100 ? "bg-gradient-to-r from-rose-400 to-red-500" : "bg-gradient-to-r from-sky-400 to-indigo-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 truncate text-[10px] font-medium text-slate-500">
        {cap > 0 ? `${formatoDuracion(ocup)} / ${formatoDuracion(cap)} (${pct}%)` : "Sin turnos"}
      </p>
    </header>
  );

  const Completo = (
    <ContenidoCompleto
      dia={dia}
      secciones={secciones}
      sinTurnos={sinTurnos}
      onActivarExtra={onActivarExtra}
      onDesactivarExtra={onDesactivarExtra}
    />
  );

  // El dia actual va siempre expandido; los demas, compactos y se expanden al hover.
  if (ancha) {
    return (
      <section className="flex min-w-0 flex-[3] flex-col overflow-hidden rounded-[1.25rem] border border-sky-200/70 bg-white/55 shadow-[0_8px_30px_-10px_rgba(56,120,255,0.35)] ring-1 ring-sky-300/40 backdrop-blur-sm">
        {Header}
        <SortableContext items={dia.ots.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className={cn("min-h-32 flex-1 transition-colors", isOver && "bg-sky-100/40")}>
            {Completo}
          </div>
        </SortableContext>
      </section>
    );
  }

  return (
    <section className="group/col flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/45 shadow-[0_4px_20px_-12px_rgba(16,24,40,0.25)] backdrop-blur-sm transition-all duration-300 ease-in-out hover:flex-[3] hover:bg-white/60 hover:shadow-[0_12px_36px_-12px_rgba(16,24,40,0.3)]">
      {Header}
      <SortableContext items={dia.ots.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn("min-h-20 flex-1 transition-colors", isOver && "bg-sky-100/40")}>
          <div className="group-hover/col:hidden">
            <ContenidoCompacto secciones={secciones} />
          </div>
          <div className="hidden group-hover/col:block">{Completo}</div>
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

  // La columna "ancha" es la de hoy; si hoy no es laborable, la primera.
  const idxHoy = dias.findIndex((d) => d.esHoy);
  const anchaIdx = idxHoy >= 0 ? idxHoy : 0;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Tablero</h1>
        <p className="text-sm text-slate-500">
          Arrastrá las OTs para reordenarlas o moverlas entre días. Tocá el espacio entre turnos para activar el turno extra.
        </p>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex w-full items-stretch gap-2 pb-4">
          {dias.map((dia, i) => (
            <ColumnaAdmin
              key={dia.fecha}
              dia={dia}
              ancha={anchaIdx === i}
              onActivarExtra={setConfirmar}
              onDesactivarExtra={(fecha) => cambiarExtra(fecha, false)}
            />
          ))}
        </div>
        <DragOverlay>
          {activa && (
            <div className="rounded-2xl border border-sky-300 bg-white/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur">
              {activa.numero ? `OT ${activa.numero}` : activa.nombreCliente || "OT"}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmar(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/90 p-5 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              <h3 className="font-semibold text-slate-800">Activar turno extra</h3>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              ¿Activar el turno extra ({confirmar.extra?.horaInicio}–{confirmar.extra?.horaFin}) para el{" "}
              <span className="font-medium capitalize text-slate-700">
                {confirmar.dia} {confirmar.fechaCorta}
              </span>
              ? Los trabajos se reacomodarán para ocupar ese espacio.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmar(null)}>
                Cancelar
              </Button>
              <Button onClick={() => cambiarExtra(confirmar.fecha, true)} className="bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:opacity-95">
                <Sparkles /> Activar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
