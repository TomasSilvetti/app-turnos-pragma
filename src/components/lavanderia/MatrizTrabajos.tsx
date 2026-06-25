"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { RenombrarModal } from "./RenombrarModal";

type Item = { id: string; nombre: string };
type Proceso = Item & { precio: number; esExtra: boolean };
type Edicion = { tipo: "prendas" | "procesos"; id: string; nombre: string };
const key = (prendaId: string, procesoId: string) => `${prendaId}:${procesoId}`;

export function MatrizTrabajos() {
  const [prendas, setPrendas] = useState<Item[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [dur, setDur] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [nuevaPrenda, setNuevaPrenda] = useState("");
  const [nuevoProceso, setNuevoProceso] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevoEsExtra, setNuevoEsExtra] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/trabajos")
      .then((r) => (r.ok ? r.json() : { prendas: [], procesos: [], duraciones: [] }))
      .then((d: { prendas: Item[]; procesos: Proceso[]; duraciones: { prendaId: string; procesoId: string; minutos: number }[] }) => {
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
    const precio = Math.max(0, parseInt(nuevoPrecio, 10) || 0);
    const res = await lavFetch("/api/lavanderia/procesos", {
      method: "POST",
      body: JSON.stringify({ nombre, precio, esExtra: nuevoEsExtra }),
    });
    if (res.ok) {
      const { proceso } = await res.json();
      setProcesos((p) => [...p, proceso]);
      setNuevoProceso("");
      setNuevoPrecio("");
      setNuevoEsExtra(false);
    }
  };

  const guardarProceso = async (id: string, campos: { precio?: number; esExtra?: boolean }) => {
    setProcesos((p) => p.map((x) => (x.id === id ? { ...x, ...campos } : x)));
    await lavFetch(`/api/lavanderia/procesos/${id}`, { method: "PATCH", body: JSON.stringify(campos) });
  };

  const recalcularMontos = async () => {
    if (!confirm("¿Recalcular el monto de todas las OTs con los precios actuales?")) return;
    setRecalculando(true);
    try {
      const res = await lavFetch("/api/lavanderia/recalcular-montos", { method: "POST" });
      if (res.ok) {
        const { actualizados, total } = await res.json();
        alert(`Listo: ${actualizados} de ${total} items actualizados.`);
      } else {
        alert("No se pudo recalcular.");
      }
    } finally {
      setRecalculando(false);
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

  const confirmarRenombre = async (nombre: string) => {
    if (!edicion) return;
    const { tipo, id, nombre: actual } = edicion;
    setEdicion(null);
    if (nombre === actual) return;
    const res = await lavFetch(`/api/lavanderia/${tipo}/${id}`, { method: "PATCH", body: JSON.stringify({ nombre }) });
    if (res.ok) {
      if (tipo === "prendas") {
        setPrendas((arr) => arr.map((x) => (x.id === id ? { ...x, nombre } : x)));
      } else {
        setProcesos((arr) => arr.map((x) => (x.id === id ? { ...x, nombre } : x)));
      }
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trabajos</h1>
          <p className="text-sm text-muted-foreground">
            Duración (en minutos) de cada proceso por prenda y precio de cada servicio. La duración y
            el monto de una OT son la suma de los procesos de sus prendas.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={recalcularMontos} disabled={recalculando}>
          {recalculando ? <Loader2 className="animate-spin" /> : <Calculator />} Recalcular montos
        </Button>
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
          <input
            value={nuevoPrecio}
            onChange={(e) => setNuevoPrecio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarProceso()}
            type="number"
            min={0}
            placeholder="$ precio"
            className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={nuevoEsExtra}
              onChange={(e) => setNuevoEsExtra(e.target.checked)}
              className="size-4 rounded border-border"
            />
            Extra
          </label>
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
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEdicion({ tipo: "procesos", id: proc.id, nombre: proc.nombre })} className="hover:text-primary" title="Renombrar">
                        {proc.nombre}
                      </button>
                      <button onClick={() => eliminarProceso(proc.id, proc.nombre)} className="text-muted-foreground hover:text-destructive" title="Eliminar">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <span>$</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={proc.precio || ""}
                        onBlur={(e) => guardarProceso(proc.id, { precio: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        placeholder="0"
                        className="h-7 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={proc.esExtra}
                        onChange={(e) => guardarProceso(proc.id, { esExtra: e.target.checked })}
                        className="size-3.5 rounded border-border"
                      />
                      Extra
                    </label>
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
                    <button onClick={() => setEdicion({ tipo: "prendas", id: prenda.id, nombre: prenda.nombre })} className="flex items-center gap-1 text-left hover:text-primary" title="Renombrar">
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

      <RenombrarModal
        open={edicion !== null}
        titulo={edicion?.tipo === "prendas" ? "Renombrar prenda" : "Renombrar proceso"}
        valorInicial={edicion?.nombre ?? ""}
        onConfirmar={confirmarRenombre}
        onCerrar={() => setEdicion(null)}
      />
    </div>
  );
}
