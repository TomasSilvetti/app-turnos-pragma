import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";
import { sendPushToServiceProvider, sendEmailToServiceProvider } from "@/lib/push-notifications";


export async function POST(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { bookingId, requestedDate, requestedTime } = body as {
    bookingId?: string;
    requestedDate?: string;
    requestedTime?: string;
  };

  if (!bookingId || typeof bookingId !== "string")
    return NextResponse.json(
      { error: "El campo 'bookingId' es obligatorio", field: "bookingId" },
      { status: 422 }
    );
  if (
    !requestedDate ||
    typeof requestedDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
  )
    return NextResponse.json(
      { error: "El campo 'requestedDate' debe tener el formato YYYY-MM-DD", field: "requestedDate" },
      { status: 422 }
    );
  if (
    !requestedTime ||
    typeof requestedTime !== "string" ||
    !/^\d{2}:\d{2}$/.test(requestedTime)
  )
    return NextResponse.json(
      { error: "El campo 'requestedTime' debe tener el formato HH:MM", field: "requestedTime" },
      { status: 422 }
    );

  const today = new Date().toISOString().split("T")[0];
  if (requestedDate < today)
    return NextResponse.json(
      { error: "La fecha solicitada no puede ser en el pasado", field: "requestedDate" },
      { status: 422 }
    );

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clienteId: session.clienteId },
    select: {
      id: true,
      clientName: true,
      status: true,
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
      { error: "Solo se pueden reprogramar turnos pendientes o confirmados" },
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
          error: `No podés solicitar la reprogramación. Se requiere un mínimo de ${minAdvanceHours} hora${minAdvanceHours === 1 ? "" : "s"} de anticipación.`,
          minAdvanceHours,
        },
        { status: 422 }
      );
    }
  }

  const existingRequest = await prisma.rescheduleRequest.findFirst({
    where: { bookingId, status: "pending" },
    select: { id: true },
  });
  if (existingRequest)
    return NextResponse.json(
      { error: "Ya existe una solicitud de reprogramación pendiente para este turno" },
      { status: 409 }
    );

  const rescheduleRequest = await prisma.rescheduleRequest.create({
    data: {
      bookingId,
      clienteId: session.clienteId,
      requestedDate,
      requestedTime,
      status: "pending",
    },
  });

  // Notificar al empleado
  const currentDateStr = booking.appointment.date.split("-").reverse().join("/");
  const requestedDateStr = requestedDate.split("-").reverse().join("/");
  const serviceInfo = booking.appointment.serviceType?.title
    ? ` · ${booking.appointment.serviceType.title}`
    : "";
  const title = "Solicitud de reprogramación";
  const body = `${booking.clientName} solicitó reprogramar su turno del ${currentDateStr} a las ${booking.appointment.time} hs${serviceInfo} al ${requestedDateStr} a las ${requestedTime} hs.`;

  sendPushToServiceProvider(booking.appointment.serviceProviderId, { title, body }).catch(() => {});
  sendEmailToServiceProvider(booking.appointment.serviceProviderId, { title, body }).catch(() => {});

  return NextResponse.json({ id: rescheduleRequest.id }, { status: 201 });
}
