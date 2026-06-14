"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredDeviceId, setStoredDeviceId, notasFetch } from "@/lib/notas/client";

type Estado = {
  deviceId: string | null;
  ready: boolean;
  // Si el device ya tiene contraseña de recuperación definida.
  hasPassword: boolean;
};

export type SetPasswordResult = { ok: true } | { ok: false; error?: string; code?: string };

export function useNotaDevice() {
  const [estado, setEstado] = useState<Estado>({ deviceId: null, ready: false, hasPassword: false });

  useEffect(() => {
    let cancelado = false;

    const init = async () => {
      let id = getStoredDeviceId();
      if (!id) {
        // Sin device en este navegador → crear uno nuevo.
        const creado = await fetch("/api/notas/device", { method: "POST" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (cancelado || !creado?.id) return;
        id = creado.id as string;
        setStoredDeviceId(id);
      }

      // Consultar si el device ya tiene contraseña definida.
      const info = await notasFetch("/api/notas/device")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (cancelado) return;
      setEstado({ deviceId: id, ready: true, hasPassword: Boolean(info?.hasPassword) });
    };

    init();
    return () => {
      cancelado = true;
    };
  }, []);

  const recuperar = useCallback(async (password: string): Promise<boolean> => {
    const res = await notasFetch("/api/notas/device/recover", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data: { id: string } = await res.json();
    setStoredDeviceId(data.id);
    setEstado({ deviceId: data.id, ready: true, hasPassword: true });
    return true;
  }, []);

  const establecerPassword = useCallback(async (password: string): Promise<SetPasswordResult> => {
    const res = await notasFetch("/api/notas/device/password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setEstado((e) => ({ ...e, hasPassword: true }));
      return { ok: true };
    }
    const data = await res.json().catch(() => null);
    return { ok: false, error: data?.error, code: data?.code };
  }, []);

  return { ...estado, recuperar, establecerPassword };
}
