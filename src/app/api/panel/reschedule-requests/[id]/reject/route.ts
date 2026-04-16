import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const prisma = new PrismaClient();

async function resolveProviderIds(serviceProviderId: string): Promise<string[]> {
  let businessProfileId: string | null = null;

  const bp = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });
  if (bp) {
    businessProfileId = bp.id;
  } else {
    const emp = await prisma.empleadoEmpresa.findFirst({
      where: { serviceProviderId },
      select: { businessProfileId: true },
    });
    businessProfileId = emp?.businessProfileId ?? null;
  }

  if (!businessProfileId) return [serviceProviderId];

  const members = await prisma.empleadoEmpresa.findMany({
    where: { businessProfileId },
    select: { serviceProviderId: true },
  });
  const ids = members.map((m) => m.serviceProviderId);
  if (!ids.includes(serviceProviderId)) ids.push(serviceProviderId);
  return ids;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const allProviderIds = await resolveProviderIds(session.user.id);

  const rescheduleRequest = await prisma.rescheduleRequest.findFirst({
    where: {
      id,
      booking: {
        appointment: { serviceProviderId: { in: allProviderIds } },
      },
    },
    select: {
      id: true,
      status: true,
      requestedDate: true,
      requestedTime: true,
      booking: {
        select: {
          clientName: true,
          clientPhone: true,
          appointment: { select: { date: true, time: true } },
        },
      },
      cliente: {
        select: { nombre: true, apellido: true, telefono: true },
      },
    },
  });

  if (!rescheduleRequest)
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  if (rescheduleRequest.status !== "pending")
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 422 });

  await prisma.rescheduleRequest.update({
    where: { id },
    data: { status: "rejected" },
  });

  const clientDisplayName = rescheduleRequest.cliente
    ? `${rescheduleRequest.cliente.nombre} ${rescheduleRequest.cliente.apellido}`
    : rescheduleRequest.booking.clientName;

  const clientPhone =
    rescheduleRequest.cliente?.telefono ?? rescheduleRequest.booking.clientPhone;

  const originalDateFormatted = format(
    parseISO(rescheduleRequest.booking.appointment.date),
    "d 'de' MMMM 'de' yyyy",
    { locale: es }
  );

  const whatsappMessage = [
    `Hola ${rescheduleRequest.cliente?.nombre ?? rescheduleRequest.booking.clientName}, lamentablemente no podemos aprobar tu solicitud de reprogramación.`,
    "",
    `Tu turno original del ${originalDateFormatted} a las ${rescheduleRequest.booking.appointment.time} hs permanece sin cambios.`,
    "",
    "Si necesitás más información, no dudes en contactarnos.",
  ].join("\n");

  return NextResponse.json({ clientPhone, whatsappMessage, clientDisplayName }, { status: 200 });
}
