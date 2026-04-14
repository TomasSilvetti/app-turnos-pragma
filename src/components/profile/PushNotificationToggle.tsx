"use client";

import { useEffect, useState } from "react";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setLoading(false);
      return;
    }

    setSupported(true);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setActive(!!sub))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    if (saving) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (active) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await fetch("/api/push-subscriptions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
          });
        }
        setActive(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setSaving(false);
          return;
        }

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

        const res = await fetch("/api/push-subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, keys }),
        });

        if (!res.ok) throw new Error("No se pudo guardar la suscripción");
        setActive(true);
      }
    } catch {
      setErrorMsg("No se pudo actualizar la suscripción. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-48 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-2" />
        <div className="h-4 w-64 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
      </div>
    );
  }

  if (!supported) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8]">
        Notificaciones push
      </p>

      <div className="flex items-start gap-3">
        <button
          role="switch"
          aria-checked={active}
          aria-label="Activar o desactivar notificaciones push"
          disabled={saving}
          onClick={handleToggle}
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
            active ? "bg-[var(--brand-color)]" : "bg-[#cbd5e1] dark:bg-[#475569]"
          } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
              active ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
            {active ? "Notificaciones activas" : "Notificaciones desactivadas"}
          </span>
          <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">
            Recibí un aviso en este dispositivo cada vez que se reserve un nuevo turno asignado a vos.
          </p>
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs text-[#ef4444] mt-1">{errorMsg}</p>
      )}
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
