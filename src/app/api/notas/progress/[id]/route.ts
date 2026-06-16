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

export async function GET(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const progress = await prisma.notaProgress.findUnique({ where: { id } });
  if (!progress) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const owner = await prisma.nota.findUnique({ where: { id: progress.notaId }, select: { deviceId: true } });
  if (owner?.deviceId !== deviceId) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const noteColors = await prisma.notaProgressNote.findMany({
    where: { progressId: id },
    orderBy: { createdAt: "asc" },
    select: { dotColor: true },
  });
  return NextResponse.json({ progress, noteDotColors: noteColors.map((n) => n.dotColor) });
}

// PATCH: incrementa (o decrementa) el contador de forma atómica. Body opcional { delta }.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const actual = await progressDelDevice(id);
  if (!actual || actual.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const delta = Number.isInteger(body?.delta) ? body.delta : 1;
  let nuevo = actual.count + delta;
  if (nuevo < 0) nuevo = 0;
  if (actual.hasGoal && actual.goal != null && nuevo > actual.goal) nuevo = actual.goal;

  const progress = await prisma.notaProgress.update({ where: { id }, data: { count: nuevo } });
  return NextResponse.json({ progress });
}

// PUT: edita parámetros (objetivo, etiqueta, color, tipo).
export async function PUT(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const actual = await progressDelDevice(id);
  if (!actual || actual.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.hasGoal === "boolean") {
    data.hasGoal = body.hasGoal;
    data.goal = body.hasGoal ? Math.max(1, Math.trunc(Number(body.goal) || 1)) : null;
  } else if (body.goal != null) {
    data.goal = Math.max(1, Math.trunc(Number(body.goal) || 1));
  }
  if (typeof body.label === "string") data.label = body.label.slice(0, 120);
  if (typeof body.color === "string") data.color = body.color;
  if (Number.isInteger(body.count)) data.count = Math.max(0, body.count);

  const progress = await prisma.notaProgress.update({ where: { id }, data });
  return NextResponse.json({ progress });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;

  const actual = await progressDelDevice(id);
  if (!actual || actual.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  await prisma.notaProgress.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
