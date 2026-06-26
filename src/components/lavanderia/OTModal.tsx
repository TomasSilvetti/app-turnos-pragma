"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Loader2, Check, Play, Calculator, AlertTriangle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LavSelect } from "./LavSelect";
import { lavFetch } from "@/lib/lavanderia/client";
import { formatoDuracion } from "@/lib/lavanderia/timeline";
import type { OTSnap } from "@/lib/lavanderia/tablero";

type Prenda = { id: string; nombre: string };
type ItemEdit = { descripcion: string; cantidad: number; precio: number | null; prendaId: string | null };

const formatoMonto = (value: number) =>
  "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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
  const [numero, setNumero] = useState(ot.numero ?? "");
  const [cliente, setCliente] = useState(ot.nombreCliente ?? "");
  const [telefono, setTelefono] = useState(ot.telefono ?? "");
  const [domicilio, setDomicilio] = useState(ot.domicilio ?? "");
  const [urgente, setUrgente] = useState(ot.urgente);
  const [fechaNecesaria, setFechaNecesaria] = useState(ot.fechaNecesaria ?? "");
  const [items, setItems] = useState<ItemEdit[]>(
    ot.items.map((it) => ({ descripcion: it.descripcion, cantidad: it.cantidad, precio: it.monto, prendaId: it.prendaId }))
  );
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lavFetch("/api/lavanderia/prendas")
      .then((r) => (r.ok ? r.json() : { prendas: [] }))
      .then((d: { prendas: Prenda[] }) => setPrendas(d.prendas ?? []))
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

  const montoTotal = items.reduce((acc, it) => acc + (it.precio ?? 0), 0);

  const recalcularMontos = async () => {
    const res = await lavFetch("/api/lavanderia/calcular", {
      method: "POST",
      body: JSON.stringify({ items: items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId })) }),
    });
    if (res.ok) {
      const data: { items: { monto: number }[] } = await res.json();
      setItems((arr) => arr.map((it, i) => ({ ...it, precio: data.items[i]?.monto ?? it.precio })));
    }
  };

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
            .filter((i) => i.descripcion.trim())
            .map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId, monto: i.precio })),
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Prendas / servicios</p>
              <Button size="xs" variant="outline" onClick={recalcularMontos}>
                <Calculator className="size-3.5" /> Recalcular montos
              </Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={it.descripcion}
                    onChange={(e) => setItem(idx, { descripcion: e.target.value })}
                    className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                    placeholder="Descripción"
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
                <div className="flex items-center gap-2">
                  <LavSelect
                    className="flex-1"
                    value={it.prendaId ?? ""}
                    onChange={(v) => setItem(idx, { prendaId: v || null })}
                    aria-label="Prenda"
                    options={[
                      { value: "", label: "— Sin prenda —" },
                      ...prendas.map((p) => ({ value: p.id, label: p.nombre })),
                    ]}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={0}
                      value={it.precio ?? ""}
                      onChange={(e) => setItem(idx, { precio: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      placeholder="Monto"
                      className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                      aria-label="Monto"
                    />
                  </div>
                </div>
                {!it.prendaId && (
                  <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3" /> Sin prenda no se calcula duración
                  </p>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((arr) => [...arr, { descripcion: "", cantidad: 1, precio: null, prendaId: null }])}
              >
                <Plus /> Agregar item
              </Button>
              <span className="text-sm font-semibold tabular-nums">Total: {formatoMonto(montoTotal)}</span>
            </div>
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
