import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";

// GET: ¿este device tiene al menos una suscripción push activa?
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const count = await prisma.notaPushSubscription.count({ where: { deviceId } });
  return NextResponse.json({ activadas: count > 0 });
}

// POST: registra (o actualiza) la suscripción del navegador para este device.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.endpoint !== "string" ||
    typeof body.keys?.p256dh !== "string" ||
    typeof body.keys?.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "endpoint, keys.p256dh y keys.auth son requeridos" },
      { status: 400 }
    );
  }

  await prisma.notaPushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: { deviceId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    update: { deviceId, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: elimina las suscripciones del device en la DB (no toca el browser, ver guía push).
export async function DELETE(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.notaPushSubscription.deleteMany({ where: { deviceId } });
  return NextResponse.json({ ok: true });
}
