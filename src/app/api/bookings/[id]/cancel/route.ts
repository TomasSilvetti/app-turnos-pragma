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

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Solo se pueden cancelar turnos con estado confirmado" },
      { status: 400 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "cancelled" },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated, { status: 200 });
}
