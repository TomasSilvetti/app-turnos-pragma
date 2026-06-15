import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esHoraValida, nextOneTimeDate } from "@/lib/notas/time";

type Ctx = { params: Promise<{ id: string }> };

async function reminderDelDevice(id: string, deviceId: string) {
  const r = await prisma.notaReminder.findUnique({ where: { id }, select: { id: true, deviceId: true } });
  return r && r.deviceId === deviceId ? r : null;
}

// PUT: edita hora / días / texto / habilitado del recordatorio.
export async function PUT(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await reminderDelDevice(id, deviceId))) {
    return NextResponse.json({ error: "Recordatorio no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.time === "string") {
    if (!esHoraValida(body.time)) return NextResponse.json({ error: "Hora inválida" }, { status: 400 });
    data.time = body.time;
  }

  // Tipo intervalo: suena cada N minutos en la ventana [time, endTime].
  const interval = Number.isInteger(body.intervalMinutes) && body.intervalMinutes > 0 ? body.intervalMinutes : null;
  if ("intervalMinutes" in body) {
    data.intervalMinutes = interval;
    data.endTime = interval ? (esHoraValida(body.endTime) ? body.endTime : "23:59") : null;
  }

  if (Array.isArray(body.daysOfWeek)) {
    const days = body.daysOfWeek.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);
    data.daysOfWeek = days;
    // Los de intervalo no usan oneTimeDate (días vacíos = todos los días).
    data.oneTimeDate = interval ? null : days.length === 0 ? nextOneTimeDate(body.time ?? "09:00") : null;
  }
  if (typeof body.text === "string") data.text = body.text.slice(0, 200);
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  // Al editar, permitir que vuelva a dispararse.
  data.lastFiredKey = null;

  const reminder = await prisma.notaReminder.update({ where: { id }, data });
  return NextResponse.json({ reminder });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await reminderDelDevice(id, deviceId))) {
    return NextResponse.json({ error: "Recordatorio no encontrado" }, { status: 404 });
  }
  await prisma.notaReminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
