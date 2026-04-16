import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

const DAYS_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const DAYS_MAP: Record<string, number> = { L: 0, M: 1, X: 2, J: 3, V: 4, S: 5, D: 6 };

function intsToStrings(days: number[]): string[] {
  return days.map((d) => DAYS_LABELS[d]).filter(Boolean) as string[];
}

function stringsToInts(days: (string | number)[]): number[] {
  return days
    .map((d) => (typeof d === "number" ? d : (DAYS_MAP[d] ?? -1)))
    .filter((d) => d !== -1);
}

async function getBusinessProfileId(userId: string): Promise<string | null> {
  const bp = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: userId },
    select: { id: true },
  });
  if (bp) return bp.id;

  const rel = await prisma.empleadoEmpresa.findFirst({
    where: { serviceProviderId: userId },
    select: { businessProfileId: true },
  });
  return rel?.businessProfileId ?? null;
}

export const PUT = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { id } = await context.params;

  const businessProfileId = await getBusinessProfileId(userId);
  if (!businessProfileId) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  // Empleados solo pueden editar sus propias configs
  const isPropietario = !!(await prisma.businessProfile.findUnique({
    where: { serviceProviderId: userId },
    select: { id: true },
  }));
  if (!isPropietario && existing.serviceProviderId !== userId) {
    return NextResponse.json({ error: "No tenés permiso para editar esta configuración" }, { status: 403 });
  }

  const body = await req.json();
  const { name, startTime, endTime, intervalMinutes, daysOfWeek, price, serviceTypeIds, markForReschedule } = body;

  if (!name || !startTime || !endTime || intervalMinutes === undefined || !daysOfWeek || price === undefined) {
    return NextResponse.json(
      { error: "Los campos name, startTime, endTime, intervalMinutes, daysOfWeek y price son requeridos" },
      { status: 400 }
    );
  }

  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
    return NextResponse.json({ error: "daysOfWeek debe ser un array con al menos un día" }, { status: 400 });
  }

  if (startTime >= endTime) {
    return NextResponse.json({ error: "startTime debe ser menor a endTime" }, { status: 400 });
  }

  // Validar solapamiento con otras configs activas del mismo negocio (excepto la actual)
  const newDayInts = new Set(stringsToInts(daysOfWeek));
  function parseMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  const newStart = parseMinutes(startTime);
  const newEnd = parseMinutes(endTime);

  const otherActiveConfigs = await prisma.scheduleConfig.findMany({
    where: { businessProfileId, isActive: true, id: { not: id } },
    select: { id: true, startTime: true, endTime: true, daysOfWeek: true },
  });

  const overlapping = otherActiveConfigs.find((cfg) => {
    const sharedDay = (cfg.daysOfWeek as number[]).some((d) => newDayInts.has(d));
    if (!sharedDay) return false;
    const cfgStart = parseMinutes(cfg.startTime);
    const cfgEnd = parseMinutes(cfg.endTime);
    return newStart < cfgEnd && cfgStart < newEnd;
  });

  if (overlapping)
    return NextResponse.json(
      { error: "El horario se superpone con una configuración activa existente en los mismos días" },
      { status: 409 }
    );

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor o igual a cero" }, { status: 400 });
  }

  if (markForReschedule) {
    const newDayInts = new Set(stringsToInts(daysOfWeek));

    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        scheduleConfigId: id,
        booking: { status: { in: ["pending", "confirmed"] } },
      },
      select: { id: true, date: true, time: true },
    });

    const conflictingIds = conflictingAppointments
      .filter((a) => {
        const jsDay = new Date(a.date + "T00:00:00").getDay();
        const configDay = (jsDay + 6) % 7;
        const dayConflict = !newDayInts.has(configDay);
        const timeConflict = a.time < startTime || a.time >= endTime;
        return dayConflict || timeConflict;
      })
      .map((a) => a.id);

    if (conflictingIds.length > 0) {
      await prisma.booking.updateMany({
        where: { appointmentId: { in: conflictingIds }, status: "pending" },
        data: { status: "requires_reschedule", previousStatus: "pending" },
      });
      await prisma.booking.updateMany({
        where: { appointmentId: { in: conflictingIds }, status: "confirmed" },
        data: { status: "requires_reschedule", previousStatus: "confirmed" },
      });
    }
  }

  const updated = await prisma.scheduleConfig.update({
    where: { id },
    data: {
      name,
      startTime,
      endTime,
      intervalMinutes: Number(intervalMinutes),
      daysOfWeek: stringsToInts(daysOfWeek),
      price: parsedPrice,
      serviceTypes: {
        set: Array.isArray(serviceTypeIds)
          ? serviceTypeIds.map((stId: string) => ({ id: stId }))
          : [],
      },
    },
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

  return NextResponse.json(
    { ...updated, daysOfWeek: intsToStrings(updated.daysOfWeek) },
    { status: 200 }
  );
});

export const DELETE = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = req.auth.user.id;
  const { id } = await context.params;

  const businessProfileId = await getBusinessProfileId(userId);
  if (!businessProfileId) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  // Empleados solo pueden eliminar sus propias configs
  const isPropietario = !!(await prisma.businessProfile.findUnique({
    where: { serviceProviderId: userId },
    select: { id: true },
  }));
  if (!isPropietario && existing.serviceProviderId !== userId) {
    return NextResponse.json({ error: "No tenés permiso para eliminar esta configuración" }, { status: 403 });
  }

  const url = new URL(req.url);
  const keepBookings = url.searchParams.get("keepBookings") === "true";

  await prisma.$transaction(async (tx) => {
    if (keepBookings) {
      await tx.appointment.updateMany({
        where: {
          scheduleConfigId: id,
          booking: { status: { in: ["pending", "confirmed"] } },
        },
        data: { scheduleConfigId: null },
      });
    } else {
      await tx.booking.updateMany({
        where: { appointment: { scheduleConfigId: id }, status: "pending" },
        data: { status: "requires_reschedule", previousStatus: "pending" },
      });
      await tx.booking.updateMany({
        where: { appointment: { scheduleConfigId: id }, status: "confirmed" },
        data: { status: "requires_reschedule", previousStatus: "confirmed" },
      });

      await tx.appointment.updateMany({
        where: {
          scheduleConfigId: id,
          booking: { status: "requires_reschedule" },
        },
        data: { scheduleConfigId: null },
      });
    }

    await tx.appointment.deleteMany({
      where: { scheduleConfigId: id },
    });

    await tx.scheduleConfig.delete({ where: { id } });
  });

  return new NextResponse(null, { status: 204 });
});
