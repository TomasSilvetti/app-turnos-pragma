"use client";

import { useEffect, useState } from "react";

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) return;

    // Mostrar automáticamente solo si el permiso está en default y no fue descartado
    if (Notification.permission === "default") {
      const dismissed = sessionStorage.getItem("push-prompt-dismissed");
      if (!dismissed) setVisible(true);
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Escuchar el evento manual desde el sidebar
    function handleOpen() {
      if (Notification.permission !== "denied") setVisible(true);
    }
    window.addEventListener("push-prompt-open", handleOpen);
    return () => window.removeEventListener("push-prompt-open", handleOpen);
  }, []);

  async function handleActivar() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("VAPID key no configurada");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, keys }),
      });

      setVisible(false);
    } catch {
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem("push-prompt-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="flex items-start gap-3 rounded-xl border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] px-4 py-3 shadow-lg">
        <span
          className="material-symbols-outlined mt-0.5 shrink-0 text-[var(--brand-color)]"
          style={{ fontSize: "20px" }}
          translate="no"
          aria-hidden="true"
        >
          notifications
        </span>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] leading-snug">
            ¿Querés recibir notificaciones cuando se registren nuevos turnos?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleActivar}
              disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--brand-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              aria-label="Activar notificaciones push"
            >
              {loading ? "Activando…" : "Activar"}
            </button>
            <button
              onClick={handleDismiss}
              disabled={loading}
              className="text-xs text-[#6b7280] dark:text-[#94a3b8] hover:text-[#2A2829] dark:hover:text-[#e2e8f0] transition-colors"
              aria-label="Descartar aviso de notificaciones"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
