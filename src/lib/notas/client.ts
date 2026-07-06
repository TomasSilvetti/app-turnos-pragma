"use client";

import { encolar, sincronizar } from "./offline";

const DEVICE_KEY = "notas_device_id";

export function getStoredDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_KEY);
}

export function setStoredDeviceId(id: string): void {
  window.localStorage.setItem(DEVICE_KEY, id);
}

const MUTACIONES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// fetch que adjunta el deviceId anónimo en el header. Usar en toda la app de notas.
// Si una mutación falla por falta de red, se encola en el outbox y se responde
// 202 para que la UI optimista siga funcionando; se sincroniza al reconectar.
export async function notasFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const deviceId = getStoredDeviceId();
  const headers = new Headers(init.headers);
  if (deviceId) headers.set("x-device-id", deviceId);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = (init.method ?? "GET").toUpperCase();

  try {
    return await fetch(input, { ...init, headers });
  } catch (err) {
    // Sin conexión. Las mutaciones se encolan; las lecturas las cubre el SW.
    if (MUTACIONES.has(method)) {
      await encolar({
        method,
        url: input,
        body: typeof init.body === "string" ? init.body : undefined,
        deviceId,
        ts: Date.now(),
      });
      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }
}

// Arranca la sincronización del outbox y la reengancha a los eventos de reconexión.
let iniciado = false;
export function iniciarSyncOffline(): void {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  const intentar = () => {
    if (navigator.onLine) sincronizar().catch(() => {});
  };
  window.addEventListener("online", intentar);
  intentar();
}
