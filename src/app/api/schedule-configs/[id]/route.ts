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

export const PUT = auth(async (
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
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
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

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor o igual a cero" }, { status: 400 });
  }

  // Si se solicita marcar los turnos conflictivos para reprogramación, hacerlo antes de actualizar
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
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  const url = new URL(req.url);
  const keepBookings = url.searchParams.get("keepBookings") === "true";

  await prisma.$transaction(async (tx) => {
    if (keepBookings) {
      // Mantener los bookings tal como están, solo desconectar sus appointments del config
      await tx.appointment.updateMany({
        where: {
          scheduleConfigId: id,
          booking: { status: { in: ["pending", "confirmed"] } },
        },
        data: { scheduleConfigId: null },
      });
    } else {
      // Marcar como requires_reschedule los bookings pendientes/confirmados
      await tx.booking.updateMany({
        where: { appointment: { scheduleConfigId: id }, status: "pending" },
        data: { status: "requires_reschedule", previousStatus: "pending" },
      });
      await tx.booking.updateMany({
        where: { appointment: { scheduleConfigId: id }, status: "confirmed" },
        data: { status: "requires_reschedule", previousStatus: "confirmed" },
      });

      // Desconectar los appointments con booking activo (para que sigan existiendo en reprogramación)
      await tx.appointment.updateMany({
        where: {
          scheduleConfigId: id,
          booking: { status: "requires_reschedule" },
        },
        data: { scheduleConfigId: null },
      });
    }

    // Eliminar los appointments restantes sin booking activo
    await tx.appointment.deleteMany({
      where: { scheduleConfigId: id },
    });

    await tx.scheduleConfig.delete({ where: { id } });
  });

  return new NextResponse(null, { status: 204 });
});
