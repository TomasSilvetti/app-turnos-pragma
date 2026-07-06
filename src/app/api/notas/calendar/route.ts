import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esHoraValida } from "@/lib/notas/time";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Normaliza los minutos-antes de los recordatorios: enteros 0..10080 (hasta 1 semana),
// sin duplicados y ordenados. Máximo 10 recordatorios por actividad.
export function normalizarOffsets(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<number>();
  for (const v of input) {
    const n = Math.trunc(Number(v));
    if (Number.isFinite(n) && n >= 0 && n <= 10080) set.add(n);
  }
  return [...set].sort((a, b) => a - b).slice(0, 10);
}

// GET: eventos del calendario del device en un rango [from, to] (yyyy-MM-dd).
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const where: { deviceId: string; date?: { gte?: string; lte?: string } } = { deviceId };
  if (from && FECHA_RE.test(from)) where.date = { ...where.date, gte: from };
  if (to && FECHA_RE.test(to)) where.date = { ...where.date, lte: to };

  const events = await prisma.notaCalendarEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ events });
}

// POST: crea un evento. Acepta `id` opcional (generado por el cliente) para que
// los eventos creados sin conexión conserven su id al sincronizarse.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !FECHA_RE.test(body.date)) {
    return NextResponse.json({ error: "Fecha inválida (yyyy-MM-dd)" }, { status: 400 });
  }
  if (!esHoraValida(body.startTime) || !esHoraValida(body.endTime)) {
    return NextResponse.json({ error: "Horario inválido (HH:mm 24hs)" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const color = typeof body.color === "string" ? body.color.slice(0, 20) : "blue";
  const reminderOffsets = normalizarOffsets(body.reminderOffsets);

  const event = await prisma.notaCalendarEvent.create({
    data: {
      ...(typeof body.id === "string" && body.id ? { id: body.id } : {}),
      deviceId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      title,
      color,
      reminderOffsets,
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}
