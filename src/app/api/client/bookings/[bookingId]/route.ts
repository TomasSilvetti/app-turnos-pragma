import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";
import { emitNewBooking } from "@/lib/booking-emitter";
import { inngest } from "@/lib/inngest";
import { sendPushToServiceProvider, sendEmailToServiceProvider } from "@/lib/push-notifications";


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { bookingId } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clienteId: session.clienteId },
    select: {
      id: true,
      clientName: true,
      status: true,
      appointmentId: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceProviderId: true,
          scheduleConfig: { select: { minAdvanceHours: true } },
          serviceType: { select: { title: true } },
        },
      },
    },
  });

  if (!booking)
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  if (booking.status !== "pending" && booking.status !== "confirmed")
    return NextResponse.json(
      { error: "Solo se pueden cancelar turnos pendientes o confirmados" },
      { status: 422 }
    );

  const minAdvanceHours = booking.appointment.scheduleConfig?.minAdvanceHours ?? 0;

  if (minAdvanceHours > 0) {
    const appointmentDateTime = new Date(
      `${booking.appointment.date}T${booking.appointment.time}:00`
    );
    const diffHours =
      (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (diffHours < minAdvanceHours) {
      return NextResponse.json(
        {
          error: `No podés cancelar este turno. Se requiere un mínimo de ${minAdvanceHours} hora${minAdvanceHours === 1 ? "" : "s"} de anticipación.`,
          minAdvanceHours,
        },
        { status: 422 }
      );
    }
  }

  // Verificar si el booking es respaldo de una lista de espera activa
  const listaEsperaEntry = await prisma.listaEspera.findFirst({
    where: {
      bookingIdRespaldo: bookingId,
      estado: { in: ["activa", "notificada"] },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.booking.delete({ where: { id: bookingId } });

    await tx.appointment.update({
      where: { id: booking.appointmentId },
      data: { isActive: true },
    });

    if (listaEsperaEntry) {
      await tx.listaEspera.delete({ where: { id: listaEsperaEntry.id } });
    }
  });

  emitNewBooking();

  const tieneListaEspera = await prisma.listaEspera.findFirst({
    where: { serviceProviderId: booking.appointment.serviceProviderId, estado: "activa" },
    select: { id: true },
  });
  if (tieneListaEspera) {
    await inngest.send({
      name: "waitlist/vacancy.created",
      data: {
        appointmentId: booking.appointmentId,
        serviceProviderId: booking.appointment.serviceProviderId,
        date: booking.appointment.date,
        time: booking.appointment.time,
        serviceTypeTitle: booking.appointment.serviceType?.title ?? null,
      },
    });
  }

  // Notificar al empleado
  const dateStr = booking.appointment.date.split("-").reverse().join("/");
  const serviceInfo = booking.appointment.serviceType?.title
    ? ` · ${booking.appointment.serviceType.title}`
    : "";
  const title = "Turno cancelado";
  const body = `${booking.clientName} canceló su turno del ${dateStr} a las ${booking.appointment.time} hs${serviceInfo}.`;

  sendPushToServiceProvider(booking.appointment.serviceProviderId, { title, body }).catch(() => {});
  sendEmailToServiceProvider(booking.appointment.serviceProviderId, { title, body }).catch(() => {});

  return NextResponse.json(
    { success: true, eliminadoDeLista: !!listaEsperaEntry },
    { status: 200 }
  );
}
