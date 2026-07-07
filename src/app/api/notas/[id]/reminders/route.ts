import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esHoraValida, nextOneTimeDate } from "@/lib/notas/time";

type Ctx = { params: Promise<{ id: string }> };

// POST: crea un recordatorio para la nota. Devuelve el reminder con su id
// (el editor inserta luego un nodo que referencia ese id).
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: notaId } = await ctx.params;

  const nota = await prisma.nota.findUnique({ where: { id: notaId }, select: { deviceId: true } });
  if (!nota || nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !esHoraValida(body.time)) {
    return NextResponse.json({ error: "Hora inválida (formato HH:mm 24hs)" }, { status: 400 });
  }

  const daysOfWeek: number[] = Array.isArray(body.daysOfWeek)
    ? body.daysOfWeek.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
    : [];
  const text = typeof body.text === "string" ? body.text.slice(0, 200) : "";

  // Recordatorio por intervalo: suena cada N minutos dentro de la ventana
  // [time, endTime], en los días marcados (o todos los días si no hay ninguno).
  // Id opcional del cliente (para recordatorios creados sin conexión).
  const idCliente = typeof body.id === "string" && body.id ? { id: body.id } : {};

  const interval = Number.isInteger(body.intervalMinutes) && body.intervalMinutes > 0 ? body.intervalMinutes : null;
  if (interval) {
    const endTime = esHoraValida(body.endTime) ? body.endTime : "23:59";
    const reminder = await prisma.notaReminder.create({
      data: { ...idCliente, notaId, deviceId, text, time: body.time, daysOfWeek, oneTimeDate: null, intervalMinutes: interval, endTime },
    });
    return NextResponse.json({ reminder }, { status: 201 });
  }

  // Sin días → una sola vez en la próxima ocurrencia de esa hora.
  const oneTimeDate = daysOfWeek.length === 0 ? nextOneTimeDate(body.time) : null;

  const reminder = await prisma.notaReminder.create({
    data: { ...idCliente, notaId, deviceId, text, time: body.time, daysOfWeek, oneTimeDate },
  });
  return NextResponse.json({ reminder }, { status: 201 });
}
