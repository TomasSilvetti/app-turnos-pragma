import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const { clientName, clientSurname, clientPhone, appointmentId, serviceTypeId } = body;

  if (!clientName || !clientSurname || !clientPhone || !appointmentId) {
    return NextResponse.json(
      { error: "Los campos clientName, clientSurname, clientPhone y appointmentId son requeridos" },
      { status: 400 }
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
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
      select: { serviceProviderId: true },
    });

    if (!serviceType || serviceType.serviceProviderId !== appointment.serviceProviderId) {
      return NextResponse.json({ error: "serviceTypeId inválido o no pertenece al proveedor" }, { status: 400 });
    }
  }

  const fullName = `${clientName.trim()} ${clientSurname.trim()}`;

  const booking = await prisma.booking.upsert({
    where: { appointmentId },
    update: {
      clientName: fullName,
      clientPhone: clientPhone.trim(),
      status: "pending",
    },
    create: {
      appointmentId,
      clientName: fullName,
      clientPhone: clientPhone.trim(),
      status: "pending",
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
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
