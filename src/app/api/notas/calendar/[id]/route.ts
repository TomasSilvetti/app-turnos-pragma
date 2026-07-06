import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esHoraValida } from "@/lib/notas/time";

type Ctx = { params: Promise<{ id: string }> };

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

async function eventoDelDevice(id: string, deviceId: string) {
  const ev = await prisma.notaCalendarEvent.findUnique({ where: { id }, select: { id: true, deviceId: true } });
  return ev && ev.deviceId === deviceId ? ev : null;
}

// PUT: edita un evento del calendario.
export async function PUT(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  if (!(await eventoDelDevice(id, deviceId))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, string> = {};
  if (typeof body.date === "string" && FECHA_RE.test(body.date)) data.date = body.date;
  if (typeof body.startTime === "string" && esHoraValida(body.startTime)) data.startTime = body.startTime;
  if (typeof body.endTime === "string" && esHoraValida(body.endTime)) data.endTime = body.endTime;
  if (typeof body.title === "string") data.title = body.title.slice(0, 200);
  if (typeof body.color === "string") data.color = body.color.slice(0, 20);

  const event = await prisma.notaCalendarEvent.update({ where: { id }, data });
  return NextResponse.json({ event });
}

// DELETE: elimina un evento del calendario.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  if (!(await eventoDelDevice(id, deviceId))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.notaCalendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
