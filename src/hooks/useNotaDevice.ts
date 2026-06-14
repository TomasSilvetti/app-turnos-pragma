"use client";

// El effect inicializa el device leyendo localStorage (sistema externo): el
// setState de arranque acá es intencional.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { getStoredDeviceId, setStoredDeviceId } from "@/lib/notas/client";

type Estado = {
  deviceId: string | null;
  ready: boolean;
  // Frase mostrada una sola vez, al crear un device nuevo en este navegador.
  nuevaFrase: string | null;
};

export function useNotaDevice() {
  const [estado, setEstado] = useState<Estado>({ deviceId: null, ready: false, nuevaFrase: null });

  useEffect(() => {
    let cancelado = false;
    const existente = getStoredDeviceId();
    if (existente) {
      setEstado({ deviceId: existente, ready: true, nuevaFrase: null });
      return;
    }
    // Sin device en este navegador → crear uno nuevo.
    fetch("/api/notas/device", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id: string; recoveryPhrase: string } | null) => {
        if (cancelado || !data) return;
        setStoredDeviceId(data.id);
        setEstado({ deviceId: data.id, ready: true, nuevaFrase: data.recoveryPhrase });
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const recuperar = useCallback(async (phrase: string): Promise<boolean> => {
    const res = await fetch("/api/notas/device/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase }),
    });
    if (!res.ok) return false;
    const data: { id: string } = await res.json();
    setStoredDeviceId(data.id);
    setEstado({ deviceId: data.id, ready: true, nuevaFrase: null });
    return true;
  }, []);

  const descartarNuevaFrase = useCallback(() => {
    setEstado((e) => ({ ...e, nuevaFrase: null }));
  }, []);

  return { ...estado, recuperar, descartarNuevaFrase };
}
