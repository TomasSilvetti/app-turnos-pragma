"use client";

// El effect de abajo sincroniza con un sistema externo (el latido del harness,
// que llega por fetch), que es justamente para lo que están los effects.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  Activity, Moon, PowerOff, KeyRound, Clock, Hammer, Sparkles, Power, Loader2,
  ChevronRight, AlertTriangle, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notasFetch } from "@/lib/notas/client";
import {
  duracion,
  hhmm,
  porcentajeCuota,
  NOMBRE_CARRIL,
  type Carril,
  type CuentaHarness,
  type EstadoCarril,
  type EstadoHarness,
  type EventoHarness,
} from "@/lib/notas/trabajoClient";

// Panel de arriba de la sección: qué está haciendo cada carril y cómo andan las
// cuentas.
//
// Sobre los tokens: el CLI de Claude no expone la cuota (`/usage` es del cliente
// interactivo, no hay comando). Lo que se muestra se arma con lo que sí es
// exacto: los tokens que cada sesión reporta al terminar, y la hora de reset que
// el propio CLI informa cuando corta. El porcentaje sale contra un techo que se
// aprende solo, así que hasta el primer corte de alguna cuenta no hay barra.

const ICONO_CARRIL: Record<Carril, typeof Hammer> = {
  trabajo: Hammer,
  itemizacion: Sparkles,
};

