import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

async function getBusinessProfileId(serviceProviderId: string): Promise<string | null> {
  const bp = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });
  return bp?.id ?? null;
}

export const PUT = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfileId = await getBusinessProfileId(req.auth.user.id);
  if (!businessProfileId) {
    return NextResponse.json({ error: "Perfil de empresa no encontrado" }, { status: 404 });
  }

  const { id } = await context.params;

  const existing = await prisma.sucursal.findFirst({
    where: { id, businessProfileId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { name, address } = body;

  if (!name || !address) {
    return NextResponse.json({ error: "Los campos nombre y dirección son obligatorios" }, { status: 400 });
  }

  const updated = await prisma.sucursal.update({
    where: { id },
    data: { name: name.trim(), address: address.trim() },
    select: { id: true, name: true, address: true, businessProfileId: true, updatedAt: true },
  });

  return NextResponse.json(updated, { status: 200 });
});

export const DELETE = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfileId = await getBusinessProfileId(req.auth.user.id);
  if (!businessProfileId) {
    return NextResponse.json({ error: "Perfil de empresa no encontrado" }, { status: 404 });
  }

  const { id } = await context.params;

  const existing = await prisma.sucursal.findFirst({
    where: { id, businessProfileId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  await prisma.sucursal.delete({ where: { id } });

  return NextResponse.json({ message: "Sucursal eliminada correctamente" }, { status: 200 });
});
