import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

// GET /api/schedule-configs/disabled-slots?configId=xxx&date=YYYY-MM-DD
export const GET = auth(async (request: NextAuthRequest) => {
  if (!request.auth?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const configId = request.nextUrl.searchParams.get("configId");
  const date = request.nextUrl.searchParams.get("date"); // YYYY-MM-DD

  if (!configId || !date) {
    return NextResponse.json({ error: "configId y date son obligatorios" }, { status: 400 });
  }

  const disabledSlots = await prisma.disabledSlot.findMany({
    where: { scheduleConfigId: configId, date },
    select: { time: true },
  });

  return NextResponse.json({ disabledSlots });
});

// POST /api/schedule-configs/disabled-slots
// body: { configId, date, time }
export const POST = auth(async (request: NextAuthRequest) => {
  if (!request.auth?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { configId, date, time } = body;

  if (!configId || !date || !time) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const businessProfileId = (request.auth.user as { businessProfileId?: string | null }).businessProfileId;

  const config = await prisma.scheduleConfig.findFirst({
    where: { id: configId, businessProfileId: businessProfileId ?? undefined },
  });

  if (!config) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });
  }

  const existing = await prisma.disabledSlot.findFirst({
    where: { scheduleConfigId: configId, date, time },
  });

  const disabled = existing ?? await prisma.disabledSlot.create({
    data: { scheduleConfigId: configId, date, time },
  });

  return NextResponse.json(disabled, { status: 201 });
});

// DELETE /api/schedule-configs/disabled-slots
// body: { configId, date, time }
export const DELETE = auth(async (request: NextAuthRequest) => {
  if (!request.auth?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { configId, date, time } = body;

  if (!configId || !date || !time) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  await prisma.disabledSlot.deleteMany({
    where: { scheduleConfigId: configId, date, time },
  });

  return NextResponse.json({ ok: true });
});
