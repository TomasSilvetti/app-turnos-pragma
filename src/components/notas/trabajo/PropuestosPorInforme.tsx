"use client";

import { useCallback, useState } from "react";
import { Check, FileSearch, Inbox, Loader2, TriangleAlert, Trash2 } from "lucide-react";
import { notasFetch } from "@/lib/notas/client";
import { WorkItem } from "./WorkItem";
import type { ItemTrabajo, PedidoArchivo } from "@/lib/notas/trabajoClient";

// Los ítems que escribió el itemizador leyendo un informe, agrupados por el
// informe del que salieron.
//
// Agrupados y no en una lista plana porque la decisión real es por informe: uno
// lee los quince que salieron del mismo documento y los aprueba juntos. El
// botón por ítem queda para la excepción — el que no va, o el que hay que
// editar antes.

export function PropuestosPorInforme({
  items,
  pedidos,
  onCambio,
}: {
  items: ItemTrabajo[];
  pedidos: PedidoArchivo[];
  onCambio: () => void;
}) {
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const grupos = pedidos
    .map((pedido) => ({ pedido, suyos: items.filter((i) => i.pedidoArchivoId === pedido.id) }))
    .filter((g) => g.suyos.length > 0);

  // Los que perdieron su pedido (se borró el informe de la lista de los últimos
  // diez) igual tienen que verse: son trabajo escrito que si no queda invisible.
  const huerfanos = items.filter((i) => !grupos.some((g) => g.suyos.includes(i)));

  const accion = useCallback(
    async (pedidoId: string, metodo: "POST" | "DELETE") => {
      if (
        metodo === "DELETE" &&
        !confirm("¿Descartar los ítems que quedan sin aprobar de este informe?\n\nSe borran con sus capturas.")
      )
        return;
      setTrabajando(pedidoId);
      await notasFetch(`/api/notas/trabajo/archivo/${pedidoId}/aprobar`, { method: metodo }).catch(() => {});
      setTrabajando(null);
      onCambio();
    },
    [onCambio]
  );

  // Lo que el harness tiene entre manos. Sin esto, mencionar un informe desde
  // la consola y entrar acá muestra una pantalla vacía durante media hora.
  const enVuelo = pedidos.filter((p) => p.estado === "pendiente" || p.estado === "analizando");
  const fallados = pedidos.filter((p) => p.estado === "error");

  return (
    <div className="space-y-6">
      {enVuelo.map((pedido) => (
        <div
          key={pedido.id}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-sky-500" />
          <span className="min-w-0 flex-1 truncate" title={pedido.ruta}>
            {pedido.nombre || pedido.ruta}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {pedido.estado === "analizando" ? "leyendo el informe" : "en cola"}
          </span>
        </div>
      ))}

      {fallados.map((pedido) => (
        <div
          key={pedido.id}
          className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium" title={pedido.ruta}>
              {pedido.nombre || pedido.ruta}
            </p>
            <p className="text-xs text-muted-foreground">{pedido.error}</p>
          </div>
        </div>
      ))}

      {grupos.length === 0 && huerfanos.length === 0 && enVuelo.length === 0 && fallados.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nada esperando. Mencioná un informe desde la consola y el itemizador lo parte en tareas.
          </p>
        </div>
      )}

      {grupos.map(({ pedido, suyos }) => (
        <section key={pedido.id}>
          <header className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-sky-500/40 bg-sky-500/5 px-3 py-2">
            <FileSearch className="size-4 shrink-0 text-sky-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium" title={pedido.ruta}>
              {pedido.nombre || pedido.ruta}
            </span>
            {pedido.alcance && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {pedido.alcance}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{suyos.length} sin aprobar</span>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => accion(pedido.id, "POST")}
                disabled={trabajando === pedido.id}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-none"
              >
                {trabajando === pedido.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Aprobar los {suyos.length}
              </button>
              <button
                type="button"
                onClick={() => accion(pedido.id, "DELETE")}
                disabled={trabajando === pedido.id}
                aria-label="Descartar todos"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </header>

          <ul className="space-y-3">
            {suyos.map((item) => (
              <WorkItem key={item.id} item={item} onCambio={onCambio} onCrearDesdeProblema={() => {}} />
            ))}
          </ul>
        </section>
      ))}

      {huerfanos.length > 0 && (
        <ul className="space-y-3">
          {huerfanos.map((item) => (
            <WorkItem key={item.id} item={item} onCambio={onCambio} onCrearDesdeProblema={() => {}} />
          ))}
        </ul>
      )}
    </div>
  );
}
