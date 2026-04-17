import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";


function generateSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  if (intervalMinutes <= 0) return [];

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: string[] = [];
  for (let t = startTotal; t < endTotal; t += intervalMinutes) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ config: null, appointments: [] }, { status: 200 });
  }

  const config = await prisma.scheduleConfig.findFirst({
    where: { businessProfileId: businessProfile.id },
    include: { appointments: { orderBy: { time: "asc" } } },
  });

  if (!config) {
    return NextResponse.json({ config: null, appointments: [] }, { status: 200 });
  }

  return NextResponse.json(
    {
      config: {
        id: config.id,
        startTime: config.startTime,
        endTime: config.endTime,
        intervalMinutes: config.intervalMinutes,
        price: config.price,
      },
      appointments: config.appointments,
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { startTime, endTime, intervalMinutes, price } = body as Record<string, unknown>;

  if (!startTime || typeof startTime !== "string") {
    return NextResponse.json({ error: "El campo 'startTime' es obligatorio", field: "startTime" }, { status: 400 });
  }
  if (!endTime || typeof endTime !== "string") {
    return NextResponse.json({ error: "El campo 'endTime' es obligatorio", field: "endTime" }, { status: 400 });
  }
  if (intervalMinutes === undefined || intervalMinutes === null) {
    return NextResponse.json({ error: "El campo 'intervalMinutes' es obligatorio", field: "intervalMinutes" }, { status: 400 });
  }
  if (price === undefined || price === null) {
    return NextResponse.json({ error: "El campo 'price' es obligatorio", field: "price" }, { status: 400 });
  }

  const intervalNum = Number(intervalMinutes);
  if (!Number.isInteger(intervalNum) || intervalNum <= 0) {
    return NextResponse.json({ error: "'intervalMinutes' debe ser un entero positivo", field: "intervalMinutes" }, { status: 400 });
  }

  const priceNum = Number(price);
  if (isNaN(priceNum) || priceNum <= 0) {
    return NextResponse.json({ error: "'price' debe ser un número mayor a 0", field: "price" }, { status: 400 });
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return NextResponse.json({ error: "Formato de hora inválido, use HH:MM", field: "startTime" }, { status: 400 });
  }
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  if (endTotal <= startTotal) {
    return NextResponse.json({ error: "'endTime' debe ser posterior a 'startTime'", field: "endTime" }, { status: 400 });
  }

  const serviceProviderId = session.user.id;

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });

  if (!businessProfile) {
    return NextResponse.json({ error: "El prestador no tiene perfil de negocio" }, { status: 404 });
  }

  const slots = generateSlots(startTime, endTime, intervalNum);

  const existingConfig = await prisma.scheduleConfig.findFirst({
    where: { businessProfileId: businessProfile.id },
    select: { id: true },
  });

  let config;

  if (existingConfig) {
    config = await prisma.scheduleConfig.update({
      where: { id: existingConfig.id },
      data: {
        startTime,
        endTime,
        intervalMinutes: intervalNum,
        price: priceNum,
      },
      include: { appointments: { orderBy: { time: "asc" } } },
    });
  } else {
    config = await prisma.scheduleConfig.create({
      data: {
        name: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        intervalMinutes: intervalNum,
        price: priceNum,
        businessProfileId: businessProfile.id,
      },
      include: { appointments: { orderBy: { time: "asc" } } },
    });
  }

  return NextResponse.json(
    {
      config: {
        id: config.id,
        startTime: config.startTime,
        endTime: config.endTime,
        intervalMinutes: config.intervalMinutes,
        price: config.price,
      },
      appointments: config.appointments,
    },
    { status: 201 }
  );
}
