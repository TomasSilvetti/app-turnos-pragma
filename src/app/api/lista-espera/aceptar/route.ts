import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";
import { emitNewBooking } from "@/lib/booking-emitter";
import { sendPushToCliente, sendEmailToCliente } from "@/lib/push-notifications";

export async function POST(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { token?: string; conservarRespaldo?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { token, conservarRespaldo } = body;
  if (!token)
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const entry = await prisma.listaEspera.findUnique({
    where: { notificacionToken: token },
    select: {
      id: true,
      clienteId: true,
      serviceProviderId: true,
      estado: true,
      notificacionTokenExp: true,
      vacanteTurnoId: true,
      bookingIdRespaldo: true,
    },
  });

  if (!entry || entry.estado !== "notificada")
    return NextResponse.json({ error: "Token inválido" }, { status: 410 });

  if (entry.clienteId !== session.clienteId)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  if (entry.notificacionTokenExp && entry.notificacionTokenExp < new Date())
    return NextResponse.json({ error: "El token expiró" }, { status: 410 });

  if (!entry.vacanteTurnoId)
    return NextResponse.json({ error: "Turno vacante no encontrado" }, { status: 410 });

  const turno = await prisma.appointment.findUnique({
    where: { id: entry.vacanteTurnoId },
    select: {
      id: true,
      date: true,
      time: true,
      serviceProviderId: true,
      booking: { select: { status: true } },
    },
  });

  if (!turno)
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  if (turno.booking?.status === "pending" || turno.booking?.status === "confirmed")
    return NextResponse.json({ error: "El turno ya fue tomado por otro cliente" }, { status: 409 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: session.clienteId },
    select: { nombre: true, apellido: true, telefono: true },
  });

  if (!cliente)
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  // Obtener otras entradas notificadas para este turno (para notificar que fue tomado)
  const otrosNotificados = await prisma.listaEspera.findMany({
    where: {
      vacanteTurnoId: entry.vacanteTurnoId,
      estado: "notificada",
      clienteId: { not: session.clienteId },
    },
    select: { clienteId: true },
  });

  const nuevoBooking = await prisma.$transaction(async (tx) => {
    // Crear booking para el turno vacante
    const booking = await tx.booking.create({
      data: {
        appointmentId: entry.vacanteTurnoId!,
        clientName: `${cliente.nombre} ${cliente.apellido}`,
        clientPhone: cliente.telefono ?? "",
        clienteId: session.clienteId,
        status: "pending",
      },
    });

    // Cancelar respaldo si corresponde
    if (!conservarRespaldo && entry.bookingIdRespaldo) {
      await tx.booking.update({
        where: { id: entry.bookingIdRespaldo },
        data: { status: "cancelled" },
      });
    }

    // Eliminar entrada de la lista
    await tx.listaEspera.delete({ where: { id: entry.id } });

    return booking;
  });

  emitNewBooking();

  // Notificar a otros clientes en estado "notificada" que el turno fue tomado
  for (const otro of otrosNotificados) {
    const notifPayload = {
      title: "Turno tomado",
      body: "El turno ya fue tomado por otro cliente. Seguís en la lista para la próxima vacante.",
    };
    sendPushToCliente(otro.clienteId, notifPayload).catch(() => {});
    sendEmailToCliente(otro.clienteId, notifPayload).catch(() => {});
  }

  return NextResponse.json({ success: true, bookingId: nuevoBooking.id }, { status: 201 });
}
