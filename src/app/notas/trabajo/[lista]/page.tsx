"use client";

// La carga inicial sincroniza con la API en cuanto el device está listo, que es
// el uso previsto de un effect (igual que en /notas/[id]).
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Inbox, Check, Minus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { WorkItem } from "@/components/notas/trabajo/WorkItem";
import { HarnessPanel } from "@/components/notas/trabajo/HarnessPanel";
import { PropuestosPorInforme } from "@/components/notas/trabajo/PropuestosPorInforme";
import { LISTAS, esClaveLista, type ItemTrabajo, type PedidoArchivo } from "@/lib/notas/trabajoClient";

// Cada "nota fija" es esta pantalla con otro filtro. No son notas de Tiptap: el
// harness escribe el log mientras el usuario puede estar editando el prompt, y
// un documento único haría que una escritura pise a la otra.

export default function ListaTrabajoPage() {
  const params = useParams<{ lista: string }>();
  const router = useRouter();
  const { ready, deviceId } = useNotaDevice();

  const clave = esClaveLista(params.lista) ? params.lista : "pendiente";
  const config = LISTAS[clave];

  const [items, setItems] = useState<ItemTrabajo[] | null>(null);
  // Sólo para propuestos: el informe del que salió cada ítem, que es como se
  // agrupan y se aprueban.
  const [pedidos, setPedidos] = useState<PedidoArchivo[]>([]);
  const [creando, setCreando] = useState(false);
  // Selección en lote: hoy sólo en bloqueados, para devolverlos todos a la cola.
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [reencolando, setReencolando] = useState(false);
  const esPropuestos = clave === "propuestos";
  const enLote = clave === "bloqueados";

  const cargar = useCallback(async () => {
    const [res, resPedidos] = await Promise.all([
      notasFetch(`/api/notas/trabajo/items?estado=${config.estado}`).catch(() => null),
      esPropuestos ? notasFetch("/api/notas/trabajo/archivo").catch(() => null) : null,
    ]);
    if (res?.ok) {
      const { items } = await res.json();
      setItems(items);
      // El refresco de fondo puede traer una lista sin los que ya se movieron:
      // una selección que apunta a ítems que no están más manda ids fantasma.
      setSeleccion((prev) => prev.filter((id) => items.some((i: ItemTrabajo) => i.id === id)));
    } else {
      setItems([]);
    }
    if (resPedidos?.ok) {
      const { pedidos } = await resPedidos.json();
      setPedidos(pedidos ?? []);
    }
  }, [config.estado, esPropuestos]);

  useEffect(() => {
    if (ready && deviceId) cargar();
  }, [ready, deviceId, cargar]);

  // Refresco de fondo: mientras el harness trabaja, el estado del ítem y su
  // progreso cambian sin que nadie toque nada en esta pantalla.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const crear = useCallback(
    async (texto?: string) => {
      setCreando(true);
      const contenido = texto
        ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: texto }] }] }
        : undefined;
      const res = await notasFetch("/api/notas/trabajo/items", {
        method: "POST",
        body: JSON.stringify({ titulo: "", ...(contenido ? { contenido } : {}) }),
      }).catch(() => null);
      setCreando(false);
      if (res?.ok) {
        // Un ítem creado desde un problema nace pendiente: si estamos parados en
        // bloqueados, hay que ir a verlo donde de verdad quedó.
        if (clave !== "pendiente") router.push("/notas/trabajo/pendiente");
        else cargar();
      }
    },
    [cargar, clave, router]
  );

  const alternarSeleccion = useCallback((id: string, valor: boolean) => {
    setSeleccion((prev) => (valor ? [...prev, id] : prev.filter((x) => x !== id)));
  }, []);

  const alternarTodo = useCallback(() => {
    setSeleccion((prev) => (prev.length === (items?.length ?? 0) ? [] : (items ?? []).map((i) => i.id)));
  }, [items]);

  // Reencolar es mandarlos de vuelta a la lista de trabajo pendiente, que es de
  // donde el harness toma. El endpoint les limpia el bloqueo y les devuelve los
  // intentos.
  const reencolar = useCallback(async () => {
    if (!seleccion.length) return;
    setReencolando(true);
    const res = await notasFetch("/api/notas/trabajo/items", {
      method: "PATCH",
      body: JSON.stringify({ ids: seleccion, estado: "pendiente" }),
    }).catch(() => null);
    setReencolando(false);
    if (res?.ok) {
      setSeleccion([]);
      cargar();
    }
  }, [seleccion, cargar]);

  const todosSeleccionados = !!items && items.length > 0 && seleccion.length === items.length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-5 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/notas/trabajo")} aria-label="Volver">
          <ArrowLeft />
        </Button>
        <h1 className="flex-1 truncate text-2xl font-bold tracking-tight">{config.titulo}</h1>
        <ThemeToggle />
      </header>

      <HarnessPanel />

      {clave === "pendiente" && (
        <Button onClick={() => crear()} disabled={creando || !ready} className="mb-5" size="lg">
          {creando ? <Loader2 className="animate-spin" /> : <Plus />}
          Nuevo ítem de trabajo
        </Button>
      )}

      {enLote && items && items.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <button
            type="button"
            onClick={alternarTodo}
            role="checkbox"
            aria-checked={todosSeleccionados ? true : seleccion.length > 0 ? "mixed" : false}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                seleccion.length > 0
                  ? "border-amber-500 bg-amber-500 text-white"
                  : "border-muted-foreground/40 hover:border-amber-500"
              )}
            >
              {todosSeleccionados ? (
                <Check className="size-3.5" />
              ) : seleccion.length > 0 ? (
                <Minus className="size-3.5" />
              ) : null}
            </span>
            Seleccionar todo
          </button>

          <span className="text-xs text-muted-foreground">
            {seleccion.length} de {items.length}
          </span>

          <Button
            onClick={reencolar}
            disabled={!seleccion.length || reencolando}
            size="sm"
            className="ml-auto"
          >
            {reencolando ? <Loader2 className="animate-spin" /> : <RotateCw />}
            Reencolar en pendiente
          </Button>
        </div>
      )}

      {!items ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : esPropuestos ? (
        // Sin ítems igual hay algo que mostrar: el informe que se está
        // analizando en este momento, o el que falló.
        <PropuestosPorInforme items={items} pedidos={pedidos} onCambio={cargar} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {clave === "pendiente"
              ? "No hay trabajo cargado. Creá el primer ítem."
              : clave === "bloqueados"
                ? "Nada trabado. Buena señal."
                : "Todavía no se completó ninguna tarea."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <WorkItem
              key={item.id}
              item={item}
              onCambio={cargar}
              onCrearDesdeProblema={crear}
              seleccionado={enLote && seleccion.includes(item.id)}
              onSeleccionar={enLote ? alternarSeleccion : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
