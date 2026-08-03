"use client";

// El overlay se sincroniza con el tamaño real del DOM (un sistema externo), que
// es exactamente para lo que están los effects.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Trash2, GripHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SugerenciaTrabajo } from "@/lib/notas/trabajoClient";

// Las ventanas transparentes sobre el texto crudo. Cada una encasilla los
// bloques que van a formar un ítem, y sus bordes se arrastran para incluir o
// excluir bloques.
//
// Se dibujan midiendo el DOM en vez de envolver el texto porque el crudo es un
// documento de Tiptap: meterle contenedores por rango obligaría a partir nodos
// cada vez que se mueve un borde. Midiendo, mover un borde es cambiar un id.

type Caja = { top: number; alto: number };

const COLORES = [
  { borde: "border-sky-500", fondo: "bg-sky-500/8", texto: "text-sky-600 dark:text-sky-400", manija: "bg-sky-500" },
  { borde: "border-violet-500", fondo: "bg-violet-500/8", texto: "text-violet-600 dark:text-violet-400", manija: "bg-violet-500" },
  { borde: "border-emerald-500", fondo: "bg-emerald-500/8", texto: "text-emerald-600 dark:text-emerald-400", manija: "bg-emerald-500" },
  { borde: "border-amber-500", fondo: "bg-amber-500/8", texto: "text-amber-600 dark:text-amber-400", manija: "bg-amber-500" },
  { borde: "border-rose-500", fondo: "bg-rose-500/8", texto: "text-rose-600 dark:text-rose-400", manija: "bg-rose-500" },
];

