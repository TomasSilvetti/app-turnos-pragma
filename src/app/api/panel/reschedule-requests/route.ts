import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const allProviderIds = await resolveProviderIds(session.user.id);

  const requests = await prisma.rescheduleRequest.findMany({
    where: {
      status: "pending",
      booking: {
        appointment: { serviceProviderId: { in: allProviderIds } },
      },
    },
    select: {
      id: true,
      requestedDate: true,
      requestedTime: true,
      booking: {
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
      },
      cliente: {
        select: { nombre: true, apellido: true, telefono: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = requests.map((r) => ({
    id: r.id,
    bookingId: r.booking.id,
    clientName: r.booking.clientName,
    clientPhone: r.cliente?.telefono ?? r.booking.clientPhone,
    appointmentType: r.booking.appointment.serviceType?.title ?? "",
    appointmentDate: r.booking.appointment.date,
    appointmentTime: r.booking.appointment.time,
    requestedDate: r.requestedDate,
    requestedTime: r.requestedTime,
  }));

  return NextResponse.json(result, { status: 200 });
}
