import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const provider = await prisma.serviceProvider.findUnique({
    where: { id: session.user.id },
    select: { attendsAppointments: true },
  });

  if (!provider) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const hasActiveSchedule = await prisma.scheduleConfig.count({
    where: { serviceProviderId: session.user.id, isActive: true },
  }) > 0;

  return NextResponse.json({
    attendsAppointments: provider.attendsAppointments,
    hasActiveSchedule,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body === null || typeof body.attendsAppointments !== "boolean") {
    return NextResponse.json({ error: "Campo attendsAppointments requerido" }, { status: 400 });
  }

  // Si quiere desactivar, verificar que no tenga schedule configs activas
  if (!body.attendsAppointments) {
    const hasActiveSchedule = await prisma.scheduleConfig.count({
      where: { serviceProviderId: session.user.id, isActive: true },
    }) > 0;

    if (hasActiveSchedule) {
      return NextResponse.json(
        { error: "Debés desactivar tu configuración de turnos antes de desactivar tu atención al cliente." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.serviceProvider.update({
    where: { id: session.user.id },
    data: { attendsAppointments: body.attendsAppointments },
    select: { attendsAppointments: true },
  });

  return NextResponse.json({ attendsAppointments: updated.attendsAppointments });
}
