import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";

export async function GET(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const appointmentId = request.nextUrl.searchParams.get("appointmentId");
  if (!appointmentId)
    return NextResponse.json({ error: "El parámetro 'appointmentId' es obligatorio" }, { status: 400 });

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      serviceProviderId: true,
      booking: { select: { id: true, status: true } },
    },
  });

  if (!appointment)
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  const ocupado =
    appointment.booking?.status === "pending" ||
    appointment.booking?.status === "confirmed";

  // Verificar si el cliente tiene al menos un booking activo con este profesional
  const respaldoBooking = await prisma.booking.findFirst({
    where: {
      clienteId: session.clienteId,
      status: { in: ["pending", "confirmed"] },
      appointment: { serviceProviderId: appointment.serviceProviderId },
    },
    select: { id: true },
  });

  const tieneRespaldo = !!respaldoBooking;

  // Verificar si ya está en la lista de espera de este profesional
  const entradaLista = await prisma.listaEspera.findUnique({
    where: {
      clienteId_serviceProviderId: {
        clienteId: session.clienteId,
        serviceProviderId: appointment.serviceProviderId,
      },
    },
    select: { id: true, estado: true },
  });

  const yaEnLista = !!entradaLista && entradaLista.estado === "activa";

  return NextResponse.json({ ocupado, tieneRespaldo, yaEnLista }, { status: 200 });
}
