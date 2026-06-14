import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidPassword } from "./password";

// La app de notas no tiene login: cada navegador tiene un deviceId anónimo
// (cuid difícil de adivinar) que viaja en el header `x-device-id`. La
// contraseña de recuperación —que elige el usuario— permite reclamar ese
// device desde otro navegador.

export async function createDevice(): Promise<{ id: string }> {
  // El device nace sin contraseña; la recuperación cross-device se habilita
  // recién cuando el usuario define una contraseña en ajustes.
  const device = await prisma.notaDevice.create({ data: {} });
  return { id: device.id };
}

export type SetPasswordResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "taken" | "not_found" };

// Define o actualiza la contraseña de recuperación del device.
export async function setDevicePassword(
  deviceId: string,
  password: string,
): Promise<SetPasswordResult> {
  if (!isValidPassword(password)) return { ok: false, error: "invalid" };

  const passwordHash = hashPassword(password);

  // La contraseña es la clave de búsqueda: no puede repetirse entre devices.
  const enUso = await prisma.notaDevice.findUnique({
    where: { passwordHash },
    select: { id: true },
  });
  if (enUso && enUso.id !== deviceId) return { ok: false, error: "taken" };

  const device = await prisma.notaDevice.findUnique({
    where: { id: deviceId },
    select: { id: true },
  });
  if (!device) return { ok: false, error: "not_found" };

  await prisma.notaDevice.update({ where: { id: deviceId }, data: { passwordHash } });
  return { ok: true };
}

export async function recoverDevice(password: string): Promise<{ id: string } | null> {
  if (!isValidPassword(password)) return null;
  const passwordHash = hashPassword(password);
  const device = await prisma.notaDevice.findUnique({
    where: { passwordHash },
    select: { id: true },
  });
  return device ? { id: device.id } : null;
}

// Indica si el device ya tiene contraseña de recuperación definida.
export async function deviceHasPassword(deviceId: string): Promise<boolean> {
  const device = await prisma.notaDevice.findUnique({
    where: { id: deviceId },
    select: { passwordHash: true },
  });
  return Boolean(device?.passwordHash);
}

// Valida el header x-device-id contra la DB. Devuelve el deviceId o null.
export async function resolveDeviceId(request: NextRequest): Promise<string | null> {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) return null;
  const device = await prisma.notaDevice.findUnique({
    where: { id: deviceId },
    select: { id: true },
  });
  return device?.id ?? null;
}
