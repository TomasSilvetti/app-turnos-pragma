"use client";

import { useCallback, useEffect, useState } from "react";
import { notasFetch } from "@/lib/notas/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function useNotasPush(deviceReady: boolean) {
  const [activadas, setActivadas] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deviceReady) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    notasFetch("/api/notas/push")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { activadas: boolean } | null) => {
        if (data) setActivadas(data.activadas);
      })
      .catch(() => {});
  }, [deviceReady]);

  const guardarSuscripcion = useCallback(async (sub: PushSubscription) => {
    const json = sub.toJSON();
    await notasFetch("/api/notas/push", {
      method: "POST",
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      }),
    });
  }, []);

  const activar = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.ready;
    const existente = await registration.pushManager.getSubscription();

    if (existente) {
      // Reutilizar la suscripción del browser — no requiere VAPID key.
      await guardarSuscripcion(existente);
      setActivadas(true);
      return;
    }

    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setActivadas(false);
      return;
    }
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
    await guardarSuscripcion(sub);
    setActivadas(true);
  }, [guardarSuscripcion]);

  const desactivar = useCallback(async () => {
    // Solo eliminar de la DB, NO llamar unsubscribe() en el browser (ver guía push).
    await notasFetch("/api/notas/push", { method: "DELETE" });
    setActivadas(false);
  }, []);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (activadas) await desactivar();
      else await activar();
    } catch (err) {
      console.error("[NotasPush] error:", err);
    } finally {
      setLoading(false);
    }
  }, [activadas, activar, desactivar]);

  return { activadas, loading, toggle };
}