export function OverlaySugerencias({
  contenedor,
  sugerencias,
  proyectos,
  confirmando,
  onCambiarRango,
  onCambiarTitulo,
  onCambiarProyecto,
  onConfirmar,
  onDescartar,
}: {
  contenedor: HTMLElement | null;
  sugerencias: SugerenciaTrabajo[];
  proyectos: string[];
  confirmando: string | null;
  onCambiarRango: (id: string, desdeBid: string, hastaBid: string) => void;
  onCambiarTitulo: (id: string, titulo: string) => void;
  onCambiarProyecto: (id: string, proyecto: string) => void;
  onConfirmar: (id: string) => void;
  onDescartar: (id: string) => void;
}) {
  const [cajas, setCajas] = useState<Record<string, Caja>>({});
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const bloquesRef = useRef<{ bid: string; top: number; medio: number; alto: number }[]>([]);

  // Posiciones de cada bloque relativas al contenedor. Se recalculan enteras y
  // no de a una: una imagen que termina de cargar corre todo lo que está abajo.
  const medir = useCallback(() => {
    if (!contenedor) return;
    const base = contenedor.getBoundingClientRect().top;
    const nodos = Array.from(contenedor.querySelectorAll<HTMLElement>("[data-bid]"));
    bloquesRef.current = nodos.map((n) => {
      const r = n.getBoundingClientRect();
      return { bid: n.dataset.bid as string, top: r.top - base, medio: r.top - base + r.height / 2, alto: r.height };
    });

    const nuevas: Record<string, Caja> = {};
    for (const s of sugerencias) {
      const i = bloquesRef.current.findIndex((b) => b.bid === s.desdeBid);
      const j = bloquesRef.current.findIndex((b) => b.bid === s.hastaBid);
      if (i < 0 || j < 0) continue;
      const [a, b] = i <= j ? [i, j] : [j, i];
      const arriba = bloquesRef.current[a];
      const abajo = bloquesRef.current[b];
      nuevas[s.id] = { top: arriba.top, alto: abajo.top + abajo.alto - arriba.top };
    }
    setCajas(nuevas);
  }, [contenedor, sugerencias]);

  useEffect(() => {
    medir();
    if (!contenedor) return;
    const ro = new ResizeObserver(medir);
    ro.observe(contenedor);
    for (const n of Array.from(contenedor.querySelectorAll<HTMLElement>("[data-bid]"))) ro.observe(n);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [contenedor, medir]);

  // Arrastre de un borde. El snap es al bloque cuyo centro está más cerca del
  // puntero: por eso se puede incluir o excluir un bloque entero, nunca medio.
  const iniciarArrastre = useCallback(
    (e: React.PointerEvent, sugerencia: SugerenciaTrabajo, borde: "arriba" | "abajo") => {
      e.preventDefault();
      e.stopPropagation();
      if (!contenedor) return;
      setArrastrando(sugerencia.id);

      const base = contenedor.getBoundingClientRect().top;
      const bloques = bloquesRef.current;
      const iDesde = bloques.findIndex((b) => b.bid === sugerencia.desdeBid);
      const iHasta = bloques.findIndex((b) => b.bid === sugerencia.hastaBid);

      // Los límites que imponen las ventanas vecinas: dos ítems no pueden
      // reclamar el mismo bloque, así que el borde frena contra la de al lado.
      let minIndice = 0;
      let maxIndice = bloques.length - 1;
      for (const otra of sugerencias) {
        if (otra.id === sugerencia.id) continue;
        const oi = bloques.findIndex((b) => b.bid === otra.desdeBid);
        const oj = bloques.findIndex((b) => b.bid === otra.hastaBid);
        if (oi < 0 || oj < 0) continue;
        if (oj < iDesde) minIndice = Math.max(minIndice, oj + 1);
        if (oi > iHasta) maxIndice = Math.min(maxIndice, oi - 1);
      }

      let ultimo = borde === "arriba" ? iDesde : iHasta;

      const mover = (ev: PointerEvent) => {
        const y = ev.clientY - base;
        let mejor = 0;
        let dist = Infinity;
        for (const [i, b] of bloques.entries()) {
          const d = Math.abs(b.medio - y);
          if (d < dist) {
            dist = d;
            mejor = i;
          }
        }
        // El borde de arriba no puede pasar al de abajo ni al revés: quedaría un
        // rango invertido y la ventana desaparecería de la pantalla.
        const tope = borde === "arriba" ? Math.min(mejor, iHasta) : Math.max(mejor, iDesde);
        const limitado = Math.min(Math.max(tope, minIndice), maxIndice);
        if (limitado === ultimo) return;
        ultimo = limitado;

        const nuevoDesde = borde === "arriba" ? bloques[limitado].bid : sugerencia.desdeBid;
        const nuevoHasta = borde === "abajo" ? bloques[limitado].bid : sugerencia.hastaBid;
        onCambiarRango(sugerencia.id, nuevoDesde, nuevoHasta);
      };

      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        setArrastrando(null);
      };

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    },
    [contenedor, sugerencias, onCambiarRango]
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {sugerencias.map((s, i) => {
        const caja = cajas[s.id];
        if (!caja) return null;
        const color = COLORES[i % COLORES.length];
        const activa = arrastrando === s.id;

        return (
          <div
            key={s.id}
            id={`sugerencia-${s.id}`}
            style={{ top: caja.top - 2, height: caja.alto + 4 }}
            className={cn(
              "pointer-events-auto absolute inset-x-0 rounded-lg border-2 transition-shadow",
              color.borde,
              color.fondo,
              activa && "shadow-lg"
            )}
          >
            {/* Cabecera: título editable y qué hacer con la ventana */}
            <div className="absolute -top-3.5 left-2 right-2 flex items-center gap-1.5">
              <input
                value={s.titulo}
                onChange={(e) => onCambiarTitulo(s.id, e.target.value)}
                placeholder="Título del ítem"
                className={cn(
                  "min-w-0 flex-1 truncate rounded-md border bg-card px-2 py-0.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40",
                  color.borde,
                  color.texto
                )}
              />
              <select
                value={s.proyecto}
                onChange={(e) => onCambiarProyecto(s.id, e.target.value)}
                aria-label="Proyecto"
                className={cn("rounded-md border bg-card px-1.5 py-0.5 text-[11px] font-medium outline-none", color.borde)}
              >
                <option value="">sin proyecto</option>
                {proyectos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onConfirmar(s.id)}
                disabled={confirmando === s.id}
                aria-label="Confirmar ítem"
                title="Confirmar: pasa a la lista de pendientes"
                className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {confirmando === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onDescartar(s.id)}
                aria-label="Descartar sugerencia"
                title="Descartar: saca la ventana, el texto queda"
                className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            {(["arriba", "abajo"] as const).map((borde) => (
              <div
                key={borde}
                onPointerDown={(e) => iniciarArrastre(e, s, borde)}
                role="slider"
                aria-label={`Borde ${borde} del ítem`}
                aria-valuenow={0}
                tabIndex={-1}
                className={cn(
                  "absolute inset-x-0 flex h-4 cursor-ns-resize touch-none items-center justify-center",
                  borde === "arriba" ? "-top-2" : "-bottom-2"
                )}
              >
                <span className={cn("flex h-3 w-10 items-center justify-center rounded-full opacity-80", color.manija)}>
                  <GripHorizontal className="size-3 text-white" />
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
