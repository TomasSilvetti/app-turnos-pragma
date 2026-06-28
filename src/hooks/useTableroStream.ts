"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lavFetch } from "@/lib/lavanderia/client";
import type { OTSnap, TableroSnapshot } from "@/lib/lavanderia/tablero";

// Intervalo de chequeo de version. Cada tick es un GET liviano (1 aggregate);
// solo traemos el tablero completo cuando la version cambio.
const INTERVALO_MS = 5000;

// Mantiene el tablero al dia por polling de version (no SSE). El SSE mantenia la
// funcion serverless "viva" todo el tiempo, lo que consume mucho del plan free
// de Vercel; este enfoque solo gasta lo que tarda cada chequeo. Ademas pausa
// cuando la pestaña esta oculta, asi no gasta de noche con el tablero abierto.
export function useTableroStream(empleadoId: string | null): {
  snapshot: TableroSnapshot | null;
  conectado: boolean;
  refrescar: () => Promise<void>;
  aplicarLocal: (otId: string, patch: Partial<OTSnap>) => void;
} {
  const [snapshot, setSnapshot] = useState<TableroSnapshot | null>(null);
  const [conectado, setConectado] = useState(false);
  // Ultima version vista; si no cambia, no traemos el tablero completo.
  const versionRef = useRef<string>("");

  // Trae el tablero completo y actualiza la version conocida.
  const traerTablero = useCallback(async () => {
    const r = await lavFetch("/api/lavanderia/ots");
    if (!r.ok) throw new Error("tablero no disponible");
    const d: TableroSnapshot = await r.json();
    versionRef.current = d.version;
    setSnapshot(d);
  }, []);

  // Parche optimista: actualiza una OT en el snapshot en memoria para que la
  // tarjeta cambie al instante (p. ej. el boton Empezar -> Terminar), sin esperar
  // al PATCH ni al refetch. El refrescar posterior reconcilia el estado real.
  const aplicarLocal = useCallback((otId: string, patch: Partial<OTSnap>) => {
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            dias: prev.dias.map((d) => ({
              ...d,
              ots: d.ots.map((o) => (o.id === otId ? { ...o, ...patch } : o)),
            })),
          }
        : prev
    );
  }, []);

  // Refetch puntual tras una accion (empezar/terminar/cargar) para ver el cambio
  // al instante sin esperar al proximo tick.
  const refrescar = useCallback(async () => {
    try {
      await traerTablero();
    } catch {
      /* sin conexion: el proximo poll reconciliara */
    }
  }, [traerTablero]);

  useEffect(() => {
    if (!empleadoId) return;
    let cerrado = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Chequeo de version: barato. Solo si cambio traemos el tablero completo.
    const chequear = async () => {
      try {
        const r = await lavFetch("/api/lavanderia/version");
        if (!r.ok) throw new Error("version no disponible");
        const { version } = (await r.json()) as { version: string };
        if (cerrado) return;
        setConectado(true);
        if (version !== versionRef.current) await traerTablero();
      } catch {
        if (!cerrado) setConectado(false);
      }
    };

    const programar = () => {
      if (cerrado) return;
      timer = setTimeout(tick, INTERVALO_MS);
    };

    const tick = async () => {
      // No gastar mientras la pestaña esta oculta; reanudamos al volver.
      if (typeof document !== "undefined" && document.hidden) {
        programar();
        return;
      }
      await chequear();
      programar();
    };

    // Carga inicial inmediata (trae tablero completo) y arranca el loop.
    refrescar().finally(() => {
      if (!cerrado) setConectado(true);
      programar();
    });

    // Al volver a la pestaña, chequear de inmediato sin esperar al timer.
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) chequear();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cerrado = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [empleadoId, refrescar, traerTablero]);

  return { snapshot, conectado, refrescar, aplicarLocal };
}
