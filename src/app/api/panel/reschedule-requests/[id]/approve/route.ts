import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function hasOverlap(
  newStartMin: number,
  newEndMin: number,
  appointments: { time: string; duracion: number }[]
): boolean {
  return appointments.some((appt) => {
    const aStart = timeToMinutes(appt.time);
    const aEnd = aStart + appt.duracion;
    return newStartMin < aEnd && newEndMin > aStart;
  });
}

async function resolveProviderIds(serviceProviderId: string): Promise<string[]> {
  let businessProfileId: string | null = null;

  const bp = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });
  if (bp) {
    businessProfileId = bp.id;
  } else {
    const emp = await prisma.empleadoEmpresa.findFirst({
      where: { serviceProviderId },
      select: { businessProfileId: true },
    });
    businessProfileId = emp?.businessProfileId ?? null;
  }

  if (!businessProfileId) return [serviceProviderId];

  const members = await prisma.empleadoEmpresa.findMany({
    where: { businessProfileId },
    select: { serviceProviderId: true },
  });
  const ids = members.map((m) => m.serviceProviderId);
  if (!ids.includes(serviceProviderId)) ids.push(serviceProviderId);
  return ids;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const allProviderIds = await resolveProviderIds(session.user.id);

  const rescheduleRequest = await prisma.rescheduleRequest.findFirst({
    where: {
      id,
      booking: {
        appointment: { serviceProviderId: { in: allProviderIds } },
      },
    },
    select: {
      id: true,
      status: true,
      requestedDate: true,
      requestedTime: true,
      clienteId: true,
      booking: {
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          clienteId: true,
          status: true,
          appointment: {
            select: {
              serviceProviderId: true,
              serviceTypeId: true,
            },
          },
        },
      },
    },
  });

  if (!rescheduleRequest)
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  if (rescheduleRequest.status !== "pending")
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 422 });

  const serviceProviderId = rescheduleRequest.booking.appointment.serviceProviderId;
  const requestedDate = rescheduleRequest.requestedDate;
  const requestedTime = rescheduleRequest.requestedTime;

  const serviceProvider = await prisma.serviceProvider.findUnique({
    where: { id: serviceProviderId },
    select: { modoTurno: true },
  });

  const newStatus =
    rescheduleRequest.booking.status === "pending" ? "pending" : "confirmed";

  if (serviceProvider?.modoTurno === "POR_TIPO") {
    const serviceTypeId = rescheduleRequest.booking.appointment.serviceTypeId;

    const serviceType = serviceTypeId
      ? await prisma.serviceType.findUnique({
          where: { id: serviceTypeId },
          select: { duracion: true },
        })
      : null;

    if (!serviceType || serviceType.duracion == null)
      return NextResponse.json(
        { error: "Tipo de turno no encontrado o sin duración configurada" },
        { status: 422 }
      );

    const startMin = timeToMinutes(requestedTime);
    const endMin = startMin + serviceType.duracion;

    const txResult = await prisma.$transaction(async (tx) => {
      const existingAppointments = await tx.appointment.findMany({
        where: { serviceProviderId, date: requestedDate, isActive: true },
        select: {
          time: true,
          serviceType: { select: { duracion: true } },
        },
      });

      const mapped = existingAppointments.map((a) => ({
        time: a.time,
        duracion: a.serviceType?.duracion ?? 0,
      }));

      if (hasOverlap(startMin, endMin, mapped)) {
        return { conflict: "overlap" as const };
      }

      await tx.booking.update({
        where: { id: rescheduleRequest.booking.id },
        data: { status: "cancelled" },
      });

      const newAppointment = await tx.appointment.create({
        data: {
          time: requestedTime,
          date: requestedDate,
          serviceProviderId,
          serviceTypeId,
          isActive: true,
        },
      });

      await tx.booking.create({
        data: {
          appointmentId: newAppointment.id,
          clientName: rescheduleRequest.booking.clientName,
          clientPhone: rescheduleRequest.booking.clientPhone,
          clienteId: rescheduleRequest.booking.clienteId,
          status: newStatus,
        },
      });

      await tx.rescheduleRequest.update({
        where: { id },
        data: { status: "approved" },
      });

      return { success: true };
    });

    if ("conflict" in txResult)
      return NextResponse.json(
        { error: "El horario seleccionado se superpone con un turno ya reservado" },
        { status: 409 }
      );
  } else {
    const newAppointment = await prisma.appointment.findFirst({
      where: {
        serviceProviderId,
        date: requestedDate,
        time: requestedTime,
        isActive: true,
      },
      select: {
        id: true,
        booking: { select: { id: true, status: true } },
      },
    });

    if (!newAppointment)
      return NextResponse.json(
        { error: "El slot solicitado no está disponible para ese profesional" },
        { status: 422 }
      );

    const hasActiveBooking =
      newAppointment.booking !== null &&
      newAppointment.booking.status !== "cancelled" &&
      newAppointment.booking.status !== "requires_reschedule";

    if (hasActiveBooking)
      return NextResponse.json(
        { error: "El slot seleccionado ya tiene una reserva activa" },
        { status: 409 }
      );

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: rescheduleRequest.booking.id },
        data: { status: "cancelled" },
      });

      if (rescheduleRequest.booking.appointment.serviceTypeId) {
        await tx.appointment.update({
          where: { id: newAppointment.id },
          data: { serviceTypeId: rescheduleRequest.booking.appointment.serviceTypeId },
        });
      }

      await tx.booking.create({
        data: {
          appointmentId: newAppointment.id,
          clientName: rescheduleRequest.booking.clientName,
          clientPhone: rescheduleRequest.booking.clientPhone,
          clienteId: rescheduleRequest.booking.clienteId,
          status: newStatus,
        },
      });

      await tx.rescheduleRequest.update({
        where: { id },
        data: { status: "approved" },
      });
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
