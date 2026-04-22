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
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificacionesActivadas(false);
        return;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    const json = subscription.toJSON();
    await fetch("/api/client/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      }),
    });

    setNotificacionesActivadas(true);
  }, []);

  const desactivar = useCallback(async () => {
    await fetch("/api/client/push-subscriptions", { method: "DELETE" });
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }
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
