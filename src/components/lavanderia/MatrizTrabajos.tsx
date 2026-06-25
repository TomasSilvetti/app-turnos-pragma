"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";

type Item = { id: string; nombre: string };
const key = (prendaId: string, procesoId: string) => `${prendaId}:${procesoId}`;

export function MatrizTrabajos() {
  const [prendas, setPrendas] = useState<Item[]>([]);
  const [procesos, setProcesos] = useState<Item[]>([]);
  const [dur, setDur] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [nuevaPrenda, setNuevaPrenda] = useState("");
  const [nuevoProceso, setNuevoProceso] = useState("");

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/trabajos")
      .then((r) => (r.ok ? r.json() : { prendas: [], procesos: [], duraciones: [] }))
      .then((d: { prendas: Item[]; procesos: Item[]; duraciones: { prendaId: string; procesoId: string; minutos: number }[] }) => {
        setPrendas(d.prendas ?? []);
        setProcesos(d.procesos ?? []);
        const mapa: Record<string, number> = {};
        for (const c of d.duraciones ?? []) mapa[key(c.prendaId, c.procesoId)] = c.minutos;
        setDur(mapa);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => cargar(), [cargar]);

  const guardarCelda = async (prendaId: string, procesoId: string, valor: string) => {
    const minutos = Math.max(0, parseInt(valor, 10) || 0);
    setDur((prev) => {
      const next = { ...prev };
      if (minutos > 0) next[key(prendaId, procesoId)] = minutos;
      else delete next[key(prendaId, procesoId)];
      return next;
    });
    await lavFetch("/api/lavanderia/duraciones", {
      method: "PUT",
      body: JSON.stringify({ prendaId, procesoId, minutos }),
    });
  };

  const agregarPrenda = async () => {
    const nombre = nuevaPrenda.trim();
    if (!nombre) return;
    const res = await lavFetch("/api/lavanderia/prendas", { method: "POST", body: JSON.stringify({ nombre }) });
    if (res.ok) {
      const { prenda } = await res.json();
      setPrendas((p) => [...p, prenda]);
      setNuevaPrenda("");
    }
  };

  const agregarProceso = async () => {
    const nombre = nuevoProceso.trim();
    if (!nombre) return;
    const res = await lavFetch("/api/lavanderia/procesos", { method: "POST", body: JSON.stringify({ nombre }) });
    if (res.ok) {
      const { proceso } = await res.json();
      setProcesos((p) => [...p, proceso]);
      setNuevoProceso("");
    }
  };

  const eliminarPrenda = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la prenda "${nombre}" y sus duraciones?`)) return;
    const res = await lavFetch(`/api/lavanderia/prendas/${id}`, { method: "DELETE" });
    if (res.ok) setPrendas((p) => p.filter((x) => x.id !== id));
  };

  const eliminarProceso = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el proceso "${nombre}" y sus duraciones?`)) return;
    const res = await lavFetch(`/api/lavanderia/procesos/${id}`, { method: "DELETE" });
    if (res.ok) setProcesos((p) => p.filter((x) => x.id !== id));
  };

  const renombrar = async (tipo: "prendas" | "procesos", id: string, actual: string) => {
    const nombre = window.prompt("Nuevo nombre", actual)?.trim();
    if (!nombre || nombre === actual) return;
    const res = await lavFetch(`/api/lavanderia/${tipo}/${id}`, { method: "PATCH", body: JSON.stringify({ nombre }) });
    if (res.ok) {
      const setter = tipo === "prendas" ? setPrendas : setProcesos;
      setter((arr) => arr.map((x) => (x.id === id ? { ...x, nombre } : x)));
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Trabajos</h1>
        <p className="text-sm text-muted-foreground">
          Duración (en minutos) de cada proceso por prenda. La duración de una OT es la suma de los
          procesos de sus prendas.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <input
            value={nuevaPrenda}
            onChange={(e) => setNuevaPrenda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarPrenda()}
            placeholder="Nueva prenda"
            className="h-9 w-44 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <Button size="sm" variant="outline" onClick={agregarPrenda}>
            <Plus /> Prenda
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={nuevoProceso}
            onChange={(e) => setNuevoProceso(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarProceso()}
            placeholder="Nuevo proceso"
            className="h-9 w-44 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <Button size="sm" variant="outline" onClick={agregarProceso}>
            <Plus /> Proceso
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 min-w-44 border-b border-r border-border bg-muted/50 p-2 text-left font-semibold">
                Prenda / Proceso
              </th>
              {procesos.map((proc) => (
                <th key={proc.id} className="min-w-28 border-b border-border p-2 font-semibold">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => renombrar("procesos", proc.id, proc.nombre)} className="hover:text-primary" title="Renombrar">
                      {proc.nombre}
                    </button>
                    <button onClick={() => eliminarProceso(proc.id, proc.nombre)} className="text-muted-foreground hover:text-destructive" title="Eliminar">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              {procesos.length === 0 && (
                <th className="p-3 text-center font-normal text-muted-foreground">Agregá un proceso</th>
              )}
            </tr>
          </thead>
          <tbody>
            {prendas.map((prenda) => (
              <tr key={prenda.id} className="border-b border-border last:border-0">
                <td className="sticky left-0 z-10 border-r border-border bg-card p-2 font-medium">
                  <div className="flex items-center justify-between gap-1">
                    <button onClick={() => renombrar("prendas", prenda.id, prenda.nombre)} className="flex items-center gap-1 text-left hover:text-primary" title="Renombrar">
                      <Pencil className="size-3 shrink-0 text-muted-foreground" />
                      {prenda.nombre}
                    </button>
                    <button onClick={() => eliminarPrenda(prenda.id, prenda.nombre)} className="text-muted-foreground hover:text-destructive" title="Eliminar">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
                {procesos.map((proc) => (
                  <td key={proc.id} className="p-1 text-center">
                    <input
                      type="number"
                      min={0}
                      defaultValue={dur[key(prenda.id, proc.id)] ?? ""}
                      onBlur={(e) => guardarCelda(prenda.id, proc.id, e.target.value)}
                      placeholder="—"
                      className="h-8 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                    />
                  </td>
                ))}
              </tr>
            ))}
            {prendas.length === 0 && (
              <tr>
                <td colSpan={Math.max(1, procesos.length + 1)} className="p-6 text-center text-muted-foreground">
                  Agregá una prenda para empezar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
