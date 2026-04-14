import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const serviceProviderId = session.user.id;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { appointment: { select: { serviceProviderId: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (booking.appointment.serviceProviderId !== serviceProviderId) {
    return NextResponse.json({ error: "No tenés permiso para cancelar este turno" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "El turno ya fue cancelado" }, { status: 400 });
  }

  await prisma.booking.delete({ where: { id } });

  return NextResponse.json({ id }, { status: 200 });
}
