import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceProviderId = session.user.id;

  const bookings = await prisma.booking.findMany({
    where: {
      status: "requires_reschedule",
      appointment: { serviceProviderId },
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceType: { select: { title: true } },
        },
      },
    },
  });

  const result = bookings.map((b) => ({
    bookingId: b.id,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    serviceType: b.appointment.serviceType?.title ?? null,
    originalDate: b.appointment.date,
    originalTime: b.appointment.time,
  }));

  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceProviderId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { bookingId, appointmentId, clientName, clientPhone } = body as {
    bookingId?: string;
    appointmentId?: string;
    clientName?: string;
    clientPhone?: string;
  };

  if (!bookingId || typeof bookingId !== "string")
    return NextResponse.json({ error: "El campo 'bookingId' es obligatorio", field: "bookingId" }, { status: 422 });
  if (!appointmentId || typeof appointmentId !== "string")
    return NextResponse.json({ error: "El campo 'appointmentId' es obligatorio", field: "appointmentId" }, { status: 422 });
  if (!clientName || typeof clientName !== "string")
    return NextResponse.json({ error: "El campo 'clientName' es obligatorio", field: "clientName" }, { status: 422 });
  if (!clientPhone || typeof clientPhone !== "string")
    return NextResponse.json({ error: "El campo 'clientPhone' es obligatorio", field: "clientPhone" }, { status: 422 });

  // Verify original booking exists and belongs to provider
  const originalBooking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      status: "requires_reschedule",
      appointment: { serviceProviderId },
    },
    select: { id: true },
  });
  if (!originalBooking)
    return NextResponse.json({ error: "Reserva original no encontrada o no pertenece al proveedor" }, { status: 404 });

  // Verify new appointment belongs to provider
  const newAppointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, serviceProviderId },
    select: { id: true, booking: { select: { id: true, status: true } } },
  });
  if (!newAppointment)
    return NextResponse.json({ error: "El turno seleccionado no existe o no pertenece al proveedor" }, { status: 404 });

  // Check slot availability — no active booking allowed
  const hasActiveBooking =
    newAppointment.booking !== null &&
    newAppointment.booking.status !== "cancelled" &&
    newAppointment.booking.status !== "requires_reschedule";
  if (hasActiveBooking)
    return NextResponse.json({ error: "El slot seleccionado ya tiene una reserva activa" }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });
    await tx.booking.create({
      data: {
        appointmentId,
        clientName,
        clientPhone,
        status: "confirmed",
      },
    });
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
