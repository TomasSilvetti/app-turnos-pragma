"use client";

// El effect de abajo sincroniza con un sistema externo (el latido del harness,
// que llega por fetch), que es justamente para lo que están los effects.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { Activity, Moon, PowerOff, KeyRound, Clock, Hammer, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { notasFetch } from "@/lib/notas/client";
import {
  duracion,
  porcentajeCuota,
  NOMBRE_CARRIL,
  type Carril,
  type CuentaHarness,
  type EstadoCarril,
  type EstadoHarness,
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

function FilaCarril({ c }: { c: EstadoCarril }) {
  const trabajando = c.estado === "trabajando";
  const Icono = !c.vivo ? PowerOff : trabajando ? Activity : Moon;
  const IconoCarril = ICONO_CARRIL[c.carril];

  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          trabajando && c.vivo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icono className={cn("size-4", trabajando && c.vivo && "animate-pulse")} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <IconoCarril className="size-3.5 text-muted-foreground" />
          {NOMBRE_CARRIL[c.carril]}
          <span className="text-xs font-normal text-muted-foreground">
            · {!c.vivo ? "detenido" : trabajando ? "trabajando" : "sin trabajo"}
          </span>
        </p>
        {c.vivo && trabajando ? (
          <p className="truncate text-xs text-muted-foreground">
            {c.itemEnCurso ? `«${c.itemEnCurso.titulo || "Sin título"}»` : "analizando la bandeja"}
            {c.sesionInicio && ` · ${duracion(c.sesionInicio)} de ${c.limiteSesionMin} min`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {!c.vivo
              ? c.actualizadoAt
                ? `Último latido hace ${duracion(c.actualizadoAt)}.`
                : "Nunca reportó."
              : "A la espera."}
          </p>
        )}
      </div>
    </div>
  );
}

export function HarnessPanel() {
  const [datos, setDatos] = useState<EstadoHarness | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const cargar = useCallback(async () => {
    const res = await notasFetch("/api/notas/trabajo/estado").catch(() => null);
    if (res?.ok) setDatos(await res.json());
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

  const cuentas = datos?.cuentas ?? [];

  return (
    <section className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
      {datos?.carriles.map((c) => <FilaCarril key={c.carril} c={c} />) ?? (
        <p className="text-sm text-muted-foreground">…</p>
      )}

      {cuentas.length > 0 && (
        <ul className="space-y-3 border-t border-border pt-3">
          {cuentas.map((c) => {
            const pct = porcentajeCuota(c, cuentas);
            const apagada = !c.habilitada;
            return (
              <li key={c.id} className={cn(apagada && "opacity-50")}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <div className="min-w-0 flex-1">
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
                        "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                        c.habilitada ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2">
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
    </section>
  );
}
