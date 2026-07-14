"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Check, Clock, Sun, Sunset, Sparkles, CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { cn } from "@/lib/utils";

const TIPOS = ["manana", "tarde", "extra"] as const;
type Tipo = (typeof TIPOS)[number];

type TurnoDTO = { horaInicio: string; horaFin: string; habilitado: boolean };
type DiaDTO = { diaSemana: number; atiende: boolean; turnos: Record<Tipo, TurnoDTO> };
type FeriadoDTO = { fecha: string; motivo: string | null };

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// yyyy-MM-dd → dd/MM/yyyy para mostrar al usuario.
function fechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

// Orden de presentación: lunes → domingo.
const ORDEN = [1, 2, 3, 4, 5, 6, 0];
const NOMBRE_DIA: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

const META_TURNO: Record<Tipo, { label: string; icon: typeof Sun }> = {
  manana: { label: "Mañana", icon: Sun },
  tarde: { label: "Tarde", icon: Sunset },
  extra: { label: "Especial", icon: Sparkles },
};

const inputCls =
  "h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary disabled:opacity-50";

// Un turno habilitado es inválido si su horario no es HH:mm o apertura >= cierre.
function turnoInvalido(t: TurnoDTO): boolean {
  if (!t.habilitado) return false;
  if (!HORA_REGEX.test(t.horaInicio) || !HORA_REGEX.test(t.horaFin)) return true;
  return t.horaInicio >= t.horaFin;
}

