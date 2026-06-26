"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";

type Proceso = { id: string; nombre: string };

export function ServicioModal({
  servicio,
  procesos,
  onProcesoCreado,
  onGuardar,
  onCerrar,
}: {
  // null = crear; con datos = editar.
  servicio: { id: string; nombre: string; procesoIds: string[] } | null;
  procesos: Proceso[];
  onProcesoCreado: (p: Proceso) => void;
  onGuardar: (data: { id?: string; nombre: string; procesoIds: string[] }) => Promise<void>;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(servicio?.nombre ?? "");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(servicio?.procesoIds ?? []));
  const [nuevoProceso, setNuevoProceso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  const toggle = (id: string) =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const crearProceso = async () => {
    const n = nuevoProceso.trim();
    if (!n) return;
    const res = await lavFetch("/api/lavanderia/procesos", { method: "POST", body: JSON.stringify({ nombre: n }) });
    if (res.ok) {
      const { proceso } = await res.json();
      onProcesoCreado(proceso);
      setSeleccion((prev) => new Set(prev).add(proceso.id));
      setNuevoProceso("");
    }
  };

  const guardar = async () => {
    const n = nombre.trim();
    if (!n) return;
    setGuardando(true);
    try {
      await onGuardar({ id: servicio?.id, nombre: n, procesoIds: [...seleccion] });
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="font-semibold">{servicio ? "Editar servicio" : "Nuevo servicio"}</h3>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Nombre del servicio</span>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: LIMPIEZA"
              className="mt-0.5 h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Procesos que incluye</p>
            <div className="space-y-1">
              {procesos.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                  <input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggle(p.id)} className="size-4 rounded border-border" />
                  {p.nombre}
                </label>
              ))}
              {procesos.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Todavía no hay procesos. Creá uno abajo.</p>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={nuevoProceso}
                onChange={(e) => setNuevoProceso(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && crearProceso()}
                placeholder="Nuevo proceso (lavado, secado…)"
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
              />
              <Button size="sm" variant="outline" onClick={crearProceso}>
                <Plus /> Proceso
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando || !nombre.trim()}>
            {guardando ? <Loader2 className="animate-spin" /> : <Check />} Guardar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
