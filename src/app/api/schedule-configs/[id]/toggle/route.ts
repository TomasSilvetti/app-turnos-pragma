import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";


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
    select: { id: true, isActive: true, daysOfWeek: true, startTime: true, endTime: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  // Si se va a activar, verificar solapamiento de horarios con otras configuraciones activas
  if (!target.isActive) {
    const activeConfigs = await prisma.scheduleConfig.findMany({
      where: {
        businessProfileId: businessProfile.id,
        isActive: true,
        id: { not: id },
      },
      select: { daysOfWeek: true, startTime: true, endTime: true },
    });

    function parseMinutes(t: string): number {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    }

    const targetStart = parseMinutes(target.startTime);
    const targetEnd = parseMinutes(target.endTime);
    const conflictingDays: number[] = [];

    for (const config of activeConfigs) {
      const sharedDays = (target.daysOfWeek as number[]).filter((d) =>
        (config.daysOfWeek as number[]).includes(d)
      );
      if (sharedDays.length === 0) continue;
      const cfgStart = parseMinutes(config.startTime);
      const cfgEnd = parseMinutes(config.endTime);
      if (targetStart < cfgEnd && cfgStart < targetEnd) {
        for (const d of sharedDays) {
          if (!conflictingDays.includes(d)) conflictingDays.push(d);
        }
      }
    }

    if (conflictingDays.length > 0) {
      return NextResponse.json(
        {
          error: "No se puede activar la configuración porque tiene horarios en conflicto con otra configuración activa",
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
