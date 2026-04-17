import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const date = request.nextUrl.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "El parámetro 'date' es obligatorio y debe tener el formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { serviceProviderId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      serviceProviderId: profile.serviceProviderId,
      date,
      isActive: true,
      OR: [
        { booking: { is: null } },
        { booking: { status: "cancelled" } },
      ],
    },
    select: {
      id: true,
      time: true,
      scheduleConfig: { select: { price: true } },
    },
    orderBy: { time: "asc" },
  });

  const result = appointments.map((a) => ({
    id: a.id,
    time: a.time,
    price: a.scheduleConfig ? Number(a.scheduleConfig.price) : null,
  }));

  return NextResponse.json({ appointments: result });
}
