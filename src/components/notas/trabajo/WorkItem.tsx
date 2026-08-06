"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2, Trash2, Check, Timer, RotateCw, FileText, Terminal, Pause, Play, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { notasFetch } from "@/lib/notas/client";
import { PromptEditor } from "./PromptEditor";
import { LogHarness } from "./LogHarness";
import {
  duracion,
  porcentaje,
  type ItemTrabajo,
  type LogTrabajo,
} from "@/lib/notas/trabajoClient";

// El "párrafo padre" de un ítem: checkbox, título, barra de progreso, y al
// desplegarlo el prompt de trabajo arriba y el log del harness abajo.
//
// El detalle (prompt + log + capturas) se pide recién al desplegar: una lista de
// veinte tareas con sus capturas sería megabytes al abrir la pantalla.

export function WorkItem({
  item,
  onCambio,
  onCrearDesdeProblema,
}: {
  item: ItemTrabajo;
  onCambio: () => void;
  onCrearDesdeProblema: (texto: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState<ItemTrabajo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [borrando, setBorrando] = useState(false);
  const [desbloqueando, setDesbloqueando] = useState(false);
  // Fuerza el redibujo del cronómetro de la sesión en curso.
  const [, setTick] = useState(0);

  const enCurso = item.estado === "en_curso";
  const pausada = item.estado === "pausada";
  // Lo escribió el itemizador leyendo un informe y todavía no lo aprobaste: no
  // es trabajo pendiente hasta que digas que sí.
  const propuesto = item.estado === "propuesto";
  const pct = porcentaje(item);

  const cargarDetalle = useCallback(async () => {
    setCargando(true);
    const res = await notasFetch(`/api/notas/trabajo/items/${item.id}`).catch(() => null);
    if (res?.ok) {
      const { item: completo } = await res.json();
      setDetalle(completo);
    }
    setCargando(false);
  }, [item.id]);

  // La carga se dispara al desplegar (en el handler, no en un effect): así el
  // detalle se pide una sola vez y no en cada render que toque `detalle`.
  const alternar = useCallback(() => {
    setAbierto((v) => {
      if (!v && !detalle) cargarDetalle();
      return !v;
    });
  }, [detalle, cargarDetalle]);

  // Mientras la tarea corre, el log crece solo: se refresca lo desplegado y el
  // cronómetro cada 10 s.
  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => {
      setTick((n) => n + 1);
      if (abierto) cargarDetalle();
    }, 10000);
    return () => clearInterval(t);
  }, [enCurso, abierto, cargarDetalle]);

  const patch = async (data: Record<string, unknown>) => {
    await notasFetch(`/api/notas/trabajo/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }).catch(() => {});
    onCambio();
  };

  // Pausar la que está corriendo corta la sesión: el runner lo ve en su próxima
  // consulta de órdenes. Lo que escribió en disco queda y al reanudar retoma
  // desde ahí, así que cortar no tira el trabajo — pero conviene avisarlo.
  const pausar = async () => {
    if (
      enCurso &&
      !confirm(
        "El harness está trabajando en esta tarea.\n\nPausarla corta la sesión ahora. Lo que haya escrito queda en disco y al reanudarla retoma desde ahí."
      )
    )
      return;
    await patch({ estado: "pausada" });
  };

  const eliminar = async () => {
    if (
      !confirm(
        `¿Eliminar «${item.titulo || "sin título"}»?\n\nSe borran también su log y todas sus capturas. No se puede deshacer.`
      )
    )
      return;
    setBorrando(true);
    await notasFetch(`/api/notas/trabajo/items/${item.id}`, { method: "DELETE" }).catch(() => {});
    onCambio();
  };

  const agregarDesbloqueo = async () => {
    setDesbloqueando(true);
    const res = await notasFetch(`/api/notas/trabajo/items/${item.id}/prompts`, {
      method: "POST",
      body: JSON.stringify({ tipo: "desbloqueo", contenido: { type: "doc", content: [{ type: "paragraph" }] } }),
    }).catch(() => null);
    setDesbloqueando(false);
    if (res?.ok) {
      setDetalle(null);
      await cargarDetalle();
      onCambio();
    }
  };

  const promptInicial = detalle?.prompts?.find((p) => p.tipo === "inicial");
  const desbloqueos = detalle?.prompts?.filter((p) => p.tipo === "desbloqueo") ?? [];

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        enCurso ? "nota-item-trabajando border-primary/60" : "border-border",
        item.estado === "bloqueado" && "border-amber-500/50",
        propuesto && "border-dashed border-sky-500/50",
        pausada && "opacity-60"
      )}
    >
      {/* Cabecera — el párrafo padre */}
      <div className="flex items-start gap-2.5 p-3">
        {propuesto ? (
          // Aprobar, no completar: el checkbox de un propuesto significaría
          // "terminé una tarea que todavía nadie empezó".
          <button
            type="button"
            onClick={() => patch({ estado: "pendiente" })}
            aria-label="Aprobar y mandar a la cola"
            title="Aprobar: pasa a la lista de trabajo pendiente"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-sky-500/60 text-sky-500 transition-colors hover:bg-sky-500 hover:text-white"
          >
            <Check className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => patch({ estado: item.estado === "completado" ? "pendiente" : "completado" })}
            aria-label={item.estado === "completado" ? "Reabrir" : "Marcar como completada"}
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
              item.estado === "completado"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40 hover:border-primary"
            )}
          >
            {item.estado === "completado" && <Check className="size-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={alternar}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", abierto && "rotate-90")}
            />
            <span
              className={cn(
                "truncate font-medium",
                item.estado === "completado" && "text-muted-foreground line-through"
              )}
            >
              {titulo || "Sin título"}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-muted-foreground">
            {item.proyecto && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{item.proyecto}</span>}
            {item.fuenteArchivo && (
              // De qué parte del informe salió. Es lo que hace que el ítem se
              // pueda ampliar sin que el prompt tenga que repetir el documento.
              <span
                className={cn(
                  "flex items-center gap-1",
                  item.fuenteCambiada
                    ? "font-medium text-amber-600 dark:text-amber-400"
                    : "text-sky-600 dark:text-sky-400"
                )}
                title={
                  item.fuenteCambiada
                    ? `${item.fuenteArchivo}${item.fuenteAncla ?? ""}\n\nEsta parte del informe se editó después de que se escribió el ítem. La sesión va a trabajar contra el informe de hoy, no contra el texto del prompt.`
                    : `${item.fuenteArchivo}${item.fuenteAncla ?? ""}`
                }
              >
                <FileSearch className="size-3" />
                {(item.fuenteArchivo.split(/[\\/]/).pop() || item.fuenteArchivo) + (item.fuenteAncla ?? "")}
                {item.fuenteCambiada && " · el informe cambió"}
              </span>
            )}
            {propuesto && <span className="font-medium text-sky-600 dark:text-sky-400">sin aprobar</span>}
            {pausada && <span className="font-medium">en pausa</span>}
            {enCurso && (
              <span className="flex items-center gap-1 font-medium text-primary">
                <Timer className="size-3" />
                ejecutándose{item.sesionInicio ? ` · ${duracion(item.sesionInicio)}` : ""}
                {item.cuenta ? ` · cuenta ${item.cuenta}` : ""}
              </span>
            )}
            {item.intentos > 1 && item.estado !== "completado" && (
              <span className="flex items-center gap-1">
                <RotateCw className="size-3" />
                intento {item.intentos}/3
              </span>
            )}
            {item._count && item._count.logs > 0 && <span>{item._count.logs} anotaciones</span>}
            {!enCurso && !pausada && item.intentos >= 3 && (
              <span className="font-medium text-amber-600 dark:text-amber-400">sin intentos</span>
            )}
          </div>

          {/* Barra de progreso — sólo si el prompt declaró pasos numerados */}
          {(pct !== null || enCurso) && (
            <div className="mt-2 ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
              {pct !== null ? (
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    item.estado === "completado" ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${pct}%` }}
                />
              ) : (
                // En curso sin pasos declarados: barra indeterminada, que dice
                // "está trabajando" sin inventar un porcentaje.
                <div className="nota-barra-indeterminada h-full w-1/3 rounded-full bg-primary/70" />
              )}
            </div>
          )}
        </button>

        {pct !== null && (
          <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
        )}

        {(item.estado === "pendiente" || enCurso || pausada) && (
          <button
            type="button"
            onClick={() => (pausada ? patch({ estado: "pendiente" }) : pausar())}
            aria-label={pausada ? "Reanudar tarea" : "Pausar tarea"}
            title={
              pausada
                ? "Reanudar: vuelve a la cola"
                : enCurso
                  ? "Pausar: corta la sesión en curso"
                  : "Pausar: el harness no la va a tomar"
            }
            className={cn(
              "mt-0.5 shrink-0 rounded-md p-1 transition-colors",
              pausada
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {pausada ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        )}

        {(item.estado === "completado" || item.estado === "bloqueado" || propuesto) && (
          <button
            type="button"
            onClick={eliminar}
            disabled={borrando}
            aria-label="Eliminar ítem"
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            {borrando ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </button>
        )}
      </div>

      {/* Sub-trama */}
      {abierto && (
        <div className="border-t border-border bg-muted/30 p-3">
          {cargando && !detalle ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => titulo !== item.titulo && patch({ titulo })}
                placeholder="Título del ítem"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
              />

              {item.motivoBloqueo && (
                <p className="rounded-lg border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-sm">
                  {item.motivoBloqueo}
                </p>
              )}

              {/* Bloque 1 — el prompt de trabajo */}
              <section>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="size-3.5" />
                  Prompt de trabajo
                </h3>
                {promptInicial && (
                  <PromptEditor
                    itemId={item.id}
                    promptId={promptInicial.id}
                    contenidoInicial={promptInicial.contenido}
                  />
                )}

                {desbloqueos.map((p, i) => (
                  <div key={p.id} className="mt-2">
                    <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Desbloqueo {i + 1}
                    </p>
                    <PromptEditor
                      itemId={item.id}
                      promptId={p.id}
                      contenidoInicial={p.contenido}
                      placeholder="Qué cambió y cómo seguir para destrabar la tarea."
                    />
                  </div>
                ))}

                {item.estado === "bloqueado" && (
                  <button
                    type="button"
                    onClick={agregarDesbloqueo}
                    disabled={desbloqueando}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/50 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  >
                    {desbloqueando ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                    Escribir prompt de desbloqueo y reencolar
                  </button>
                )}
              </section>

              {/* Bloque 2 — el log del harness */}
              <section>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Terminal className="size-3.5" />
                  Log del harness
                </h3>
                <LogHarness
                  logs={(detalle?.logs ?? []) as LogTrabajo[]}
                  onCrearItem={(entrada) => onCrearDesdeProblema(entrada.texto)}
                />
              </section>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
