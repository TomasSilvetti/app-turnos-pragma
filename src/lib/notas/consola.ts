import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "./device";
import { codigoValido } from "./totp";

// La consola le da a quien la abra una sesión de Claude Code con permisos
// totales sobre la máquina del usuario. El resto de la app de notas se conforma
// con el deviceId anónimo —para una lista de compras alcanza—, pero acá eso
// sería una shell abierta para cualquiera que vea ese id en un navegador.
//
// De ahí el PIN: una clave aparte, que no está en el navegador hasta que se la
// escribe. Se cambia por un token firmado que vale unas horas.

const VENTANA_MS = 12 * 60 * 60 * 1000;

function secreto(): string {
  // El propio HARNESS_TOKEN sirve de clave de firma: ya es un secreto largo del
  // servidor y sólo se usa acá para firmar, nunca se expone.
  return process.env.HARNESS_TOKEN || "";
}

export function firmarToken(deviceId: string): string {
  const vence = Date.now() + VENTANA_MS;
  const firma = createHmac("sha256", secreto()).update(`${deviceId}.${vence}`).digest("hex");
  return `${vence}.${firma}`;
}

function tokenValido(deviceId: string, token: string | null): boolean {
  if (!token || !secreto()) return false;
  const [venceStr, firma] = token.split(".");
  const vence = Number(venceStr);
  if (!vence || !firma || Date.now() > vence) return false;

  const esperada = createHmac("sha256", secreto()).update(`${deviceId}.${vence}`).digest("hex");
  // Comparación de tiempo constante: comparar hashes con === filtra el secreto
  // por el tiempo que tarda en fallar.
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function pinCorrecto(pin: unknown): boolean {
  const esperado = process.env.CONSOLA_PIN;
  if (!esperado || typeof pin !== "string" || pin.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(pin), Buffer.from(esperado));
}

// Un PIN fijo viaja igual cada vez: quien lo vea una vez entra siempre. Con
// CONSOLA_TOTP_SECRET puesto, la puerta pasa a ser el código de seis dígitos de
// Google Authenticator y el PIN deja de servir — no conviven, porque dejar los
// dos abiertos deja la puerta vieja abierta.
export function usaTotp(): boolean {
  return Boolean(process.env.CONSOLA_TOTP_SECRET);
}

export function claveCorrecta(clave: unknown): boolean {
  const secreto = process.env.CONSOLA_TOTP_SECRET;
  return secreto ? codigoValido(secreto, clave) : pinCorrecto(clave);
}

// Igual que resolveDeviceId pero exigiendo además el token de la consola.
export async function resolveConsola(request: NextRequest): Promise<string | null> {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return null;
  return tokenValido(deviceId, request.headers.get("x-consola-token")) ? deviceId : null;
}

export function sinPin() {
  return NextResponse.json({ error: "PIN requerido" }, { status: 403 });
}

// El directorio por defecto de una sesión nueva. Se puede cambiar por sesión.
export const DIRECTORIO_POR_DEFECTO = "C:\\Users\\tomas\\Documents\\Proyectos";

export async function sesionDelDevice(id: string, deviceId: string) {
  const s = await prisma.consolaSesion.findUnique({ where: { id } });
  return s && s.deviceId === deviceId ? s : null;
}
