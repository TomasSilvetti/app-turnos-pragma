import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { emitNewBooking } from "@/lib/booking-emitter";
import { sendPushToCliente, sendEmailToCliente } from "@/lib/push-notifications";


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
      appointment: {
        select: {
          serviceProviderId: true,
          date: true,
          time: true,
          serviceType: { select: { title: true } },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (booking.appointment.serviceProviderId !== serviceProviderId) {
    return NextResponse.json({ error: "No tenés permiso para modificar este turno" }, { status: 403 });
  }

  if (booking.status === "cancelled" || booking.status === "requires_reschedule") {
    return NextResponse.json({ error: "El turno no puede ser enviado a reprogramación" }, { status: 400 });
  }

  await prisma.booking.update({
    where: { id },
    data: {
      previousStatus: booking.status,
      status: "requires_reschedule",
    },
  });

  emitNewBooking();

  // Notificar al cliente por push y email si tiene cuenta
  if (booking.clienteId) {
    const businessProfile = await prisma.businessProfile.findFirst({
      where: {
        OR: [
          { serviceProviderId: booking.appointment.serviceProviderId },
          { empleados: { some: { serviceProviderId: booking.appointment.serviceProviderId } } },
        ],
      },
      select: { name: true },
    });

    const negocio = businessProfile?.name ?? "el negocio";
    const serviceInfo = booking.appointment.serviceType?.title
      ? ` · ${booking.appointment.serviceType.title}`
      : "";
    const dateStr = booking.appointment.date.split("-").reverse().join("/");

    const title = "Turno a reprogramar";
    const body = `Tu turno en ${negocio} del ${dateStr} a las ${booking.appointment.time} hs${serviceInfo} necesita ser reprogramado. Ingresá a la app para elegir un nuevo horario.`;

    sendPushToCliente(booking.clienteId, { title, body }).catch(() => {});
    sendEmailToCliente(booking.clienteId, { title, body }).catch(() => {});
  }

  return NextResponse.json({ id }, { status: 200 });
}
