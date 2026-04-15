import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      name: true,
      logoUrl: true,
      address: true,
      phone: true,
      cbu: true,
      alias: true,
      theme: true,
      brandColor: true,
      sucursales: {
        select: {
          id: true,
          name: true,
          address: true,
          empleados: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 404 }
    );
  }

  const sucursales = profile.sucursales
    .filter((s) => s.empleados.length > 0)
    .map((s) => ({ id: s.id, name: s.name, address: s.address }));

  return NextResponse.json({ ...profile, sucursales });
}
