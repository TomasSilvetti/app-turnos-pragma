import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

async function getAppointmentForProvider(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      scheduleConfig: {
        include: {
          businessProfile: {
            select: { serviceProviderId: true },
          },
        },
      },
    },
  });
}

export const PATCH = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const appointment = await getAppointmentForProvider(id);

  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (appointment.scheduleConfig.businessProfile.serviceProviderId !== req.auth.user.id) {
    return NextResponse.json({ error: "No tenés permiso para modificar este turno" }, { status: 403 });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { isActive: !appointment.isActive },
  });

  return NextResponse.json(updated, { status: 200 });
});

export const DELETE = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const appointment = await getAppointmentForProvider(id);

  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (appointment.scheduleConfig.businessProfile.serviceProviderId !== req.auth.user.id) {
    return NextResponse.json({ error: "No tenés permiso para eliminar este turno" }, { status: 403 });
  }

  await prisma.appointment.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
