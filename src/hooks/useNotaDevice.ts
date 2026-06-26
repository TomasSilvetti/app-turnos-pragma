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

      // Validar el device guardado contra el server. Si responde 401 el device
      // ya no existe en la BD (p.ej. migración/reseteo de base) y el id quedó
      // "fantasma": hay que descartarlo y recrear, porque si no toda escritura
      // siguiente (crear nota, recordatorios, etc.) falla con 401.
      if (id) {
        const res = await notasFetch("/api/notas/device").catch(() => null);
        if (cancelado) return;
        if (res?.ok) {
          const info = await res.json().catch(() => null);
          setEstado({ deviceId: id, ready: true, hasPassword: Boolean(info?.hasPassword) });
          return;
        }
        if (res?.status === 401) {
          // Device inexistente en la BD → descartar id local y recrear abajo.
          id = null;
        } else {
          // Error transitorio (red/server): conservar el id sin recrear.
          setEstado({ deviceId: id, ready: true, hasPassword: false });
          return;
        }
      }

      // Sin device válido en este navegador → crear uno nuevo.
      const creado = await fetch("/api/notas/device", { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (cancelado) return;
      if (!creado?.id) {
        // Si la creación falla (p.ej. migración pendiente en prod), marcar ready
        // igualmente para que la UI muestre el estado vacío en vez de loading infinito.
        setEstado({ deviceId: null, ready: true, hasPassword: false });
        return;
      }
      id = creado.id as string;
      setStoredDeviceId(id);
      setEstado({ deviceId: id, ready: true, hasPassword: false });
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
