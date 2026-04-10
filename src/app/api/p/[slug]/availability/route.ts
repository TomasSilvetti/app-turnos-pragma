import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const month = request.nextUrl.searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "El parámetro 'month' es obligatorio y debe tener el formato YYYY-MM" },
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
      isActive: true,
      date: { startsWith: month },
      OR: [
        { booking: { is: null } },
        { booking: { status: { not: "confirmed" } } },
      ],
    },
    select: { date: true },
  });

  const dates = [...new Set(appointments.map((a) => a.date))].sort();

  return NextResponse.json({ dates });
}