export function HorariosConfig() {
  const [dias, setDias] = useState<DiaDTO[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const [feriados, setFeriados] = useState<FeriadoDTO[]>([]);
  const [nuevoFeriado, setNuevoFeriado] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");
  const [feriadoBusy, setFeriadoBusy] = useState(false);
  const [errorFeriado, setErrorFeriado] = useState<string | null>(null);

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/turnos")
      .then((r) => (r.ok ? r.json() : { dias: [] }))
      .then((d: { dias: DiaDTO[] }) => setDias(d.dias ?? []))
      .catch(() => setError("No se pudo cargar la configuración"))
      .finally(() => setCargando(false));
  }, []);

  const cargarFeriados = useCallback(() => {
    lavFetch("/api/lavanderia/feriados")
      .then((r) => (r.ok ? r.json() : { feriados: [] }))
      .then((d: { feriados: FeriadoDTO[] }) => setFeriados(d.feriados ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => cargar(), [cargar]);
  useEffect(() => cargarFeriados(), [cargarFeriados]);

  const agregarFeriado = async () => {
    if (!nuevoFeriado) return;
    setFeriadoBusy(true);
    setErrorFeriado(null);
    try {
      const res = await lavFetch("/api/lavanderia/feriados", {
        method: "POST",
        body: JSON.stringify({ fecha: nuevoFeriado, motivo: nuevoMotivo }),
      });
      if (res.ok) {
        setNuevoFeriado("");
        setNuevoMotivo("");
        cargarFeriados();
      } else {
        const d = await res.json().catch(() => ({}));
        setErrorFeriado(d.error ?? "No se pudo agregar el feriado");
      }
    } catch {
      setErrorFeriado("Error de red");
    } finally {
      setFeriadoBusy(false);
    }
  };

  const quitarFeriado = async (fecha: string) => {
    setFeriadoBusy(true);
    setErrorFeriado(null);
    try {
      const res = await lavFetch(`/api/lavanderia/feriados?fecha=${fecha}`, { method: "DELETE" });
      if (res.ok) cargarFeriados();
      else setErrorFeriado("No se pudo quitar el feriado");
    } catch {
      setErrorFeriado("Error de red");
    } finally {
      setFeriadoBusy(false);
    }
  };

  const actualizarDia = (diaSemana: number, cambios: Partial<DiaDTO>) =>
    setDias((arr) => arr?.map((d) => (d.diaSemana === diaSemana ? { ...d, ...cambios } : d)) ?? arr);

  const actualizarTurno = (diaSemana: number, tipo: Tipo, cambios: Partial<TurnoDTO>) =>
    setDias(
      (arr) =>
        arr?.map((d) =>
          d.diaSemana === diaSemana
            ? { ...d, turnos: { ...d.turnos, [tipo]: { ...d.turnos[tipo], ...cambios } } }
            : d
        ) ?? arr
    );

  const hayInvalidos = dias?.some((d) => d.atiende && TIPOS.some((t) => turnoInvalido(d.turnos[t])));

  const guardar = async () => {
    if (!dias || hayInvalidos) return;
    setGuardando(true);
    setError(null);
    setGuardado(false);
    try {
      const res = await lavFetch("/api/lavanderia/turnos", {
        method: "PUT",
        body: JSON.stringify({ dias }),
      });
      if (res.ok) {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo guardar");
      }
    } catch {
      setError("Error de red al guardar");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando || !dias) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const porDia = new Map(dias.map((d) => [d.diaSemana, d]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Clock className="size-5 text-sky-500" /> Horarios de atención
        </h1>
        <p className="text-sm text-muted-foreground">
          Definí qué días atiende el local y los horarios de cada turno (formato 24hs). El turno
          especial se activa por fecha desde el tablero.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ORDEN.map((diaSemana) => {
          const dia = porDia.get(diaSemana);
          if (!dia) return null;
          return (
            <div
              key={diaSemana}
              className={cn(
                "space-y-3 rounded-xl border border-border p-3 transition-colors",
                dia.atiende ? "bg-white/60" : "bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{NOMBRE_DIA[diaSemana]}</span>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                  {dia.atiende ? "Atiende" : "Cerrado"}
                  <input
                    type="checkbox"
                    className="size-4 accent-sky-500"
                    checked={dia.atiende}
                    onChange={(e) => actualizarDia(diaSemana, { atiende: e.target.checked })}
                  />
                </label>
              </div>

              <div className={cn("space-y-2", !dia.atiende && "pointer-events-none opacity-50")}>
                {TIPOS.map((tipo) => {
                  const t = dia.turnos[tipo];
                  const { label, icon: Icon } = META_TURNO[tipo];
                  const invalido = dia.atiende && turnoInvalido(t);
                  return (
                    <div key={tipo} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="flex w-24 shrink-0 cursor-pointer items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            className={cn("size-3.5", tipo === "extra" ? "accent-amber-500" : "accent-sky-500")}
                            checked={t.habilitado}
                            disabled={!dia.atiende}
                            onChange={(e) => actualizarTurno(diaSemana, tipo, { habilitado: e.target.checked })}
                          />
                          <Icon className={cn("size-3.5", tipo === "extra" && "text-amber-500")} />
                          {label}
                        </label>
                        <input
                          type="time"
                          value={t.horaInicio}
                          disabled={!dia.atiende || !t.habilitado}
                          onChange={(e) => actualizarTurno(diaSemana, tipo, { horaInicio: e.target.value })}
                          className={cn(inputCls, "flex-1", invalido && "border-red-400")}
                          aria-label={`${label} apertura`}
                        />
                        <span className="text-muted-foreground">–</span>
                        <input
                          type="time"
                          value={t.horaFin}
                          disabled={!dia.atiende || !t.habilitado}
                          onChange={(e) => actualizarTurno(diaSemana, tipo, { horaFin: e.target.value })}
                          className={cn(inputCls, "flex-1", invalido && "border-red-400")}
                          aria-label={`${label} cierre`}
                        />
                      </div>
                      {invalido && (
                        <p className="pl-24 text-xs text-red-500">
                          La apertura debe ser anterior al cierre.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={guardar} disabled={guardando || hayInvalidos}>
          {guardando ? <Loader2 className="animate-spin" /> : <Save />}
          Guardar
        </Button>
        {guardado && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="size-4" /> Guardado
          </span>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <CalendarOff className="size-5 text-rose-500" /> Feriados
          </h2>
          <p className="text-sm text-muted-foreground">
            Un día feriado no aparece en el tablero y no se le asignan tareas: las OTs se corren
            al siguiente día hábil y los huecos que queden se rellenan automáticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Fecha</label>
            <input
              type="date"
              value={nuevoFeriado}
              onChange={(e) => setNuevoFeriado(e.target.value)}
              className={cn(inputCls, "w-40")}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
            <input
              type="text"
              value={nuevoMotivo}
              onChange={(e) => setNuevoMotivo(e.target.value)}
              placeholder="Ej: Día del trabajador"
              className={cn(inputCls, "w-full min-w-40")}
            />
          </div>
          <Button onClick={agregarFeriado} disabled={feriadoBusy || !nuevoFeriado} variant="outline">
            {feriadoBusy ? <Loader2 className="animate-spin" /> : <Plus />}
            Agregar
          </Button>
        </div>

        {errorFeriado && <p className="text-sm text-red-500">{errorFeriado}</p>}

        {feriados.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay feriados cargados.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {feriados.map((f) => (
              <li key={f.fecha} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{fechaLegible(f.fecha)}</span>
                  {f.motivo && <span className="text-muted-foreground">— {f.motivo}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => quitarFeriado(f.fecha)}
                  disabled={feriadoBusy}
                  className="text-muted-foreground transition-colors hover:text-rose-500 disabled:opacity-50"
                  aria-label={`Quitar feriado ${fechaLegible(f.fecha)}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
