import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";


export const GET = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de empresa no encontrado" }, { status: 404 });
  }

  const sucursales = await prisma.sucursal.findMany({
    where: { businessProfileId: businessProfile.id },
    select: { id: true, name: true, address: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const result = sucursales.map((s) => ({ ...s, employeeCount: 0 }));

  return NextResponse.json(result, { status: 200 });
});

export const POST = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de empresa no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const { name, address } = body;

  if (!name || !address) {
    return NextResponse.json({ error: "Los campos nombre y dirección son obligatorios" }, { status: 400 });
  }

  const sucursal = await prisma.sucursal.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      businessProfileId: businessProfile.id,
    },
    select: { id: true, name: true, address: true, businessProfileId: true, createdAt: true },
  });

  return NextResponse.json(sucursal, { status: 201 });
});
