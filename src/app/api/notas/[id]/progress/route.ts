import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";

type Ctx = { params: Promise<{ id: string }> };

// POST: crea una barra/contador de progreso para la nota.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: notaId } = await ctx.params;

  const nota = await prisma.nota.findUnique({ where: { id: notaId }, select: { deviceId: true } });
  if (!nota || nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const hasGoal = body?.hasGoal === true;
  const goal = hasGoal ? Math.max(1, Math.trunc(Number(body?.goal) || 1)) : null;
  const label = typeof body?.label === "string" ? body.label.slice(0, 120) : "";
  const color = typeof body?.color === "string" ? body.color : "blue";

  const progress = await prisma.notaProgress.create({
    data: { notaId, hasGoal, goal, label, color, count: 0 },
  });
  return NextResponse.json({ progress }, { status: 201 });
}
