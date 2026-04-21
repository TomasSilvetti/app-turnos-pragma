import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";

export async function POST(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

  await prisma.$transaction([
    prisma.clientePushSubscription.upsert({
      where: { clienteId_endpoint: { clienteId: session.clienteId, endpoint: body.endpoint } },
      create: { clienteId: session.clienteId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
      update: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    }),
    prisma.cliente.update({
      where: { id: session.clienteId },
      data: { notificacionesActivadas: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.$transaction([
    prisma.clientePushSubscription.deleteMany({
      where: { clienteId: session.clienteId },
    }),
    prisma.cliente.update({
      where: { id: session.clienteId },
      data: { notificacionesActivadas: false },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
