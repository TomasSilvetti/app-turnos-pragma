import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRecoveryPhrase, normalizeRecoveryPhrase } from "./recovery";

// La app de notas no tiene login: cada navegador tiene un deviceId anónimo
// (cuid difícil de adivinar) que viaja en el header `x-device-id`. La frase
// de recuperación permite reclamar ese device desde otro navegador.

export async function createDevice(): Promise<{ id: string; recoveryPhrase: string }> {
  // Reintentar ante colisión improbable de frase.
  for (let intento = 0; intento < 5; intento++) {
    const recoveryPhrase = generateRecoveryPhrase();
    const existe = await prisma.notaDevice.findUnique({ where: { recoveryPhrase } });
    if (existe) continue;
    const device = await prisma.notaDevice.create({ data: { recoveryPhrase } });
    return { id: device.id, recoveryPhrase };
  }
  throw new Error("No se pudo generar una frase de recuperación única");
}

export async function recoverDevice(phrase: string): Promise<{ id: string } | null> {
  const recoveryPhrase = normalizeRecoveryPhrase(phrase);
  if (!recoveryPhrase) return null;
  const device = await prisma.notaDevice.findUnique({ where: { recoveryPhrase } });
  return device ? { id: device.id } : null;
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
