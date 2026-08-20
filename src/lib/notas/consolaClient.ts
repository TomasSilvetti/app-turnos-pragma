// El PIN se cambia por un token firmado que vale unas horas. Vive en
// sessionStorage y no en localStorage a propósito: cerrar la pestaña lo olvida,
// que para una shell con permisos totales es el default correcto.
const CLAVE = "consola_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(CLAVE);
}

export function setToken(token: string): void {
  window.sessionStorage.setItem(CLAVE, token);
}

export function olvidarToken(): void {
  window.sessionStorage.removeItem(CLAVE);
}

export type SesionConsola = {
  id: string;
  sessionId: string;
  titulo: string;
  cuenta: string | null;
  estado: "idle" | "pendiente" | "pensando" | "error";
  error: string | null;
  directorio: string;
  archivada: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { mensajes: number };
  mensajes?: MensajeConsola[];
};

export type MensajeConsola = {
  id: string;
  rol: "usuario" | "asistente" | "sistema";
  texto: string;
  parcial: boolean;
  imagenes: string[];
  createdAt: string;
};

export type CapturaConsola = {
  url: string;
  ancho: number;
  alto: number;
  estado: "lista" | "pendiente";
  updatedAt: string;
};

// fetch de la consola: device + token del PIN. Devuelve 403 si el token venció,
// y ahí la pantalla vuelve a pedir el PIN.
export async function consolaFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const deviceId = typeof window !== "undefined" ? window.localStorage.getItem("notas_device_id") : null;
  if (deviceId) headers.set("x-device-id", deviceId);
  const token = getToken();
  if (token) headers.set("x-consola-token", token);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export type EnvioConsola = {
  id: string;
  texto: string;
  // Cuando viene una tecla suelta ("esc"), `texto` está vacío.
  tecla: string | null;
  estado: "pendiente" | "enviado" | "error" | "cancelado";
  error: string | null;
  createdAt: string;
  enviadoEn: string | null;
};

// Una pestaña de Windows Terminal que ya estaba abierta en la notebook. La app
// no la creó ni es dueña de ella: el agente local se cuelga de su consola.
export type TerminalConsola = {
  id: string;
  pid: number;
  apodo: string;
  titulo: string;
  pantalla: string;
  viva: boolean;
  vistoEn: string;
  createdAt: string;
  envios: EnvioConsola[];
};
