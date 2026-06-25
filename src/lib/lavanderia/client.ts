"use client";

const EMPLEADO_KEY = "lav_empleado_id";

export function getStoredEmpleadoId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMPLEADO_KEY);
}

export function setStoredEmpleadoId(id: string): void {
  window.localStorage.setItem(EMPLEADO_KEY, id);
}

export function clearStoredEmpleadoId(): void {
  window.localStorage.removeItem(EMPLEADO_KEY);
}

// fetch que adjunta el empleadoId activo en el header. Usar en toda la app de lavanderia.
export async function lavFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const empleadoId = getStoredEmpleadoId();
  const headers = new Headers(init.headers);
  if (empleadoId) headers.set("x-empleado-id", empleadoId);
  // No setear Content-Type cuando el body es FormData: el browser agrega el
  // boundary del multipart automaticamente (forzarlo rompe el parseo en el server).
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
