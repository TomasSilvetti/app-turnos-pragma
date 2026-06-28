"use client";

import { useCallback, useEffect, useState } from "react";
import { lavFetch } from "@/lib/lavanderia/client";
import type { TableroSnapshot } from "@/lib/lavanderia/tablero";

// Suscribe al tablero via SSE. EventSource reconecta solo ante cortes. Como
// fallback inicial (y si el stream no conecta), hace un GET puntual.
export function useTableroStream(empleadoId: string | null): {
  snapshot: TableroSnapshot | null;
  conectado: boolean;
  refrescar: () => Promise<void>;
} {
  const [snapshot, setSnapshot] = useState<TableroSnapshot | null>(null);
  const [conectado, setConectado] = useState(false);

  // Refetch puntual del tablero. Se usa tras una acción (empezar/terminar) para
  // ver el cambio al instante sin esperar al próximo tick del SSE.
  const refrescar = useCallback(async () => {
    try {
      const r = await lavFetch("/api/lavanderia/ots");
      if (r.ok) setSnapshot(await r.json());
    } catch {
      /* sin conexión: el SSE reconciliará luego */
    }
  }, []);

  useEffect(() => {
    if (!empleadoId) return;
    let cerrado = false;

    // Carga inicial inmediata (no esperamos al primer tick del stream).
    lavFetch("/api/lavanderia/ots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TableroSnapshot | null) => {
        if (!cerrado && d) setSnapshot(d);
      })
      .catch(() => {});

    const es = new EventSource(`/api/lavanderia/stream?e=${encodeURIComponent(empleadoId)}`);
    es.addEventListener("open", () => setConectado(true));
    es.addEventListener("snapshot", (e) => {
      try {
        setSnapshot(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignorar payload invalido */
      }
    });
    es.onerror = () => setConectado(false);

    return () => {
      cerrado = true;
      es.close();
    };
  }, [empleadoId]);

  return { snapshot, conectado, refrescar };
}