function horaReset(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

const ICONO_EVENTO: Record<EventoHarness["tipo"], React.ReactNode> = {
  arranque: <Power className="size-3 text-emerald-500" />,
  apagado: <PowerOff className="size-3 text-muted-foreground" />,
  cuota: <Clock className="size-3 text-amber-500" />,
  error: <AlertTriangle className="size-3 text-destructive" />,
  info: <Info className="size-3 text-muted-foreground" />,
};

function FilaCarril({
  c,
  onEncender,
  cambiando,
}: {
  c: EstadoCarril;
  onEncender: (carril: Carril, encendido: boolean) => void;
  cambiando: boolean;
}) {
  const trabajando = c.estado === "trabajando";
  // `vivo` es "reportó hace poco", no "está corriendo": el último latido de un
  // carril es justamente el que dice que se apagó. Lo que manda es el estado.
  const corriendo = c.vivo && c.estado !== "detenido";
  const Icono = !corriendo ? PowerOff : trabajando ? Activity : Moon;
  const IconoCarril = ICONO_CARRIL[c.carril];
  // Encendido pero todavía sin reportar: el vigía lo está por levantar. Dura
  // unos segundos y hay que mostrarlo, o el botón parece que no hizo nada.
  const arrancando = c.encendido && !corriendo;

  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          trabajando && corriendo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icono className={cn("size-4", trabajando && corriendo && "animate-pulse")} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <IconoCarril className="size-3.5 text-muted-foreground" />
          {NOMBRE_CARRIL[c.carril]}
          <span className="text-xs font-normal text-muted-foreground">
            · {arrancando ? "arrancando…" : !corriendo ? "detenido" : trabajando ? "trabajando" : "sin trabajo"}
          </span>
        </p>
        {corriendo && trabajando ? (
          <p className="truncate text-xs text-muted-foreground">
            {c.itemEnCurso ? `«${c.itemEnCurso.titulo || "Sin título"}»` : "analizando la bandeja"}
            {c.sesionInicio && ` · ${duracion(c.sesionInicio)} de ${c.limiteSesionMin} min`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {arrancando
              ? "El vigía lo está levantando en tu máquina."
              : !corriendo
                ? c.actualizadoAt
                  ? `Último latido hace ${duracion(c.actualizadoAt)}.`
                  : "Nunca reportó."
                : "A la espera de trabajo."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onEncender(c.carril, !c.encendido)}
        disabled={cambiando}
        aria-label={c.encendido ? `Apagar ${NOMBRE_CARRIL[c.carril]}` : `Encender ${NOMBRE_CARRIL[c.carril]}`}
        title={
          c.encendido
            ? "Apagar: termina lo que está haciendo y no toma nada más"
            : "Encender: arranca en tu máquina y empieza a tomar trabajo"
        }
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border-2 transition-colors disabled:opacity-50",
          c.encendido
            ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
        )}
      >
        {cambiando ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
      </button>
    </div>
  );
}

export function HarnessPanel() {
  const [datos, setDatos] = useState<EstadoHarness | null>(null);
  const [eventos, setEventos] = useState<EventoHarness[]>([]);
  const [verLog, setVerLog] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const cargar = useCallback(async () => {
    const [res, resEventos] = await Promise.all([
      notasFetch("/api/notas/trabajo/estado").catch(() => null),
      notasFetch("/api/notas/trabajo/eventos").catch(() => null),
    ]);
    if (res?.ok) setDatos(await res.json());
    if (resEventos?.ok) setEventos((await resEventos.json()).eventos ?? []);
  }, []);

  useEffect(() => {
    cargar();
    // Sólo con la pestaña visible: en el celular, un polling de fondo cada 5 s
    // gasta batería para mirar una pantalla que nadie tiene delante.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        cargar();
        setTick((n) => n + 1);
      }
    }, 5000);
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  const alternarCuenta = async (cuenta: CuentaHarness) => {
    if (
      cuenta.habilitada &&
      cuenta.carril &&
      !confirm(
        `«${cuenta.email || cuenta.nombre}» la está usando ${NOMBRE_CARRIL[cuenta.carril]} ahora mismo.\n\n` +
          "Desactivarla corta esa sesión. Lo que haya escrito en disco queda y otra cuenta lo retoma."
      )
    )
      return;

    setCambiando(cuenta.id);
    await notasFetch(`/api/notas/trabajo/cuentas/${cuenta.id}`, {
      method: "PATCH",
      body: JSON.stringify({ habilitada: !cuenta.habilitada }),
    }).catch(() => {});
    setCambiando(null);
    cargar();
  };

  const encender = async (carril: Carril, encendido: boolean) => {
    setCambiando(carril);
    // Optimista: el switch se pinta ya, aunque el arranque real tarde unos
    // segundos en verse. Sin esto el botón parece que no responde.
    setDatos((prev) =>
      prev ? { ...prev, carriles: prev.carriles.map((c) => (c.carril === carril ? { ...c, encendido } : c)) } : prev
    );
    await notasFetch("/api/notas/trabajo/estado/encendido", {
      method: "POST",
      body: JSON.stringify({ carril, encendido }),
    }).catch(() => {});
    setCambiando(null);
    cargar();
  };

  const cuentas = datos?.cuentas ?? [];

  return (
    <section className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
      {datos?.carriles.map((c) => (
        <FilaCarril key={c.carril} c={c} onEncender={encender} cambiando={cambiando === c.carril} />
      )) ?? <p className="text-sm text-muted-foreground">…</p>}

      {cuentas.length > 0 && (
        <ul className="space-y-3 border-t border-border pt-3">
          {cuentas.map((c) => {
            const pct = porcentajeCuota(c, cuentas);
            const apagada = !c.habilitada;
            return (
              <li key={c.id}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <div className={cn("min-w-0 flex-1", apagada && "opacity-50")}>
                    <p className="truncate font-medium">{c.email || `Cuenta ${c.nombre}`}</p>
                    <p className="text-[10px] text-muted-foreground">
                      cuentas\{c.nombre}
                      {c.estado === "agotada" && c.resetAt && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                          <Clock className="size-2.5" />
                          vuelve {horaReset(c.resetAt)}
                        </span>
                      )}
                      {c.estado === "login_requerido" && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-destructive">
                          <KeyRound className="size-2.5" />
                          .\login-cuenta.ps1 {c.nombre}
                        </span>
                      )}
                    </p>
                  </div>

                  {c.carril && !apagada && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {(() => {
                        const I = ICONO_CARRIL[c.carril];
                        return <I className="size-2.5" />;
                      })()}
                      {NOMBRE_CARRIL[c.carril]}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => alternarCuenta(c)}
                    disabled={cambiando === c.id}
                    role="switch"
                    aria-checked={c.habilitada}
                    aria-label={c.habilitada ? "Desactivar cuenta" : "Activar cuenta"}
                    title={c.habilitada ? "Sacarla de la rotación" : "Volver a usarla"}
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
                      c.habilitada ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                        c.habilitada ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className={cn("flex items-center gap-2", apagada && "opacity-50")}>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        c.estado === "agotada" ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {pct !== null ? `${pct}%` : `${(c.tokensVentana / 1000).toFixed(0)}k`}
                  </span>
                </div>
              </li>
            );
          })}
          {cuentas.every((c) => !c.techoObservado) && (
            <li className="text-[11px] text-muted-foreground">
              El porcentaje aparece cuando alguna cuenta corte por límite: ahí se aprende el techo. Hasta
              entonces se muestran los tokens usados en la ventana.
            </li>
          )}
        </ul>
      )}

      {/* Log del harness: sin esto, apretar apagar y no ver nada no distingue
          "se apagó" de "no se pudo apagar". */}
      {eventos.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setVerLog((v) => !v)}
            className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", verLog && "rotate-90")} />
            Actividad del harness
            <span className="ml-auto flex items-center gap-1.5 font-normal">
              {ICONO_EVENTO[eventos[0].tipo]}
              <span className="max-w-[14rem] truncate">{eventos[0].texto}</span>
              <span className="tabular-nums">{hhmm(eventos[0].createdAt)}</span>
            </span>
          </button>

          {verLog && (
            <ol className="mt-2 space-y-1.5">
              {eventos.map((e) => (
                <li key={e.id} className="flex gap-2 text-[11px] leading-relaxed">
                  <span className="mt-0.5 shrink-0">{ICONO_EVENTO[e.tipo]}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{hhmm(e.createdAt)}</span>
                  <span className={cn(e.tipo === "error" && "text-destructive")}>{e.texto}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
