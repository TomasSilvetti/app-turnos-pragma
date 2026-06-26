"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil, Calculator, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import { RenombrarModal } from "./RenombrarModal";
import { ServicioModal } from "./ServicioModal";

type Item = { id: string; nombre: string };
type Servicio = Item & { procesoIds: string[] };
type Vista = "tiempos" | "precios";
type Edicion = { tipo: "prendas" | "procesos"; id: string; nombre: string };
const key = (a: string, b: string) => `${a}:${b}`;

export function MatrizTrabajos() {
  const [prendas, setPrendas] = useState<Item[]>([]);
  const [procesos, setProcesos] = useState<Item[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tiempos, setTiempos] = useState<Record<string, number>>({}); // prenda:proceso → minutos
  const [precios, setPrecios] = useState<Record<string, number>>({}); // prenda:servicio → precio
  const [vista, setVista] = useState<Vista>("tiempos");
  const [cargando, setCargando] = useState(true);
  const [nuevaPrenda, setNuevaPrenda] = useState("");
  const [nuevoProceso, setNuevoProceso] = useState("");
  const [recalculando, setRecalculando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  // null = modal cerrado; objeto = editar; "nuevo" = crear.
  const [servicioModal, setServicioModal] = useState<Servicio | "nuevo" | null>(null);

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/trabajos")
      .then((r) => (r.ok ? r.json() : { prendas: [], procesos: [], servicios: [], tiempos: [], precios: [] }))
      .then(
        (d: {
          prendas: Item[];
          procesos: Item[];
          servicios: Servicio[];
          tiempos: { prendaId: string; procesoId: string; minutos: number }[];
          precios: { prendaId: string; servicioId: string; precio: number }[];
        }) => {
          setPrendas(d.prendas ?? []);
          setProcesos(d.procesos ?? []);
          setServicios(d.servicios ?? []);
          const mapaT: Record<string, number> = {};
          for (const c of d.tiempos ?? []) mapaT[key(c.prendaId, c.procesoId)] = c.minutos;
          setTiempos(mapaT);
          const mapaP: Record<string, number> = {};
          for (const c of d.precios ?? []) mapaP[key(c.prendaId, c.servicioId)] = c.precio;
          setPrecios(mapaP);
        }
      )
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => cargar(), [cargar]);

  const guardarTiempo = async (prendaId: string, procesoId: string, valor: string) => {
    const minutos = Math.max(0, parseInt(valor, 10) || 0);
    const k = key(prendaId, procesoId);
    setTiempos((prev) => {
      const next = { ...prev };
      if (minutos > 0) next[k] = minutos;
      else delete next[k];
      return next;
    });
    await lavFetch("/api/lavanderia/duraciones", { method: "PUT", body: JSON.stringify({ prendaId, procesoId, minutos }) });
  };

  const guardarPrecio = async (prendaId: string, servicioId: string, valor: string) => {
    const precio = Math.max(0, parseInt(valor, 10) || 0);
    const k = key(prendaId, servicioId);
    setPrecios((prev) => {
      const next = { ...prev };
      if (precio > 0) next[k] = precio;
      else delete next[k];
      return next;
    });
    await lavFetch("/api/lavanderia/precios", { method: "PUT", body: JSON.stringify({ prendaId, servicioId, precio }) });
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

  const guardarServicio = async (data: { id?: string; nombre: string; procesoIds: string[] }) => {
    const url = data.id ? `/api/lavanderia/servicios/${data.id}` : "/api/lavanderia/servicios";
    const res = await lavFetch(url, {
      method: data.id ? "PATCH" : "POST",
      body: JSON.stringify({ nombre: data.nombre, procesoIds: data.procesoIds }),
    });
    if (res.ok) {
      const { servicio } = await res.json();
      setServicios((arr) => (data.id ? arr.map((s) => (s.id === servicio.id ? servicio : s)) : [...arr, servicio]));
      setServicioModal(null);
    }
  };

  const recalcular = async () => {
    if (!confirm("¿Recalcular duración y monto de todas las OTs con la matriz actual?")) return;
    setRecalculando(true);
    try {
      const res = await lavFetch("/api/lavanderia/recalcular-montos", { method: "POST" });
      if (res.ok) {
        const { actualizados } = await res.json();
        alert(`Listo: ${actualizados} OTs recalculadas.`);
      } else alert("No se pudo recalcular.");
    } finally {
      setRecalculando(false);
    }
  };

  const eliminarPrenda = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la prenda "${nombre}"?`)) return;
    const res = await lavFetch(`/api/lavanderia/prendas/${id}`, { method: "DELETE" });
    if (res.ok) setPrendas((p) => p.filter((x) => x.id !== id));
  };

  const eliminarProceso = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el proceso "${nombre}"?`)) return;
    const res = await lavFetch(`/api/lavanderia/procesos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProcesos((p) => p.filter((x) => x.id !== id));
      setServicios((arr) => arr.map((s) => ({ ...s, procesoIds: s.procesoIds.filter((pid) => pid !== id) })));
    }
  };

  const eliminarServicio = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el servicio "${nombre}" y sus precios?`)) return;
    const res = await lavFetch(`/api/lavanderia/servicios/${id}`, { method: "DELETE" });
    if (res.ok) setServicios((arr) => arr.filter((x) => x.id !== id));
  };

  const confirmarRenombre = async (nombre: string) => {
    if (!edicion) return;
    const { tipo, id, nombre: actual } = edicion;
    setEdicion(null);
    if (nombre === actual) return;
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

  const esTiempos = vista === "tiempos";
  const columnas: Item[] = esTiempos ? procesos : servicios;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trabajos</h1>
          <p className="text-sm text-muted-foreground">
            {esTiempos
              ? "Minutos de cada proceso por prenda. La duración de un ítem es la suma de los procesos de sus servicios."
              : "Precio de cada servicio por prenda. El monto de un ítem es la suma de los servicios aplicados."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={recalcular} disabled={recalculando}>
          {recalculando ? <Loader2 className="animate-spin" /> : <Calculator />} Recalcular OTs
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
        {esTiempos ? (
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
        ) : (
          <Button size="sm" variant="outline" onClick={() => setServicioModal("nuevo")}>
            <Plus /> Servicio
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 min-w-44 border-b border-r border-border bg-muted/50 p-2 text-left font-semibold">
                {esTiempos ? "Prenda / Proceso" : "Prenda / Servicio"}
              </th>
              {columnas.map((col) => (
                <th key={col.id} className="min-w-28 border-b border-border p-2 font-semibold">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() =>
                        esTiempos
                          ? setEdicion({ tipo: "procesos", id: col.id, nombre: col.nombre })
                          : setServicioModal(servicios.find((s) => s.id === col.id)!)
                      }
                      className="hover:text-primary"
                      title={esTiempos ? "Renombrar" : "Editar servicio"}
                    >
                      {col.nombre}
                    </button>
                    <button
                      onClick={() => (esTiempos ? eliminarProceso(col.id, col.nombre) : eliminarServicio(col.id, col.nombre))}
                      className="text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              {columnas.length === 0 && (
                <th className="p-3 text-center font-normal text-muted-foreground">
                  {esTiempos ? "Agregá un proceso" : "Agregá un servicio"}
                </th>
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
                {columnas.map((col) => {
                  const k = key(prenda.id, col.id);
                  return (
                    <td key={col.id} className="p-1 text-center">
                      {esTiempos ? (
                        <input
                          key={`t-${k}`}
                          type="number"
                          min={0}
                          defaultValue={tiempos[k] ?? ""}
                          onBlur={(e) => guardarTiempo(prenda.id, col.id, e.target.value)}
                          placeholder="—"
                          className="h-8 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-xs text-muted-foreground">$</span>
                          <input
                            key={`p-${k}`}
                            type="number"
                            min={0}
                            defaultValue={precios[k] ?? ""}
                            onBlur={(e) => guardarPrecio(prenda.id, col.id, e.target.value)}
                            placeholder="0"
                            className="h-8 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {prendas.length === 0 && (
              <tr>
                <td colSpan={Math.max(1, columnas.length + 1)} className="p-6 text-center text-muted-foreground">
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

      {servicioModal !== null && (
        <ServicioModal
          servicio={servicioModal === "nuevo" ? null : servicioModal}
          procesos={procesos}
          onProcesoCreado={(p) => setProcesos((arr) => [...arr, p])}
          onGuardar={guardarServicio}
          onCerrar={() => setServicioModal(null)}
        />
      )}
    </div>
  );
}
