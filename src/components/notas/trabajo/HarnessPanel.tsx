"use client";

// El effect de abajo sincroniza con un sistema externo (el latido del harness,
// que llega por fetch), que es justamente para lo que están los effects.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { Activity, Moon, PowerOff, KeyRound, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { notasFetch } from "@/lib/notas/client";
import { duracion, type CuentaHarness, type EstadoHarness } from "@/lib/notas/trabajoClient";

// Panel de arriba de la sección: qué está haciendo el harness y cómo andan las
// cuentas.
//
// Sobre los tokens: el CLI de Claude no expone la cuota (`/usage` es del cliente
// interactivo, no hay comando). Lo que se muestra se arma con lo que sí es
// exacto: los tokens que cada sesión reporta al terminar, y la hora de reset que
// el propio CLI informa cuando corta. El porcentaje sale contra un techo que se
// aprende solo —lo acumulado la vez que esa cuenta cortó— así que hasta el
// primer corte la cuenta muestra tokens sin barra, y se dice por qué.

const ESTADO_CUENTA: Record<CuentaHarness["estado"], { label: string; clase: string }> = {
  activa: { label: "Activa", clase: "text-emerald-600 dark:text-emerald-400" },
  agotada: { label: "Sin cuota", clase: "text-amber-600 dark:text-amber-400" },
  login_requerido: { label: "Necesita login", clase: "text-destructive" },
};

function horaReset(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function HarnessPanel() {
  const [datos, setDatos] = useState<EstadoHarness | null>(null);
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

  const trabajando = datos?.estado === "trabajando";
  const Icono = !datos?.vivo ? PowerOff : trabajando ? Activity : Moon;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
            !datos?.vivo ? "bg-muted text-muted-foreground" : trabajando ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icono className={cn("size-4", trabajando && "animate-pulse")} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {!datos ? "…" : !datos.vivo ? "Harness detenido" : trabajando ? "Trabajando" : "Sin tareas pendientes"}
          </p>
          {datos?.vivo && trabajando && datos.itemEnCurso ? (
            <p className="truncate text-xs text-muted-foreground">
              «{datos.itemEnCurso.titulo || "Sin título"}»
              {datos.sesionInicio && ` · ${duracion(datos.sesionInicio)} de ${datos.limiteSesionMin} min`}
              {datos.cuentaActual && ` · cuenta ${datos.cuentaActual}`}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {!datos?.vivo
                ? datos?.actualizadoAt
                  ? `Último latido hace ${duracion(datos.actualizadoAt)}. Arrancalo con runner.ps1.`
                  : "Nunca reportó. Arrancalo con runner.ps1 en la máquina."
                : "A la espera de que cargues trabajo."}
            </p>
          )}
        </div>
      </div>

      {datos && datos.cuentas.length > 0 && (
        <ul className="mt-4 space-y-2.5 border-t border-border pt-3">
          {datos.cuentas.map((c) => {
            const pct =
              c.techoObservado && c.techoObservado > 0
                ? Math.min(100, Math.round((c.tokensVentana / c.techoObservado) * 100))
                : null;
            const estilo = ESTADO_CUENTA[c.estado] ?? ESTADO_CUENTA.activa;
            return (
              <li key={c.id}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-medium">Cuenta {c.nombre}</span>
                  {c.nombre === datos.cuentaActual && datos.vivo && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      en uso
                    </span>
                  )}
                  <span className={cn("ml-auto flex items-center gap-1", estilo.clase)}>
                    {c.estado === "login_requerido" && <KeyRound className="size-3" />}
                    {estilo.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        c.estado === "agotada" ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${c.estado === "agotada" ? 100 : (pct ?? 0)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {pct !== null ? `${pct}%` : `${(c.tokensVentana / 1000).toFixed(0)}k tokens`}
                  </span>
                </div>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {c.estado === "agotada" && c.resetAt ? (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Vuelve a las {horaReset(c.resetAt)}
                    </span>
                  ) : c.estado === "login_requerido" ? (
                    `Correr: .\\login-cuenta.ps1 ${c.nombre}`
                  ) : pct === null ? (
                    "Sin porcentaje todavía: el techo se calibra la primera vez que esta cuenta corte por límite."
                  ) : (
                    `${(c.tokensVentana / 1000).toFixed(0)}k de ~${((c.techoObservado ?? 0) / 1000).toFixed(0)}k tokens estimados`
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
