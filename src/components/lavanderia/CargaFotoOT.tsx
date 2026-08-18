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
type Proceso = { id: string; nombre: string };
type Tiempo = { prendaId: string; procesoId: string; minutos: number };
type ItemPreview = {
  descripcion: string;
  cantidad: number;
  prendaId: string | null;
  procesoIds: string[];
  esNueva: boolean;
  precioTotal: number | null;
};
type OTPreview = {
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  fechaTicket: string | null;
  urgente: boolean;
  fechaNecesaria: string | null;
  totalTicket: number | null;
  formaPago: string | null;
  items: {
    descripcion: string;
    cantidad: number;
    prendaId: string | null;
    prendaNombre: string | null;
    procesoIds: string[];
    esNueva: boolean;
    precioTotal: number | null;
  }[];
};

type Estado = "inicial" | "procesando" | "preview" | "creando" | "creada";

export function CargaFotoOT() {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [tiempos, setTiempos] = useState<Map<string, number>>(new Map()); // prenda:proceso → minutos
  const [ot, setOt] = useState<OTPreview | null>(null);
  const [items, setItems] = useState<ItemPreview[]>([]);
  const [confirmarDuplicada, setConfirmarDuplicada] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Duración por unidad de un item (suma de minutos de sus procesos para la prenda).
  const minutosUnit = useCallback(
    (it: ItemPreview) =>
      it.prendaId ? it.procesoIds.reduce((acc, pid) => acc + (tiempos.get(`${it.prendaId}:${pid}`) ?? 0), 0) : 0,
    [tiempos]
  );

  const reiniciar = useCallback(() => {
    setEstado("inicial");
    setError(null);
    setOt(null);
    setItems([]);
    setConfirmarDuplicada(false);
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
      setItems(extraida.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, prendaId: i.prendaId, procesoIds: i.procesoIds ?? [], esNueva: i.esNueva === true, precioTotal: i.precioTotal ?? null })));
      setEstado("preview");
    } catch {
      setError("Error de red al procesar la foto");
      setEstado("inicial");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // force: saltea el chequeo de OT duplicada (N° ya cargado en el tablero).
  const confirmar = async (force = false) => {
    if (!ot) return;
    setConfirmarDuplicada(false);
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
          totalTicket: ot.totalTicket,
          formaPago: ot.formaPago,
          items: items.filter((i) => i.prendaId || i.descripcion.trim()),
          datosIA: ot,
          force,
        }),
      });
      if (res.ok) {
        setEstado("creada");
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.duplicada) {
        setConfirmarDuplicada(true);
        setEstado("preview");
        return;
      }
      setError(d.error || "No se pudo crear la OT");
      setEstado("preview");
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

  // Checksum del ticket: si ningún renglón trajo importe no hay nada que comparar.
  const conPrecio = items.filter((i) => i.precioTotal !== null);
  const sumaItems = conPrecio.length
    ? Math.round(conPrecio.reduce((acc, i) => acc + (i.precioTotal ?? 0), 0) * 100) / 100
    : null;
  const totalCalza =
    ot?.totalTicket == null || sumaItems === null ? null : Math.abs(ot.totalTicket - sumaItems) < 0.01;

  const toggleProceso = (idx: number, procesoId: string) =>
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const tiene = it.procesoIds.includes(procesoId);
        return { ...it, procesoIds: tiene ? it.procesoIds.filter((p) => p !== procesoId) : [...it.procesoIds, procesoId] };
      })
    );

  // Items que la IA no pudo cargar bien: prenda existente pero sin tiempos en la
  // matriz para los procesos elegidos (o sin procesos). No bloquean la carga, pero
  // avisan al empleado. Los "varios" sin renombrar se controlan aparte.
  const itemsSinTiempos = items.filter(
    (it) => it.prendaId && !nombreNuevaPendiente(it) && minutosUnit(it) === 0
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

        {(itemsSinTiempos.length > 0 || items.some((it) => !it.prendaId && !it.esNueva)) && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-400 bg-yellow-50/70 p-2.5 text-[13px] leading-snug text-yellow-800 dark:border-yellow-500/60 dark:bg-yellow-500/10 dark:text-yellow-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium">Revisá estos ítems antes de cargar</p>
              <ul className="list-disc pl-4">
                {items.some((it) => !it.prendaId && !it.esNueva) && <li>Hay prendas que no se reconocieron: elegilas a mano.</li>}
                {itemsSinTiempos.length > 0 && (
                  <li>
                    Sin tiempo en la matriz: {itemsSinTiempos.map((it) => it.descripcion || "ítem").join(", ")}. Confirmá la prenda y
                    los procesos (o cargalos igual y el admin completa los minutos).
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold">Prendas / procesos</p>
          {items.map((it, idx) => {
            const nueva = it.esNueva && !it.prendaId;
            const sinInterpretar = !it.prendaId && !it.esNueva;
            const dur = minutosUnit(it);
            const sinTiempos = Boolean(it.prendaId) && !nueva && dur === 0;
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
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.precioTotal ?? ""}
                    placeholder="—"
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      const n = Number(v);
                      setItem(idx, { precioTotal: v === "" || !Number.isFinite(n) || n < 0 ? null : n });
                    }}
                    className="h-9 w-24 rounded-md border border-border bg-background pl-5 pr-2 text-right text-sm outline-none focus:border-primary"
                    aria-label="Importe del renglón"
                  />
                </div>
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
                        activo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {p.nombre}
                    </button>
                  );
                })}
                {procesos.length === 0 && <span className="text-[11px] text-muted-foreground">No hay procesos configurados</span>}
              </div>

              {it.prendaId && (
                sinTiempos ? (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                    <AlertTriangle className="size-3" /> Sin tiempo cargado para esta prenda/proceso
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {dur} min × {it.cantidad} = <span className="font-medium text-foreground/80">{dur * it.cantidad} min</span>
                  </p>
                )
              )}
            </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setItems((arr) => [...arr, { descripcion: "", cantidad: 1, prendaId: null, procesoIds: [], esNueva: false, precioTotal: null }])}
          >
            <Plus /> Agregar item
          </Button>
        </div>

        {/* Total del ticket. Se guarda tal como está impreso; si no coincide con la
            suma de los renglones, alguno se leyó mal y conviene corregirlo ahora. */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="total-ticket" className="text-sm font-medium">
              Total del ticket
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                id="total-ticket"
                type="number"
                min={0}
                step="0.01"
                value={ot.totalTicket ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const n = Number(v);
                  setOt({ ...ot, totalTicket: v === "" || !Number.isFinite(n) || n < 0 ? null : n });
                }}
                className="h-9 w-32 rounded-md border border-border bg-background pl-5 pr-2 text-right text-sm font-medium outline-none focus:border-primary"
              />
            </div>
          </div>
          {sumaItems !== null && (
            <p
              className={cn(
                "text-[11px]",
                totalCalza === false ? "flex items-center gap-1 font-medium text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
              )}
            >
              {totalCalza === false && <AlertTriangle className="size-3" />}
              Suma de los renglones: ${sumaItems.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              {totalCalza === false && " — no coincide con el total"}
            </p>
          )}
          {ot.formaPago && <p className="text-[11px] text-muted-foreground">Pago: {ot.formaPago}</p>}
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
          <Button className="flex-1" onClick={() => confirmar()} disabled={(estado as Estado) === "creando" || items.length === 0 || hayNuevaSinResolver}>
            {(estado as Estado) === "creando" ? <Loader2 className="animate-spin" /> : <Check />} Cargar al tablero
          </Button>
        </div>

        {confirmarDuplicada && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-background p-4 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">OT ya cargada</p>
                  <p className="text-sm text-muted-foreground">
                    Esta OT ya está cargada en el tablero. ¿Seguro que querés agregarla?
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmarDuplicada(false)}>
                  <X /> Cancelar
                </Button>
                <Button className="flex-1" onClick={() => confirmar(true)}>
                  <Check /> Sí, agregar
                </Button>
              </div>
            </div>
          </div>
        )}
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
