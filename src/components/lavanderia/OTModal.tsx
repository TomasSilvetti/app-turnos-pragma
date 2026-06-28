"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Loader2, Check, Play, AlertTriangle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LavSelect } from "./LavSelect";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";
import type { OTSnap } from "@/lib/lavanderia/tablero";

type Prenda = { id: string; nombre: string };
type Servicio = { id: string; nombre: string };
type ItemEdit = { descripcion: string; cantidad: number; prendaId: string | null; servicioIds: string[] };

export function OTModal({
  ot,
  onCerrar,
  onActualizar,
}: {
  ot: OTSnap;
  onCerrar: () => void;
  onActualizar: () => void;
}) {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
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
      servicioIds: it.servicioIds,
    }))
  );
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lavFetch("/api/lavanderia/prendas")
      .then((r) => (r.ok ? r.json() : { prendas: [] }))
      .then((d: { prendas: Prenda[] }) => setPrendas(d.prendas ?? []))
      .catch(() => {});
    lavFetch("/api/lavanderia/servicios")
      .then((r) => (r.ok ? r.json() : { servicios: [] }))
      .then((d: { servicios: Servicio[] }) => setServicios(d.servicios ?? []))
      .catch(() => {});
  }, []);

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

  const toggleServicio = (idx: number, servicioId: string) =>
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const tiene = it.servicioIds.includes(servicioId);
        return { ...it, servicioIds: tiene ? it.servicioIds.filter((s) => s !== servicioId) : [...it.servicioIds, servicioId] };
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
            .map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId, servicioIds: i.servicioIds })),
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
          <h3 className="font-semibold">{ot.numero ? `OT ${ot.numero}` : "Orden de trabajo"}</h3>
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
            <p className="text-sm font-semibold">Prendas / servicios</p>
            {items.map((it, idx) => (
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

                {/* Servicios como chips toggle */}
                <div className="flex flex-wrap gap-1.5">
                  {servicios.map((s) => {
                    const activo = it.servicioIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleServicio(idx, s.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          activo
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {s.nombre}
                      </button>
                    );
                  })}
                  {servicios.length === 0 && <span className="text-[11px] text-muted-foreground">No hay servicios configurados</span>}
                </div>

                {!it.prendaId && (
                  <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3" /> Sin prenda no se calcula duración
                  </p>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((arr) => [...arr, { descripcion: "", cantidad: 1, prendaId: null, servicioIds: [] }])}
            >
              <Plus /> Agregar item
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
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
