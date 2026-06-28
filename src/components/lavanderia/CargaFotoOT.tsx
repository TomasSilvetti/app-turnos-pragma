"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Check, X, Plus, Trash2, AlertTriangle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LavSelect } from "./LavSelect";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type Prenda = { id: string; nombre: string };
type Servicio = { id: string; nombre: string };
type ItemPreview = { descripcion: string; cantidad: number; prendaId: string | null; servicioIds: string[]; esNueva: boolean };
type OTPreview = {
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  fechaTicket: string | null;
  urgente: boolean;
  fechaNecesaria: string | null;
  items: { descripcion: string; cantidad: number; prendaId: string | null; prendaNombre: string | null; servicioIds: string[]; esNueva: boolean }[];
};

type Estado = "inicial" | "procesando" | "preview" | "creando" | "creada";

export function CargaFotoOT() {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [ot, setOt] = useState<OTPreview | null>(null);
  const [items, setItems] = useState<ItemPreview[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setItems(extraida.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId, servicioIds: i.servicioIds ?? [], esNueva: i.esNueva === true })));
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
          fechaTicket: ot.fechaTicket,
          urgente: ot.urgente,
          fechaNecesaria: ot.fechaNecesaria,
          items: items.filter((i) => i.prendaId || i.descripcion.trim()),
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

  const elegirPrenda = (idx: number, prendaId: string) => {
    const prenda = prendas.find((p) => p.id === prendaId);
    // Elegir una prenda existente resuelve el ítem: deja de ser "nueva".
    setItem(idx, { prendaId: prendaId || null, descripcion: prenda?.nombre ?? "", esNueva: false });
  };

  // Una prenda nueva ("varios") debe renombrarse antes de cargar la OT.
  const nombreNuevaPendiente = (it: ItemPreview) => {
    if (!it.esNueva || it.prendaId) return false;
    const n = normalizar(it.descripcion);
    return n === "" || /\bvarios?\b/.test(n);
  };
  const hayNuevaSinResolver = items.some(nombreNuevaPendiente);

  const toggleServicio = (idx: number, servicioId: string) =>
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const tiene = it.servicioIds.includes(servicioId);
        return { ...it, servicioIds: tiene ? it.servicioIds.filter((s) => s !== servicioId) : [...it.servicioIds, servicioId] };
      })
    );

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

        <div className="space-y-2 rounded-lg border border-border p-2.5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={ot.urgente}
              onChange={(e) => setOt({ ...ot, urgente: e.target.checked })}
            />
            <span className="inline-flex items-center gap-1">
              <Flame className="size-4 text-red-500" /> Urgente — va primero hoy
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Necesaria para (opcional)</span>
            <input
              type="date"
              value={ot.fechaNecesaria ?? ""}
              onChange={(e) => setOt({ ...ot, fechaNecesaria: e.target.value || null })}
              className="mt-0.5 h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            />
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Se ubica primero el último día laborable antes de esta fecha.
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Prendas / servicios</p>
          {items.map((it, idx) => {
            const nueva = it.esNueva && !it.prendaId;
            const sinInterpretar = !it.prendaId && !it.esNueva;
            return (
            <div
              key={idx}
              className={cn(
                "space-y-2 rounded-lg border p-2.5",
                nueva
                  ? "border-amber-400 bg-amber-50/60 dark:border-amber-500/60 dark:bg-amber-500/10"
                  : sinInterpretar
                    ? "border-yellow-400 bg-yellow-50/60 dark:border-yellow-500/60 dark:bg-yellow-500/10"
                    : "border-border"
              )}
            >
              {nueva && (
                <div className="space-y-1.5 rounded-md bg-amber-100/70 p-2 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    <AlertTriangle className="size-3.5 shrink-0" /> Prenda nueva (decía “varios”).
                  </p>
                  <p className="text-[11px] leading-tight">
                    Escribí el nombre real. Se va a dar de alta y el admin recibe el aviso para cargarle los minutos.
                  </p>
                  <input
                    value={it.descripcion}
                    onChange={(e) => setItem(idx, { descripcion: e.target.value })}
                    placeholder="Nombre de la prenda nueva"
                    className="h-9 w-full rounded-md border border-amber-300 bg-background px-2 text-sm outline-none focus:border-amber-500 dark:border-amber-500/50"
                    aria-label="Nombre de la prenda nueva"
                  />
                </div>
              )}
              {sinInterpretar && (
                <p className="flex items-start gap-1.5 rounded-md bg-yellow-100/70 p-2 text-[11px] leading-tight text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    No se pudo interpretar {it.descripcion ? <>“{it.descripcion}”</> : "este ítem"}. Elegí la prenda a mano.
                  </span>
                </p>
              )}
              <div className="flex items-center gap-2">
                <LavSelect
                  className="flex-1"
                  value={it.prendaId ?? ""}
                  onChange={(v) => elegirPrenda(idx, v)}
                  aria-label="Prenda"
                  placeholder={nueva ? "…o elegí una existente" : "Elegí la prenda…"}
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
                        activo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {s.nombre}
                    </button>
                  );
                })}
                {servicios.length === 0 && <span className="text-[11px] text-muted-foreground">No hay servicios configurados</span>}
              </div>
            </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setItems((arr) => [...arr, { descripcion: "", cantidad: 1, prendaId: null, servicioIds: [], esNueva: false }])}
          >
            <Plus /> Agregar item
          </Button>
        </div>

        {hayNuevaSinResolver && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-3.5" /> Reemplazá el nombre “varios” por la prenda real antes de cargar.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={reiniciar} disabled={estado !== "preview"}>
            <X /> Descartar
          </Button>
          <Button className="flex-1" onClick={confirmar} disabled={(estado as Estado) === "creando" || items.length === 0 || hayNuevaSinResolver}>
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
