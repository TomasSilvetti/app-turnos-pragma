import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getClientSession } from "@/lib/cliente-auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const { clientName, clientSurname, clientPhone, appointmentId, serviceTypeId } = body;

  if (!appointmentId) {
    return NextResponse.json({ error: "El campo appointmentId es requerido" }, { status: 400 });
  }

  // Intentar leer la sesión del cliente autenticado
  const clientSession = await getClientSession(request);

  // Determinar si es flujo autenticado o legacy
  const isAuthenticatedFlow = !!clientSession;
  const isLegacyFlow = !clientSession && clientName && clientSurname && clientPhone;

  if (!isAuthenticatedFlow && !isLegacyFlow) {
    return NextResponse.json(
      { error: "Se requiere autenticación o los campos clientName, clientSurname y clientPhone" },
      { status: 401 }
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      isActive: true,
      serviceProviderId: true,
      booking: { select: { status: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (!appointment.isActive) {
    return NextResponse.json({ error: "El turno no está disponible" }, { status: 409 });
  }

  if (appointment.booking?.status === "confirmed" || appointment.booking?.status === "pending") {
    return NextResponse.json({ error: "El turno ya fue reservado" }, { status: 409 });
  }

  if (serviceTypeId != null) {
    // Verificar que el tipo de turno pertenezca al mismo negocio del empleado
    const businessProfile = await prisma.businessProfile.findFirst({
      where: {
        OR: [
          { serviceProviderId: appointment.serviceProviderId },
          { empleados: { some: { serviceProviderId: appointment.serviceProviderId } } },
        ],
      },
      select: { id: true },
    });

    const serviceType = await prisma.serviceType.findFirst({
      where: { id: serviceTypeId, businessProfileId: businessProfile?.id },
    });

    if (!serviceType) {
      return NextResponse.json({ error: "serviceTypeId inválido o no pertenece al negocio" }, { status: 400 });
    }
  }

  // Preparar datos del booking según el flujo
  const bookingClientName = isAuthenticatedFlow
    ? `${clientSession.nombre} ${clientSession.apellido}`
    : `${clientName.trim()} ${clientSurname.trim()}`;

  const bookingClientPhone = isAuthenticatedFlow ? "" : clientPhone.trim();
  const bookingClienteId = isAuthenticatedFlow ? clientSession.clienteId : null;

  const booking = await prisma.booking.upsert({
    where: { appointmentId },
    update: {
      clientName: bookingClientName,
      clientPhone: bookingClientPhone,
      clienteId: bookingClienteId,
      status: "pending",
    },
    create: {
      appointmentId,
      clientName: bookingClientName,
      clientPhone: bookingClientPhone,
      clienteId: bookingClienteId,
      status: "pending",
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      clienteId: true,
      status: true,
    },
  });

  if (serviceTypeId != null) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { serviceTypeId },
    });
  }

  return NextResponse.json(booking, { status: 201 });
}
