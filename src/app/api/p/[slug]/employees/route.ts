import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      serviceProviderId: true,
      serviceProvider: { select: { id: true, name: true, isActive: true } },
      empleados: {
        select: {
          serviceProvider: {
            select: { id: true, name: true, isActive: true },
          },
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const employees = [
    { id: profile.serviceProvider.id, name: profile.serviceProvider.name },
    ...profile.empleados
      .filter((e) => e.serviceProvider.isActive)
      .map((e) => ({ id: e.serviceProvider.id, name: e.serviceProvider.name })),
  ];

  return NextResponse.json({ employees });
}
