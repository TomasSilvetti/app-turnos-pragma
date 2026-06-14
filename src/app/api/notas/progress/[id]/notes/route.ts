import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";

type Ctx = { params: Promise<{ id: string }> };

async function progressDelDevice(id: string) {
  return prisma.notaProgress.findUnique({
    where: { id },
    select: { id: true, count: true, hasGoal: true, goal: true, nota: { select: { deviceId: true } } },
  });
}

// GET: lista las mini notas del progreso, en orden de creación.
export async function GET(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const actual = await progressDelDevice(id);
  if (!actual || actual.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const notes = await prisma.notaProgressNote.findMany({
    where: { progressId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, text: true, createdAt: true },
  });
  return NextResponse.json({ notes });
}

// POST: registra un toque del progreso. Crea una mini nota (texto opcional) y
// suma el puntito (incrementa el contador). Respeta el tope del objetivo.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const actual = await progressDelDevice(id);
  if (!actual || actual.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Tope alcanzado: no se suma ni se crea nota.
  if (actual.hasGoal && actual.goal != null && actual.count >= actual.goal) {
    const progress = await prisma.notaProgress.findUnique({ where: { id } });
    return NextResponse.json({ progress, note: null });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.slice(0, 280) : "";

  const [note, progress] = await prisma.$transaction([
    prisma.notaProgressNote.create({ data: { progressId: id, text } }),
    prisma.notaProgress.update({ where: { id }, data: { count: { increment: 1 } } }),
  ]);

  return NextResponse.json({ progress, note }, { status: 201 });
}
