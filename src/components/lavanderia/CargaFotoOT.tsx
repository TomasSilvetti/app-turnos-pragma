"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Check, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";

type Prenda = { id: string; nombre: string };
type ItemPreview = { descripcion: string; cantidad: number; prendaId: string | null };
type OTPreview = {
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  total: number | null;
  fechaTicket: string | null;
  items: { descripcion: string; cantidad: number; prendaId: string | null; prendaNombre: string | null }[];
};

type Estado = "inicial" | "procesando" | "preview" | "creando" | "creada";

export function CargaFotoOT() {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [ot, setOt] = useState<OTPreview | null>(null);
  const [items, setItems] = useState<ItemPreview[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lavFetch("/api/lavanderia/prendas")
      .then((r) => (r.ok ? r.json() : { prendas: [] }))
      .then((d: { prendas: Prenda[] }) => setPrendas(d.prendas ?? []))
      .catch(() => {});
  }, []);

  const reiniciar = useCallback(() => {
    setEstado("inicial");
    setError(null);
    setOt(null);
    setItems([]);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEstado("procesando");
    setError(null);
    const fd = new FormData();
    fd.append("foto", file);
    try {
      const res = await lavFetch("/api/lavanderia/ots/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar la foto");
        setEstado("inicial");
        return;
      }
      const extraida: OTPreview = data.ot;
      setOt(extraida);
      setItems(extraida.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId })));
      setEstado("preview");
    } catch {
      setError("Error de red al procesar la foto");
      setEstado("inicial");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmar = async () => {
    if (!ot) return;
    setEstado("creando");
    try {
      const res = await lavFetch("/api/lavanderia/ots", {
        method: "POST",
        body: JSON.stringify({
          numero: ot.numero,
          nombreCliente: ot.nombreCliente,
          telefono: ot.telefono,
          domicilio: ot.domicilio,
          total: ot.total,
          fechaTicket: ot.fechaTicket,
          items: items.filter((i) => i.descripcion.trim()),
          datosIA: ot,
        }),
      });
      if (res.ok) setEstado("creada");
      else {
        const d = await res.json();
        setError(d.error || "No se pudo crear la OT");
        setEstado("preview");
      }
    } catch {
      setError("Error de red al crear la OT");
      setEstado("preview");
    }
  };

  const setItem = (idx: number, cambios: Partial<ItemPreview>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));

  if (estado === "creada") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
          <Check className="size-7" />
        </div>
        <p className="mb-6 font-medium">OT cargada al tablero</p>
        <Button onClick={reiniciar} size="lg">
          <Camera /> Cargar otra
        </Button>
      </div>
    );
  }

  if (estado === "preview" && ot) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">
        <h1 className="text-lg font-bold">Revisá la OT</h1>

        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          <Campo label="N° OT" value={ot.numero ?? ""} onChange={(v) => setOt({ ...ot, numero: v })} />
          <Campo label="Cliente" value={ot.nombreCliente ?? ""} onChange={(v) => setOt({ ...ot, nombreCliente: v })} />
          <Campo label="Teléfono" value={ot.telefono ?? ""} onChange={(v) => setOt({ ...ot, telefono: v })} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Prendas / servicios</p>
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
                />
                <button onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <select
                value={it.prendaId ?? ""}
                onChange={(e) => setItem(idx, { prendaId: e.target.value || null })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
              >
                <option value="">— Sin prenda (a revisar) —</option>
                {prendas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
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
            onClick={() => setItems((arr) => [...arr, { descripcion: "", cantidad: 1, prendaId: null }])}
          >
            <Plus /> Agregar item
          </Button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={reiniciar} disabled={estado !== "preview"}>
            <X /> Descartar
          </Button>
          <Button className="flex-1" onClick={confirmar} disabled={(estado as Estado) === "creando" || items.length === 0}>
            {(estado as Estado) === "creando" ? <Loader2 className="animate-spin" /> : <Check />} Cargar al tablero
          </Button>
        </div>
      </div>
    );
  }

  // Estado inicial / procesando
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="mb-1 text-xl font-bold">Cargar OT</h1>
      <p className="mb-8 text-sm text-muted-foreground">Sacá una foto del ticket para cargarlo al tablero.</p>

      {error && <p className="mb-4 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFoto} className="hidden" id="foto-ot" />
      <Button asChild size="lg" disabled={estado === "procesando"}>
        <label htmlFor="foto-ot" className="cursor-pointer">
          {estado === "procesando" ? <Loader2 className="animate-spin" /> : <Camera />}
          {estado === "procesando" ? "Procesando…" : "Tomar foto"}
        </label>
      </Button>
    </div>
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
