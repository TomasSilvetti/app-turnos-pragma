import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";
import { emitNewBooking } from "@/lib/booking-emitter";


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
      status: true,
      appointment: {
        select: {
          date: true,
          time: true,
          scheduleConfig: { select: { minAdvanceHours: true } },
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

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  });

  emitNewBooking();

  return NextResponse.json({ success: true }, { status: 200 });
}
