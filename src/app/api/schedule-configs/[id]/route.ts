import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

export const PUT = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId: businessProfile.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  const body = await req.json();
  const { name, startTime, endTime, intervalMinutes, daysOfWeek, price, serviceTypeIds } = body;

  if (!name || !startTime || !endTime || intervalMinutes === undefined || !daysOfWeek || price === undefined) {
    return NextResponse.json(
      { error: "Los campos name, startTime, endTime, intervalMinutes, daysOfWeek y price son requeridos" },
      { status: 400 }
    );
  }

  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
    return NextResponse.json({ error: "daysOfWeek debe ser un array con al menos un día" }, { status: 400 });
  }

  if (startTime >= endTime) {
    return NextResponse.json({ error: "startTime debe ser menor a endTime" }, { status: 400 });
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor o igual a cero" }, { status: 400 });
  }

  const updated = await prisma.scheduleConfig.update({
    where: { id },
    data: {
      name,
      startTime,
      endTime,
      intervalMinutes: Number(intervalMinutes),
      daysOfWeek,
      price: parsedPrice,
      serviceTypes: {
        set: Array.isArray(serviceTypeIds)
          ? serviceTypeIds.map((stId: string) => ({ id: stId }))
          : [],
      },
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      startTime: true,
      endTime: true,
      intervalMinutes: true,
      daysOfWeek: true,
      price: true,
      serviceTypes: { select: { id: true, title: true } },
    },
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

  const { id } = await context.params;

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, businessProfileId: businessProfile.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 403 });
  }

  await prisma.scheduleConfig.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
