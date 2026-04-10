import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

const DAYS_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const DAYS_MAP: Record<string, number> = { L: 0, M: 1, X: 2, J: 3, V: 4, S: 5, D: 6 };

function intsToStrings(days: number[]): string[] {
  return days.map((d) => DAYS_LABELS[d]).filter(Boolean) as string[];
}

function stringsToInts(days: (string | number)[]): number[] {
  return days
    .map((d) => (typeof d === "number" ? d : (DAYS_MAP[d] ?? -1)))
    .filter((d) => d !== -1);
}

export const GET = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: req.auth.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
  }

  const scheduleConfigs = await prisma.scheduleConfig.findMany({
    where: { businessProfileId: businessProfile.id },
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

  return NextResponse.json(
    scheduleConfigs.map((c) => ({ ...c, daysOfWeek: intsToStrings(c.daysOfWeek) })),
    { status: 200 }
  );
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
    return NextResponse.json({ error: "Perfil de negocio no encontrado" }, { status: 404 });
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

  const daysOfWeekInts = stringsToInts(daysOfWeek);

  if (startTime >= endTime) {
    return NextResponse.json({ error: "startTime debe ser menor a endTime" }, { status: 400 });
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor o igual a cero" }, { status: 400 });
  }

  const scheduleConfig = await prisma.scheduleConfig.create({
    data: {
      name,
      startTime,
      endTime,
      intervalMinutes: Number(intervalMinutes),
      daysOfWeek: daysOfWeekInts,
      price: parsedPrice,
      businessProfileId: businessProfile.id,
      ...(Array.isArray(serviceTypeIds) && serviceTypeIds.length > 0
        ? { serviceTypes: { connect: serviceTypeIds.map((id: string) => ({ id })) } }
        : {}),
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

  return NextResponse.json(
    { ...scheduleConfig, daysOfWeek: intsToStrings(scheduleConfig.daysOfWeek) },
    { status: 201 }
  );
});
