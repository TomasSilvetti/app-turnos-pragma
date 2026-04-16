import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

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

  // Find the target appointment slot
  const newAppointment = await prisma.appointment.findFirst({
    where: {
      serviceProviderId: rescheduleRequest.booking.appointment.serviceProviderId,
      date: rescheduleRequest.requestedDate,
      time: rescheduleRequest.requestedTime,
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

  const newStatus =
    rescheduleRequest.booking.status === "pending" ? "pending" : "confirmed";

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

  return NextResponse.json({ success: true }, { status: 200 });
}
