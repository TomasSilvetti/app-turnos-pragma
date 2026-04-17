import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";


export async function GET(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug)
    return NextResponse.json({ error: "El parámetro 'slug' es obligatorio" }, { status: 400 });

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!businessProfile)
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const bookings = await prisma.booking.findMany({
    where: {
      clienteId: session.clienteId,
      status: { in: ["pending", "confirmed"] },
      appointment: {
        date: { gte: today },
        serviceProvider: {
          OR: [
            { businessProfile: { slug } },
            { empresas: { some: { businessProfileId: businessProfile.id } } },
          ],
        },
      },
    },
    select: {
      id: true,
      appointment: {
        select: {
          date: true,
          time: true,
          serviceProviderId: true,
          serviceType: { select: { title: true } },
          scheduleConfig: { select: { minAdvanceHours: true } },
        },
      },
    },
  });

  const result = bookings.map((b) => ({
    bookingId: b.id,
    date: b.appointment.date,
    time: b.appointment.time,
    serviceType: b.appointment.serviceType?.title ?? "",
    minAdvanceHours: b.appointment.scheduleConfig?.minAdvanceHours ?? 0,
    employeeId: b.appointment.serviceProviderId,
  }));

  return NextResponse.json(result, { status: 200 });
}
