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

  // Sin días → una sola vez en la próxima ocurrencia de esa hora.
  const oneTimeDate = daysOfWeek.length === 0 ? nextOneTimeDate(body.time) : null;

  const reminder = await prisma.notaReminder.create({
    data: { notaId, deviceId, text, time: body.time, daysOfWeek, oneTimeDate },
  });
  return NextResponse.json({ reminder }, { status: 201 });
}
