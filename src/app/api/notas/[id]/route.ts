import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";

type Ctx = { params: Promise<{ id: string }> };

// Verifica que la nota exista y pertenezca al device.
async function notaDelDevice(notaId: string, deviceId: string) {
  const nota = await prisma.nota.findUnique({ where: { id: notaId }, select: { id: true, deviceId: true } });
  return nota && nota.deviceId === deviceId ? nota : null;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const nota = await prisma.nota.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      deviceId: true,
      updatedAt: true,
    },
  });
  if (!nota || nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ nota });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  if (!(await notaDelDevice(id, deviceId))) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Prisma.NotaUpdateInput = {};
  if (typeof body.title === "string") data.title = body.title;
  if (body.content && typeof body.content === "object") {
    data.content = body.content as Prisma.InputJsonValue;
  }

  const nota = await prisma.nota.update({
    where: { id },
    data,
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ nota });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  if (!(await notaDelDevice(id, deviceId))) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }

  await prisma.nota.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
