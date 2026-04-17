import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.endpoint !== "string" ||
    typeof body.keys?.p256dh !== "string" ||
    typeof body.keys?.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "Los campos endpoint, keys.p256dh y keys.auth son requeridos" },
      { status: 400 }
    );
  }

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: body.endpoint },
  });

  if (existing) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await prisma.pushSubscription.create({
    data: {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      serviceProviderId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "El campo endpoint es requerido" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.findUnique({
    where: { endpoint: body.endpoint },
  });

  if (!subscription || subscription.serviceProviderId !== session.user.id) {
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
  }

  await prisma.pushSubscription.delete({ where: { endpoint: body.endpoint } });

  return NextResponse.json({ ok: true });
}
