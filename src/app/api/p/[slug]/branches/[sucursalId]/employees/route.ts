import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; sucursalId: string }> }
) {
  const { slug, sucursalId } = await params;

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const sucursal = await prisma.sucursal.findFirst({
    where: { id: sucursalId, businessProfileId: profile.id },
    select: {
      empleados: {
        select: {
          serviceProvider: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!sucursal) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  const employees = sucursal.empleados.map((e) => ({
    id: e.serviceProvider.id,
    name: e.serviceProvider.name,
  }));

  return NextResponse.json(employees);
}
