import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevice, resolveDeviceId } from "@/lib/notas/device";

// POST: crea un device anónimo nuevo y devuelve su id + frase de recuperación.
export async function POST() {
  const device = await createDevice();
  return NextResponse.json(device, { status: 201 });
}

// GET: devuelve la frase de recuperación del device actual (para mostrarla en ajustes).
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "Device no encontrado" }, { status: 401 });

  const device = await prisma.notaDevice.findUnique({
    where: { id: deviceId },
    select: { recoveryPhrase: true },
  });
  return NextResponse.json({ recoveryPhrase: device?.recoveryPhrase ?? null });
}
