"use client";

import { useEffect, useState, useCallback } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type UseNotificacionesPushResult = {
  notificacionesActivadas: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
};

export function useNotificacionesPush(autenticado: boolean): UseNotificacionesPushResult {
  const [notificacionesActivadas, setNotificacionesActivadas] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!autenticado) return;
    fetch("/api/client/push-subscriptions/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { notificacionesActivadas: boolean } | null) => {
        if (data) setNotificacionesActivadas(data.notificacionesActivadas);
      })
      .catch(() => {});
  }, [autenticado]);

  const activar = useCallback(async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("[Push] serviceWorker o PushManager no disponible");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] serviceWorker ready, state:", registration.active?.state);

      const existing = await registration.pushManager.getSubscription();
      console.log("[Push] suscripción existente:", !!existing);
      if (existing) await existing.unsubscribe();

      const permission = await Notification.requestPermission();
      console.log("[Push] permiso:", permission);
      if (permission !== "granted") {
        setNotificacionesActivadas(false);
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      console.log("[Push] suscripción creada:", subscription.endpoint.slice(0, 60));

      const json = subscription.toJSON();
      const res = await fetch("/api/client/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });
      console.log("[Push] POST push-subscriptions:", res.status);

      setNotificacionesActivadas(true);
    } catch (err) {
      console.error("[Push] Error en activar:", err);
      alert("[Push] Error: " + String(err));
    }
  }, []);

  const desactivar = useCallback(async () => {
    await fetch("/api/client/push-subscriptions", { method: "DELETE" });
    setNotificacionesActivadas(false);
  }, []);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (notificacionesActivadas) {
        await desactivar();
      } else {
        await activar();
      }
    } finally {
      setLoading(false);
    }
  }, [notificacionesActivadas, activar, desactivar]);

  return { notificacionesActivadas, loading, toggle };
}
