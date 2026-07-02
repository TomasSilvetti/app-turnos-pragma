"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, GripVertical, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ItemOT } from "@/components/lavanderia/ItemOT";
import { OTModal } from "@/components/lavanderia/OTModal";
import { BuscadorOT } from "@/components/lavanderia/BuscadorOT";
import { BarraDiaMini, nivelOcupacion } from "@/components/lavanderia/BarraDiaMini";
import { ToggleVista } from "@/components/lavanderia/ToggleVista";
import { TableroAccionesProvider } from "@/components/lavanderia/TableroAccionesContext";
import { useTableroStream } from "@/hooks/useTableroStream";
import { useResaltarOT } from "@/hooks/useResaltarOT";
import { lavFetch } from "@/lib/lavanderia/client";
import { formatoDuracion } from "@/lib/lavanderia/timeline";
import { useEsMobile } from "@/hooks/useEsMobile";
import type { DiaSnap, OTSnap } from "@/lib/lavanderia/tablero";

// Tarjeta arrastrable: reusa el mismo diseño que el tablero del empleado (ItemOT),
// agregando un handle de arrastre y ocultando las acciones de empleado.
function TarjetaArrastrable({ ot, onAbrir, resaltada }: { ot: OTSnap; onAbrir?: (ot: OTSnap) => void; resaltada?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ot.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-50")}
    >
      <ItemOT
        ot={ot}
        onAbrir={onAbrir ? () => onAbrir(ot) : undefined}
        resaltada={resaltada}
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

const ESTADO_BARRA: Record<string, string> = {
  pendiente: "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
  en_progreso: "bg-gradient-to-r from-amber-400 to-orange-400",
  terminado: "bg-gradient-to-r from-emerald-400 to-teal-400",
};

// Vista comprimida: barras de ocupacion apiladas (una sola cola).
function ContenidoCompacto({ dia }: { dia: DiaSnap }) {
  return (
    <div className="flex flex-col gap-1 p-1.5">
      {dia.ots.map((ot) => (
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
      {dia.ots.length === 0 && <div className="h-2 rounded bg-muted/50" />}
    </div>
  );
}

// Vista completa: el día como una sola cola de tarjetas arrastrables.
function ContenidoCompleto({
  dia,
  onAbrirOT,
  resaltadaId,
}: {
  dia: DiaSnap;
  onAbrirOT?: (ot: OTSnap) => void;
  resaltadaId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {dia.ots.map((ot) => (
        <TarjetaArrastrable key={ot.id} ot={ot} onAbrir={onAbrirOT} resaltada={ot.id === resaltadaId} />
      ))}
      {dia.ots.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground/60">
          {dia.capacidadMin > 0 ? "Soltá acá" : "Día sin turnos"}
        </p>
      )}
    </div>
  );
}

function ColumnaAdmin({
  dia,
  ancha,
  esMobile,
  arrastrando,
  sobre,
  onActivarExtra,
  onDesactivarExtra,
  onAbrirOT,
  forzarExpandir = false,
  resaltadaId,
  compacto = false,
  entradaDerecha = false,
  entradaDelayMs = 0,
}: {
  dia: DiaSnap;
  ancha: boolean;
  esMobile: boolean;
  arrastrando: boolean;
  sobre: boolean;
  onActivarExtra: (dia: DiaSnap) => void;
  onDesactivarExtra: (fecha: string) => void;
  onAbrirOT?: (ot: OTSnap) => void;
  compacto?: boolean;
  entradaDerecha?: boolean;
  entradaDelayMs?: number;
  // Fuerza abrir la columna aunque no haya hover (al llegar por el buscador).
  forzarExpandir?: boolean;
  resaltadaId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${dia.fecha}` });
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
      {(dia.turnos.length > 0 || dia.extra?.disponible) && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {dia.turnos.map((t) => (
            <span
              key={t.tipo}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                t.tipo === "extra" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
              )}
            >
              {t.tipo === "extra" && <Sparkles className="size-2.5" />}
              {t.horaInicio}–{t.horaFin}
              {t.tipo === "extra" && (
                <button
                  onClick={() => onDesactivarExtra(dia.fecha)}
                  className="ml-0.5 text-amber-500 hover:text-destructive"
                  title="Desactivar turno extra"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </span>
          ))}
          {dia.extra?.disponible && !dia.extra.activo && (
            <button
              onClick={() => onActivarExtra(dia)}
              title="Activar turno extra"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-300 bg-amber-50/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-100/80"
            >
              <Sparkles className="size-2.5" /> +extra {dia.extra.horaInicio}–{dia.extra.horaFin}
            </button>
          )}
        </div>
      )}
    </header>
  );

  const Completo = <ContenidoCompleto dia={dia} onAbrirOT={onAbrirOT} resaltadaId={resaltadaId} />;

  // Vista comprimida (14 días): solo el % del día, sin drag & drop.
  if (compacto) {
    const nivel = nivelOcupacion(dia);
    return (
      <section
        style={entradaDerecha ? { animationDelay: `${entradaDelayMs}ms` } : undefined}
        className={cn(
          "flex h-40 min-w-0 flex-col overflow-hidden rounded-[1.25rem] border backdrop-blur-sm transition-[background-color,border-color] duration-500",
          nivel.card,
          dia.esHoy && "ring-1 ring-sky-300/60",
          entradaDerecha && "fila-entra-derecha"
        )}
      >
        <BarraDiaMini dia={dia} />
      </section>
    );
  }

  // En mobile no hay hover: cada dia ocupa todo el ancho y se muestra expandido.
  if (esMobile) {
    return (
      <section
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-[1.25rem] border bg-white/55 shadow-[0_4px_20px_-12px_rgba(16,24,40,0.25)] backdrop-blur-sm",
          dia.esHoy ? "border-sky-200/70 ring-1 ring-sky-300/40" : "border-white/60"
        )}
      >
        {Header}
        <SortableContext items={dia.ots.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className={cn("min-h-20 flex-1 transition-colors", isOver && "bg-sky-100/40")}>
            {Completo}
          </div>
        </SortableContext>
      </section>
    );
  }

  // El dia actual va siempre expandido; los demas, compactos y se expanden al hover.
  if (ancha) {
    return (
      <section className="flex min-w-0 flex-[3] flex-col overflow-hidden rounded-[1.25rem] border border-sky-200/70 bg-white/55 shadow-[0_8px_30px_-10px_rgba(56,120,255,0.35)] ring-1 ring-sky-300/40 backdrop-blur-sm transition-all duration-500 ease-in-out">
        {Header}
        <SortableContext items={dia.ots.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className={cn("min-h-32 flex-1 transition-colors", isOver && "bg-sky-100/40")}>
            {Completo}
          </div>
        </SortableContext>
      </section>
    );
  }

  // Durante el arrastre, la expansión la maneja dnd-kit (columna sobre la que está
  // el mouse), porque el `:hover` de CSS no es confiable mientras se arrastra.
  // Sin arrastre, se expande con el hover normal del mouse.
  const expandido = forzarExpandir || (arrastrando && sobre);
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-white/60 backdrop-blur-sm transition-all duration-300 ease-in-out",
        expandido
          ? "flex-[3] bg-white/60 shadow-[0_12px_36px_-12px_rgba(16,24,40,0.3)]"
          : "flex-1 bg-white/45 shadow-[0_4px_20px_-12px_rgba(16,24,40,0.25)]",
        !arrastrando &&
          "group/col hover:flex-[3] hover:bg-white/60 hover:shadow-[0_12px_36px_-12px_rgba(16,24,40,0.3)]"
      )}
    >
      {Header}
      <SortableContext items={dia.ots.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn("min-h-20 flex-1 transition-colors", isOver && "bg-sky-100/40")}>
          {expandido ? (
            Completo
          ) : arrastrando ? (
            <ContenidoCompacto dia={dia} />
          ) : (
            <>
              <div className="group-hover/col:hidden">
                <ContenidoCompacto dia={dia} />
              </div>
              <div className="hidden group-hover/col:block">{Completo}</div>
            </>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function TableroAdmin() {
  // El admin entra por cookie, asi que el hook no necesita un empleadoId real;
  // un valor constante alcanza para activar el polling de version (cada 5s) que
  // mantiene el tablero del admin al dia con lo que hagan los empleados.
  const { snapshot, refrescar, aplicarLocal, quitarLocal } = useTableroStream("admin");
  const [dias, setDias] = useState<DiaSnap[]>([]);
  const [activa, setActiva] = useState<OTSnap | null>(null);
  const [sobreFecha, setSobreFecha] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<DiaSnap | null>(null);
  const [otModal, setOtModal] = useState<OTSnap | null>(null);
  const [vista, setVista] = useState<7 | 14>(7);
  const { resaltadaId, expandidaFecha, resaltar } = useResaltarOT();
  const esMobile = useEsMobile();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Mientras se arrastra no sincronizamos desde el snapshot, para no pisar el
  // reordenamiento optimista en curso. Usamos un ref (no dependencia del effect)
  // para que al soltar no se dispare un sync que revierta el movimiento.
  const arrastrandoRef = useRef(false);
  useEffect(() => {
    arrastrandoRef.current = activa !== null;
  }, [activa]);

  // El polling actualiza `snapshot` solo cuando cambia la version del tablero;
  // ahi reflejamos esos cambios (incluido el parche optimista de empezar/terminar)
  // en el estado local que dibuja el drag & drop.
  useEffect(() => {
    // Sincroniza el estado local del drag & drop con el snapshot del stream.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (snapshot && !arrastrandoRef.current) setDias(snapshot.dias);
  }, [snapshot]);

  const cambiarExtra = (fecha: string, habilitado: boolean) => {
    lavFetch("/api/lavanderia/turnos/extra", { method: "PUT", body: JSON.stringify({ fecha, habilitado }) })
      .then((r) => {
        if (r.ok) refrescar();
      })
      .catch(() => {})
      .finally(() => setConfirmar(null));
  };

  const fechaDeOT = (id: string) => dias.find((d) => d.ots.some((o) => o.id === id))?.fecha;

  // Detecta el droppable bajo el puntero del mouse (no bajo el centro del ticket).
  // Si el puntero no toca ningún droppable, cae a intersección de rectángulos.
  const collisionDetection: CollisionDetection = (args) => {
    const porPuntero = pointerWithin(args);
    return porPuntero.length > 0 ? porPuntero : rectIntersection(args);
  };

  const fechaDeOver = (overId: string) =>
    overId.startsWith("col:") ? overId.slice(4) : fechaDeOT(overId) ?? null;

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    for (const d of dias) {
      const ot = d.ots.find((o) => o.id === id);
      if (ot) setActiva(ot);
    }
  };

  const onDragOver = (e: DragOverEvent) => {
    setSobreFecha(e.over ? fechaDeOver(String(e.over.id)) : null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiva(null);
    setSobreFecha(null);
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
        if (!r.ok) refrescar();
      })
      .catch(() => refrescar());
  };

  if (!snapshot) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const diasView = dias.slice(0, vista);
  // La columna "ancha" es la de hoy; si hoy no es laborable, la primera.
  const idxHoy = diasView.findIndex((d) => d.esHoy);
  const anchaIdx = idxHoy >= 0 ? idxHoy : 0;

  return (
    <TableroAccionesProvider value={{ refrescar, aplicarLocal, quitarLocal }}>
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Tablero</h1>
          <p className="text-sm text-slate-500">
            Arrastrá las OTs para reordenarlas o moverlas entre días. Tocá el espacio entre turnos para activar el turno extra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleVista vista={vista} onVista={setVista} />
          <BuscadorOT dias={diasView} onSeleccionar={(ot, fecha) => resaltar(ot.id, fecha)} />
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div
          className={cn(
            "pb-4",
            vista === 14
              ? "grid grid-cols-2 gap-2 sm:grid-cols-7"
              : cn("flex w-full gap-2", esMobile ? "flex-col" : "items-stretch")
          )}
        >
          {diasView.map((dia, i) => (
            <ColumnaAdmin
              key={dia.fecha}
              dia={dia}
              ancha={vista === 7 && anchaIdx === i}
              compacto={vista === 14}
              entradaDerecha={vista === 14 && i >= 7}
              entradaDelayMs={(13 - i) * 40}
              esMobile={esMobile}
              arrastrando={activa !== null}
              sobre={sobreFecha === dia.fecha}
              onActivarExtra={setConfirmar}
              onDesactivarExtra={(fecha) => cambiarExtra(fecha, false)}
              onAbrirOT={setOtModal}
              forzarExpandir={expandidaFecha === dia.fecha}
              resaltadaId={resaltadaId}
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

      {otModal && (
        <OTModal
          ot={otModal}
          admin
          onCerrar={() => setOtModal(null)}
          onActualizar={() => {
            setOtModal(null);
            refrescar();
          }}
        />
      )}

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
    </TableroAccionesProvider>
  );
}
