import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const { clientName, clientSurname, clientPhone, appointmentId } = body;

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
      booking: { select: { status: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (!appointment.isActive) {
    return NextResponse.json({ error: "El turno no está disponible" }, { status: 409 });
  }

  if (appointment.booking?.status === "confirmed") {
    return NextResponse.json({ error: "El turno ya fue reservado" }, { status: 409 });
  }

  const fullName = `${clientName.trim()} ${clientSurname.trim()}`;

  const booking = await prisma.booking.upsert({
    where: { appointmentId },
    update: {
      clientName: fullName,
      clientPhone: clientPhone.trim(),
      status: "confirmed",
    },
    create: {
      appointmentId,
      clientName: fullName,
      clientPhone: clientPhone.trim(),
      status: "confirmed",
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
