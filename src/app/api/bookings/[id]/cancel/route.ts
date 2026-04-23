import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { emitNewBooking } from "@/lib/booking-emitter";
import { sendWhatsAppTemplate } from "@/lib/twilio";
import { inngest } from "@/lib/inngest";


export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const serviceProviderId = session.user.id;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      appointment: { select: { serviceProviderId: true, date: true, time: true, serviceType: { select: { title: true } } } },
      cliente: { select: { telefono: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (booking.appointment.serviceProviderId !== serviceProviderId) {
    return NextResponse.json({ error: "No tenés permiso para cancelar este turno" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "El turno ya fue cancelado" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.booking.delete({ where: { id } }),
    prisma.appointment.update({
      where: { id: booking.appointmentId },
      data: { isActive: true },
    }),
  ]);

  emitNewBooking();

  // Notificar lista de espera si hay candidatos para este slot
  const tieneListaEspera = await prisma.listaEspera.findFirst({
    where: {
      serviceProviderId: booking.appointment.serviceProviderId,
      estado: "activa",
    },
    select: { id: true },
  });
  if (tieneListaEspera) {
    console.log(`[cancel] enviando vacancy.created appointmentId=${booking.appointmentId} serviceProviderId=${booking.appointment.serviceProviderId}`);
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
  } else {
    console.log(`[cancel] no hay lista de espera activa para serviceProviderId=${booking.appointment.serviceProviderId}`);
  }

  const phoneToNotify = booking.cliente?.telefono ?? booking.clientPhone;
  const templateSid = process.env.TWILIO_CANCEL_TEMPLATE_SID;
  if (phoneToNotify && phoneToNotify.startsWith("+") && templateSid) {
    try {
      const sid = await sendWhatsAppTemplate({
        to: phoneToNotify,
        contentSid: templateSid,
        contentVariables: {
          "1": booking.clientName,
          "2": booking.appointment.date,
          "3": booking.appointment.time,
        },
      });
      console.log("[cancel] WhatsApp enviado OK, SID:", sid);
    } catch (err) {
      console.error("[cancel] Error al enviar WhatsApp:", err);
    }
  }

  return NextResponse.json({ id }, { status: 200 });
}
