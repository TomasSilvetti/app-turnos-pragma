"use client";

// La carga inicial sincroniza con la API en cuanto el device está listo, que es
// el uso previsto de un effect (igual que en /notas/[id]).
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { WorkItem } from "@/components/notas/trabajo/WorkItem";
import { HarnessPanel } from "@/components/notas/trabajo/HarnessPanel";
import { LISTAS, esClaveLista, type ItemTrabajo } from "@/lib/notas/trabajoClient";

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
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await notasFetch(`/api/notas/trabajo/items?estado=${config.estado}`).catch(() => null);
    if (res?.ok) {
      const { items } = await res.json();
      setItems(items);
    } else {
      setItems([]);
    }
  }, [config.estado]);

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

      {!items ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
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
            <WorkItem key={item.id} item={item} onCambio={cargar} onCrearDesdeProblema={crear} />
          ))}
        </ul>
      )}
    </div>
  );
}
