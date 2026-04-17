import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { emitNewBooking } from "@/lib/booking-emitter";
import { sendWhatsApp } from "@/lib/twilio";


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
      appointment: { select: { serviceProviderId: true, date: true, time: true } },
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
      data: { isActive: false },
    }),
  ]);

  emitNewBooking();

  if (booking.clientPhone) {
    const message = `Hola ${booking.clientName}, lamentablemente debemos informarte que tu turno del ${booking.appointment.date} a las ${booking.appointment.time} hs ha sido cancelado. Disculpá los inconvenientes.`;
    sendWhatsApp({ to: booking.clientPhone, body: message }).catch((err) =>
      console.error("Error al enviar WhatsApp de cancelación:", err)
    );
  }

  return NextResponse.json({ id }, { status: 200 });
}
