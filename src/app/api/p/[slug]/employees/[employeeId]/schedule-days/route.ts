import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/p/[slug]/employees/[employeeId]/schedule-days
// Devuelve los días de semana (0=Dom ... 6=Sáb) con horario activo configurado
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; employeeId: string }> }
) {
  const { slug, employeeId } = await params;

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const configs = await prisma.scheduleConfig.findMany({
    where: {
      businessProfileId: profile.id,
      serviceProviderId: employeeId,
      isActive: true,
    },
    select: { daysOfWeek: true },
  });

  const daysOfWeek = [...new Set(configs.flatMap((c) => c.daysOfWeek))].sort(
    (a, b) => a - b
  );

  return NextResponse.json({ daysOfWeek });
}
