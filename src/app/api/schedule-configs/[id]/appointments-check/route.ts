import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";


export const GET = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId: businessProfile.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { scheduleConfigId: id },
    select: {
      id: true,
      booking: {
        select: {
          clientName: true,
          clientPhone: true,
          status: true,
        },
      },
    },
  });

  const reservados = appointments
    .filter((a) => a.booking && (a.booking.status === "pending" || a.booking.status === "confirmed"))
    .map((a) => ({
      clientName: a.booking!.clientName,
      clientPhone: a.booking!.clientPhone,
      status: a.booking!.status,
    }));

  const disponibles = appointments.filter(
    (a) => !a.booking || a.booking.status === "cancelled"
  ).length;

  return NextResponse.json({ disponibles, reservados });
});
