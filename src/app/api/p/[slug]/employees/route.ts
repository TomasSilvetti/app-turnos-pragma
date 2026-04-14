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
      serviceProvider: { select: { id: true, name: true, isActive: true, attendsAppointments: true } },
      empleados: {
        select: {
          serviceProvider: {
            select: { id: true, name: true, isActive: true, attendsAppointments: true },
          },
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const totalProviders =
    1 + profile.empleados.filter((e) => e.serviceProvider.isActive).length;

  const employees = [
    ...(profile.serviceProvider.attendsAppointments
      ? [{ id: profile.serviceProvider.id, name: profile.serviceProvider.name }]
      : []),
    ...profile.empleados
      .filter((e) => e.serviceProvider.isActive && e.serviceProvider.attendsAppointments)
      .map((e) => ({ id: e.serviceProvider.id, name: e.serviceProvider.name })),
  ];

  return NextResponse.json({ employees, totalProviders });
}
