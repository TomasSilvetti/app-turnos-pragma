import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

export const PATCH = auth(async (
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

  const target = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId: businessProfile.id },
    select: { id: true, isActive: true, daysOfWeek: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  // Si se va a activar, verificar conflictos con otras configuraciones activas
  if (!target.isActive) {
    const activeConfigs = await prisma.scheduleConfig.findMany({
      where: {
        businessProfileId: businessProfile.id,
        isActive: true,
        id: { not: id },
      },
      select: { daysOfWeek: true, name: true },
    });

    const conflictingDays: number[] = [];
    for (const config of activeConfigs) {
      for (const day of target.daysOfWeek) {
        if (config.daysOfWeek.includes(day) && !conflictingDays.includes(day)) {
          conflictingDays.push(day);
        }
      }
    }

    if (conflictingDays.length > 0) {
      return NextResponse.json(
        {
          error: "No se puede activar la configuración porque tiene días en conflicto con otra configuración activa",
          conflictingDays,
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.scheduleConfig.update({
    where: { id },
    data: { isActive: !target.isActive },
    select: {
      id: true,
      name: true,
      isActive: true,
      startTime: true,
      endTime: true,
      intervalMinutes: true,
      daysOfWeek: true,
      price: true,
      serviceTypes: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(updated, { status: 200 });
});
