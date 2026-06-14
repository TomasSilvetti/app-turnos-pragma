"use client";

const DEVICE_KEY = "notas_device_id";

export function getStoredDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_KEY);
}

export function setStoredDeviceId(id: string): void {
  window.localStorage.setItem(DEVICE_KEY, id);
}

// fetch que adjunta el deviceId anónimo en el header. Usar en toda la app de notas.
export async function notasFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const deviceId = getStoredDeviceId();
  const headers = new Headers(init.headers);
  if (deviceId) headers.set("x-device-id", deviceId);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
