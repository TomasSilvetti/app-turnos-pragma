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
      cliente: { select: { telefono: true } },
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
    clientPhone: b.cliente?.telefono ?? b.clientPhone,
    appointmentType: b.appointment.serviceType?.title ?? "",
    appointmentDate: b.appointment.date,
    appointmentTime: b.appointment.time,
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

  const { bookingId, appointmentId, clientName, clientPhone, date, requestedTime } = body as {
    bookingId?: string;
    appointmentId?: string;
    clientName?: string;
    clientPhone?: string;
    date?: string;
    requestedTime?: string;
  };

  if (!bookingId || typeof bookingId !== "string")
    return NextResponse.json({ error: "El campo 'bookingId' es obligatorio", field: "bookingId" }, { status: 422 });
  if (!clientName || typeof clientName !== "string")
    return NextResponse.json({ error: "El campo 'clientName' es obligatorio", field: "clientName" }, { status: 422 });
  if (!clientPhone || typeof clientPhone !== "string")
    return NextResponse.json({ error: "El campo 'clientPhone' es obligatorio", field: "clientPhone" }, { status: 422 });

  // --- POR_TIPO: se provee date + requestedTime en lugar de appointmentId ---
  if (!appointmentId && date && requestedTime) {
    function timeToMin(t: string) {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    }

    const originalBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        status: "requires_reschedule",
        appointment: { serviceProviderId },
      },
      select: {
        id: true,
        previousStatus: true,
        clienteId: true,
        appointment: {
          select: { serviceTypeId: true, serviceProviderId: true },
        },
      },
    });
    if (!originalBooking)
      return NextResponse.json({ error: "Reserva original no encontrada" }, { status: 404 });

    const apptProviderId = originalBooking.appointment.serviceProviderId;
    const serviceTypeId = originalBooking.appointment.serviceTypeId;

    let duracion = 30;
    if (serviceTypeId) {
      const st = await prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: { duracion: true },
      });
      if (st?.duracion) duracion = st.duracion;
    }

    const startMin = timeToMin(requestedTime);
    const endMin = startMin + duracion;

    const txResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findMany({
        where: {
          serviceProviderId: apptProviderId,
          date,
          isActive: true,
          booking: { status: { in: ["pending", "confirmed"] } },
        },
        select: { time: true, serviceType: { select: { duracion: true } } },
      });

      const overlaps = existing.some((a) => {
        const aStart = timeToMin(a.time);
        const aEnd = aStart + (a.serviceType?.duracion ?? duracion);
        return startMin < aEnd && endMin > aStart;
      });
      if (overlaps) return { conflict: true as const };

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "cancelled" },
      });

      const newAppointment = await tx.appointment.create({
        data: {
          time: requestedTime,
          date,
          serviceProviderId: apptProviderId,
          serviceTypeId,
          isActive: true,
        },
      });

      const newStatus = originalBooking.previousStatus === "pending" ? "pending" : "confirmed";
      await tx.booking.create({
        data: {
          appointmentId: newAppointment.id,
          clientName,
          clientPhone,
          clienteId: originalBooking.clienteId,
          status: newStatus,
        },
      });

      return { success: true as const };
    });

    if ("conflict" in txResult)
      return NextResponse.json({ error: "El horario seleccionado se superpone con un turno ya reservado" }, { status: 409 });

    return NextResponse.json({ success: true }, { status: 200 });
  }
  // --- fin POR_TIPO ---

  if (!appointmentId || typeof appointmentId !== "string")
    return NextResponse.json({ error: "El campo 'appointmentId' es obligatorio", field: "appointmentId" }, { status: 422 });

  // Verify original booking exists and belongs to provider
  const originalBooking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      status: "requires_reschedule",
      appointment: { serviceProviderId },
    },
    select: {
      id: true,
      previousStatus: true,
      appointment: { select: { serviceTypeId: true } },
    },
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

  const newStatus = originalBooking.previousStatus === "pending" ? "pending" : "confirmed";
  const originalServiceTypeId = originalBooking.appointment.serviceTypeId;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });
    if (originalServiceTypeId) {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { serviceTypeId: originalServiceTypeId },
      });
    }
    await tx.booking.create({
      data: {
        appointmentId,
        clientName,
        clientPhone,
        status: newStatus,
      },
    });
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
