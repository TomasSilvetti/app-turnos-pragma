"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Loader2, Check, Play, AlertTriangle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LavSelect } from "./LavSelect";
import { AvisoWhatsappModal } from "./AvisoWhatsappModal";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import type { OTSnap } from "@/lib/lavanderia/tablero";

type Prenda = { id: string; nombre: string };
type Proceso = { id: string; nombre: string };
type Tiempo = { prendaId: string; procesoId: string; minutos: number };
type ItemEdit = { descripcion: string; cantidad: number; prendaId: string | null; procesoIds: string[] };

export function OTModal({
  ot,
  onCerrar,
  onActualizar,
  admin = false,
  diaEtiqueta,
}: {
  ot: OTSnap;
  onCerrar: () => void;
  onActualizar: () => void;
  admin?: boolean;
  // Día en el que está agendada la OT; se muestra al abrirla desde el buscador,
  // donde la columna del día puede no estar a la vista.
  diaEtiqueta?: string;
}) {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [tiempos, setTiempos] = useState<Map<string, number>>(new Map());
  const [numero, setNumero] = useState(ot.numero ?? "");
  const [cliente, setCliente] = useState(ot.nombreCliente ?? "");
  const [telefono, setTelefono] = useState(ot.telefono ?? "");
  const [domicilio, setDomicilio] = useState(ot.domicilio ?? "");
  const [urgente, setUrgente] = useState(ot.urgente);
  const [fechaNecesaria, setFechaNecesaria] = useState(ot.fechaNecesaria ?? "");
  const [items, setItems] = useState<ItemEdit[]>(
    ot.items.map((it) => ({
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      prendaId: it.prendaId,
      procesoIds: it.procesoIds,
    }))
  );
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Al terminar mostramos el aviso de WhatsApp antes de cerrar el modal.
  const [aviso, setAviso] = useState(false);

  useEffect(() => {
    lavFetch("/api/lavanderia/prendas")
      .then((r) => (r.ok ? r.json() : { prendas: [] }))
      .then((d: { prendas: Prenda[] }) => setPrendas(d.prendas ?? []))
      .catch(() => {});
    lavFetch("/api/lavanderia/procesos")
      .then((r) => (r.ok ? r.json() : { procesos: [], tiempos: [] }))
      .then((d: { procesos: Proceso[]; tiempos: Tiempo[] }) => {
        setProcesos(d.procesos ?? []);
        setTiempos(new Map((d.tiempos ?? []).map((t) => [`${t.prendaId}:${t.procesoId}`, t.minutos])));
      })
      .catch(() => {});
  }, []);

  const minutosUnit = (it: ItemEdit) =>
    it.prendaId ? it.procesoIds.reduce((acc, pid) => acc + (tiempos.get(`${it.prendaId}:${pid}`) ?? 0), 0) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  const setItem = (idx: number, cambios: Partial<ItemEdit>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));

  const elegirPrenda = (idx: number, prendaId: string) => {
    const prenda = prendas.find((p) => p.id === prendaId);
    setItem(idx, { prendaId: prendaId || null, descripcion: prenda?.nombre ?? "" });
  };

  const toggleProceso = (idx: number, procesoId: string) =>
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const tiene = it.procesoIds.includes(procesoId);
        return { ...it, procesoIds: tiene ? it.procesoIds.filter((p) => p !== procesoId) : [...it.procesoIds, procesoId] };
      })
    );

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = await lavFetch(`/api/lavanderia/ots/${ot.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          accion: "editar",
          numero: numero.trim() || null,
          nombreCliente: cliente.trim() || null,
          telefono: telefono.trim() || null,
          domicilio: domicilio.trim() || null,
          urgente,
          fechaNecesaria: fechaNecesaria || null,
          items: items
            .filter((i) => i.prendaId || i.descripcion.trim())
            .map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId, procesoIds: i.procesoIds })),
        }),
      });
      if (res.ok) {
        onActualizar();
        onCerrar();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo guardar");
      }
    } catch {
      setError("Error de red al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const accion = async (accion: "empezar" | "terminar") => {
    // Al terminar mostramos el aviso de WhatsApp al instante y disparamos el
    // PATCH en segundo plano; en prod el round-trip demoraba la aparición del
    // modal. El aviso, al cerrarse, refresca y cierra el detalle.
    if (accion === "terminar") {
      setAviso(true);
      lavFetch(`/api/lavanderia/ots/${ot.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion }),
      }).catch(() => {});
      return;
    }
    setAccionando(true);
    setError(null);
    try {
      const res = await lavFetch(`/api/lavanderia/ots/${ot.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion }),
      });
      if (res.ok) {
        onActualizar();
        onCerrar();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo actualizar");
      }
    } catch {
      setError("Error de red");
    } finally {
      setAccionando(false);
    }
  };

  const eliminar = async () => {
    setEliminando(true);
    setError(null);
    try {
      const res = await lavFetch(`/api/lavanderia/ots/${ot.id}`, { method: "DELETE" });
      if (res.ok) {
        onActualizar();
        onCerrar();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo eliminar");
        setConfirmandoEliminar(false);
      }
    } catch {
      setError("Error de red al eliminar");
      setConfirmandoEliminar(false);
    } finally {
      setEliminando(false);
    }
  };

  if (aviso) {
    return (
      <AvisoWhatsappModal
        ot={{ ...ot, numero: numero.trim() || null, nombreCliente: cliente.trim() || null, telefono: telefono.trim() || null }}
        onCerrar={() => {
          onActualizar();
          onCerrar();
        }}
      />
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate font-semibold">{ot.numero ? `OT ${ot.numero}` : "Orden de trabajo"}</h3>
            {diaEtiqueta && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                {diaEtiqueta}
              </span>
            )}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <Campo label="N° OT" value={numero} onChange={setNumero} />
            <Campo label="Teléfono" value={telefono} onChange={setTelefono} />
            <div className="col-span-2">
              <Campo label="Cliente" value={cliente} onChange={setCliente} />
            </div>
            <div className="col-span-2">
              <Campo label="Domicilio" value={domicilio} onChange={setDomicilio} />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-2.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
              <span className="inline-flex items-center gap-1">
                <Flame className="size-4 text-red-500" /> Urgente
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Necesaria para (opcional)</span>
              <input
                type="date"
                value={fechaNecesaria}
                onChange={(e) => setFechaNecesaria(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
              />
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                Se ubica el último día laborable antes de esta fecha. Al guardar se reubica sola.
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Prendas / procesos</p>
            {items.map((it, idx) => {
              const dur = minutosUnit(it);
              const sinTiempos = Boolean(it.prendaId) && it.procesoIds.length > 0 && dur === 0;
              return (
              <div key={idx} className="space-y-2 rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <LavSelect
                    className="flex-1"
                    value={it.prendaId ?? ""}
                    onChange={(v) => elegirPrenda(idx, v)}
                    aria-label="Prenda"
                    placeholder="Elegí la prenda…"
                    options={prendas.map((p) => ({ value: p.id, label: p.nombre }))}
                  />
                  <input
                    type="number"
                    min={1}
                    value={it.cantidad}
                    onChange={(e) => setItem(idx, { cantidad: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="h-9 w-14 rounded-md border border-border bg-background text-center text-sm outline-none focus:border-primary"
                    aria-label="Cantidad"
                  />
                  <button onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Procesos como chips toggle */}
                <div className="flex flex-wrap gap-1.5">
                  {procesos.map((p) => {
                    const activo = it.procesoIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProceso(idx, p.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          activo
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {p.nombre}
                      </button>
                    );
                  })}
                  {procesos.length === 0 && <span className="text-[11px] text-muted-foreground">No hay procesos configurados</span>}
                </div>

                {!it.prendaId ? (
                  <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3" /> Sin prenda no se calcula duración
                  </p>
                ) : it.procesoIds.length === 0 ? (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                    <AlertTriangle className="size-3" /> Marcá al menos un proceso para calcular la duración
                  </p>
                ) : sinTiempos ? (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                    <AlertTriangle className="size-3" /> Sin tiempo cargado para esta prenda/proceso
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {dur} min × {it.cantidad} = <span className="font-medium text-foreground/80">{dur * it.cantidad} min</span>
                  </p>
                )}
              </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((arr) => [...arr, { descripcion: "", cantidad: 1, prendaId: null, procesoIds: [] }])}
            >
              <Plus /> Agregar item
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {admin &&
            (confirmandoEliminar ? (
              <span className="inline-flex items-center gap-2">
                <Button variant="destructive" onClick={eliminar} disabled={eliminando}>
                  {eliminando ? <Loader2 className="animate-spin" /> : <Trash2 />} Confirmar
                </Button>
                <Button variant="outline" onClick={() => setConfirmandoEliminar(false)} disabled={eliminando}>
                  No
                </Button>
              </span>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmandoEliminar(true)}
                disabled={guardando || accionando}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 /> Eliminar
              </Button>
            ))}
          {ot.estado === "pendiente" && ot.puedeEmpezar && (
            <Button
              onClick={() => accion("empezar")}
              disabled={accionando}
              className="border-0 bg-gradient-to-br from-sky-500 to-indigo-500 text-white hover:from-sky-600 hover:to-indigo-600"
            >
              {accionando ? <Loader2 className="animate-spin" /> : <Play />} Empezar
            </Button>
          )}
          {ot.estado === "en_progreso" && (
            <Button
              onClick={() => accion("terminar")}
              disabled={accionando}
              className="border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
            >
              {accionando ? <Loader2 className="animate-spin" /> : <Check />} Terminar
            </Button>
          )}
          <span className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando || items.length === 0}>
              {guardando ? <Loader2 className="animate-spin" /> : <Check />} Guardar
            </Button>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
