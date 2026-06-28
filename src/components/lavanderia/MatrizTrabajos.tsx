"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil, Calculator, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import { RenombrarModal } from "./RenombrarModal";
import { ServicioModal } from "./ServicioModal";

type Item = { id: string; nombre: string; incompleta?: boolean };
type Servicio = Item & { procesoIds: string[] };
type Edicion = { tipo: "prendas" | "procesos"; id: string; nombre: string };
const key = (a: string, b: string) => `${a}:${b}`;

export function MatrizTrabajos() {
  const [prendas, setPrendas] = useState<Item[]>([]);
  const [procesos, setProcesos] = useState<Item[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tiempos, setTiempos] = useState<Record<string, number>>({}); // prenda:proceso → minutos
  const [cargando, setCargando] = useState(true);
  const [nuevaPrenda, setNuevaPrenda] = useState("");
  const [nuevoProceso, setNuevoProceso] = useState("");
  const [recalculando, setRecalculando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  // null = modal cerrado; objeto = editar; "nuevo" = crear.
  const [servicioModal, setServicioModal] = useState<Servicio | "nuevo" | null>(null);

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/trabajos")
      .then((r) => (r.ok ? r.json() : { prendas: [], procesos: [], servicios: [], tiempos: [] }))
      .then(
        (d: {
          prendas: Item[];
          procesos: Item[];
          servicios: Servicio[];
          tiempos: { prendaId: string; procesoId: string; minutos: number }[];
        }) => {
          setPrendas(d.prendas ?? []);
          setProcesos(d.procesos ?? []);
          setServicios(d.servicios ?? []);
          const mapaT: Record<string, number> = {};
          for (const c of d.tiempos ?? []) mapaT[key(c.prendaId, c.procesoId)] = c.minutos;
          setTiempos(mapaT);
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
    // Cargarle minutos a una prenda nueva la deja de marcar como incompleta (lo hace el backend).
    if (minutos > 0) setPrendas((arr) => arr.map((p) => (p.id === prendaId && p.incompleta ? { ...p, incompleta: false } : p)));
    await lavFetch("/api/lavanderia/duraciones", { method: "PUT", body: JSON.stringify({ prendaId, procesoId, minutos }) });
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
    if (!confirm("¿Recalcular la duración de todas las OTs con la matriz actual?")) return;
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
    if (!confirm(`¿Eliminar el servicio "${nombre}"?`)) return;
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trabajos</h1>
          <p className="text-sm text-muted-foreground">
            Minutos de cada proceso por prenda. La duración de un ítem es la suma de los procesos de sus servicios.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={recalcular} disabled={recalculando}>
          {recalculando ? <Loader2 className="animate-spin" /> : <Calculator />} Recalcular OTs
        </Button>
      </div>

      {/* Prendas nuevas cargadas desde la app que aún no tienen minutos */}
      {prendas.some((p) => p.incompleta) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Prendas nuevas sin minutos cargados</p>
            <p className="text-[13px] leading-snug">
              Se dieron de alta desde la carga por foto. Completá sus tiempos en la matriz:{" "}
              <span className="font-medium">{prendas.filter((p) => p.incompleta).map((p) => p.nombre).join(", ")}</span>.
            </p>
          </div>
        </div>
      )}

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
              {procesos.map((col) => (
                <th key={col.id} className="min-w-28 border-b border-border p-2 font-semibold">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setEdicion({ tipo: "procesos", id: col.id, nombre: col.nombre })}
                      className="hover:text-primary"
                      title="Renombrar"
                    >
                      {col.nombre}
                    </button>
                    <button
                      onClick={() => eliminarProceso(col.id, col.nombre)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
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
              <tr key={prenda.id} className={cn("border-b border-border last:border-0", prenda.incompleta && "bg-amber-50/60 dark:bg-amber-500/10")}>
                <td className={cn("sticky left-0 z-10 border-r border-border p-2 font-medium", prenda.incompleta ? "bg-amber-50 dark:bg-amber-500/10" : "bg-card")}>
                  <div className="flex items-center justify-between gap-1">
                    <button onClick={() => setEdicion({ tipo: "prendas", id: prenda.id, nombre: prenda.nombre })} className="flex items-center gap-1 text-left hover:text-primary" title="Renombrar">
                      <Pencil className="size-3 shrink-0 text-muted-foreground" />
                      {prenda.nombre}
                      {prenda.incompleta && (
                        <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/25 dark:text-amber-200" title="Prenda nueva: cargá los minutos">
                          <AlertTriangle className="size-2.5" /> nueva
                        </span>
                      )}
                    </button>
                    <button onClick={() => eliminarPrenda(prenda.id, prenda.nombre)} className="text-muted-foreground hover:text-destructive" title="Eliminar">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
                {procesos.map((col) => {
                  const k = key(prenda.id, col.id);
                  return (
                    <td key={col.id} className="p-1 text-center">
                      <input
                        key={`t-${k}`}
                        type="number"
                        min={0}
                        defaultValue={tiempos[k] ?? ""}
                        onBlur={(e) => guardarTiempo(prenda.id, col.id, e.target.value)}
                        placeholder="—"
                        className="h-8 w-16 rounded-md border border-transparent bg-transparent text-center outline-none hover:border-border focus:border-primary"
                      />
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

      {/* Servicios: agrupan procesos y se aplican a los ítems para calcular su duración. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Servicios</h2>
            <p className="text-sm text-muted-foreground">
              Cada servicio agrupa procesos. Al aplicarlo a un ítem suma los minutos de esos procesos.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setServicioModal("nuevo")}>
            <Plus /> Servicio
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {servicios.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-sm">
              <button onClick={() => setServicioModal(s)} className="font-medium hover:text-primary" title="Editar servicio">
                {s.nombre}
              </button>
              <button
                onClick={() => eliminarServicio(s.id, s.nombre)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                title="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
          {servicios.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay servicios. Agregá uno.</p>}
        </div>
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
