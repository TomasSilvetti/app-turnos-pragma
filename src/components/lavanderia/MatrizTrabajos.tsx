"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil, Calculator, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import { RenombrarModal } from "./RenombrarModal";

type Item = { id: string; nombre: string };
type Proceso = Item & { esExtra: boolean };
type Vista = "tiempos" | "precios";
type Edicion = { tipo: "prendas" | "procesos"; id: string; nombre: string };
const key = (prendaId: string, procesoId: string) => `${prendaId}:${procesoId}`;

export function MatrizTrabajos() {
  const [prendas, setPrendas] = useState<Item[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [dur, setDur] = useState<Record<string, number>>({});
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [vista, setVista] = useState<Vista>("tiempos");
  const [cargando, setCargando] = useState(true);
  const [nuevaPrenda, setNuevaPrenda] = useState("");
  const [nuevoProceso, setNuevoProceso] = useState("");
  const [nuevoEsExtra, setNuevoEsExtra] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/trabajos")
      .then((r) => (r.ok ? r.json() : { prendas: [], procesos: [], duraciones: [] }))
      .then((d: { prendas: Item[]; procesos: Proceso[]; duraciones: { prendaId: string; procesoId: string; minutos: number; precio: number }[] }) => {
        setPrendas(d.prendas ?? []);
        setProcesos(d.procesos ?? []);
        const mapaDur: Record<string, number> = {};
        const mapaPre: Record<string, number> = {};
        for (const c of d.duraciones ?? []) {
          mapaDur[key(c.prendaId, c.procesoId)] = c.minutos;
          mapaPre[key(c.prendaId, c.procesoId)] = c.precio;
        }
        setDur(mapaDur);
        setPrecios(mapaPre);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => cargar(), [cargar]);

  const guardarCelda = async (prendaId: string, procesoId: string, valor: string) => {
    const minutos = Math.max(0, parseInt(valor, 10) || 0);
    const k = key(prendaId, procesoId);
    setDur((prev) => {
      const next = { ...prev };
      if (minutos > 0) next[k] = minutos;
      else delete next[k];
      return next;
    });
    // El precio acompaña a la celda: si deja de aplicar, se borra; si recién
    // aparece, arranca en 0.
    setPrecios((prev) => {
      const next = { ...prev };
      if (minutos > 0) {
        if (next[k] === undefined) next[k] = 0;
      } else delete next[k];
      return next;
    });
    await lavFetch("/api/lavanderia/duraciones", {
      method: "PUT",
      body: JSON.stringify({ prendaId, procesoId, minutos }),
    });
  };

  const guardarPrecio = async (prendaId: string, procesoId: string, valor: string) => {
    const precio = Math.max(0, parseInt(valor, 10) || 0);
    setPrecios((prev) => ({ ...prev, [key(prendaId, procesoId)]: precio }));
    await lavFetch("/api/lavanderia/duraciones", {
      method: "PUT",
      body: JSON.stringify({ prendaId, procesoId, precio }),
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
    const res = await lavFetch("/api/lavanderia/procesos", {
      method: "POST",
      body: JSON.stringify({ nombre, esExtra: nuevoEsExtra }),
    });
    if (res.ok) {
      const { proceso } = await res.json();
      setProcesos((p) => [...p, proceso]);
      setNuevoProceso("");
      setNuevoEsExtra(false);
    }
  };

  const guardarProceso = async (id: string, campos: { esExtra?: boolean }) => {
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

  const esTiempos = vista === "tiempos";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trabajos</h1>
          <p className="text-sm text-muted-foreground">
            {esTiempos
              ? "Duración (en minutos) de cada proceso por prenda. La duración de una OT es la suma de los procesos de sus prendas."
              : "Precio (en pesos) de cada proceso por prenda. El monto de una OT es la suma de los procesos de sus prendas."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={recalcularMontos} disabled={recalculando}>
          {recalculando ? <Loader2 className="animate-spin" /> : <Calculator />} Recalcular montos
        </Button>
      </div>

      {/* Toggle Tiempos / Precios */}
      <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5">
        <button
          onClick={() => setVista("tiempos")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 text-sm font-medium transition-colors",
            esTiempos ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Clock className="size-4" /> Tiempos
        </button>
        <button
          onClick={() => setVista("precios")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 text-sm font-medium transition-colors",
            !esTiempos ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <DollarSign className="size-4" /> Precios
        </button>
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
                {procesos.map((proc) => {
                  const k = key(prenda.id, proc.id);
                  const aplica = dur[k] !== undefined;
                  return (
                    <td key={proc.id} className="p-1 text-center">
                      {esTiempos ? (
                        <input
                          key={`t-${k}`}
                          type="number"
                          min={0}
                          defaultValue={dur[k] ?? ""}
                          onBlur={(e) => guardarCelda(prenda.id, proc.id, e.target.value)}
                          placeholder="—"
                          className="h-8 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                        />
                      ) : aplica ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-xs text-muted-foreground">$</span>
                          <input
                            key={`p-${k}`}
                            type="number"
                            min={0}
                            defaultValue={precios[k] ?? ""}
                            onBlur={(e) => guardarPrecio(prenda.id, proc.id, e.target.value)}
                            placeholder="0"
                            className="h-8 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
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

      {!esTiempos && (
        <p className="text-xs text-muted-foreground">
          El precio solo se carga donde el proceso aplica a la prenda (tiene tiempo). Cargá el tiempo en la pestaña “Tiempos” para habilitar la celda.
        </p>
      )}

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
