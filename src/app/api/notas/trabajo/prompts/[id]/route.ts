import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado, noEncontrado } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// PUT: guarda el contenido del prompt mientras se escribe (autosave del editor).
export async function PUT(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const actual = await prisma.trabajoPrompt.findUnique({
    where: { id },
    select: { id: true, item: { select: { deviceId: true } } },
  });
  if (!actual || actual.item.deviceId !== deviceId) return noEncontrado();

  const body = await request.json().catch(() => null);
  if (!body?.contenido || typeof body.contenido !== "object") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const prompt = await prisma.trabajoPrompt.update({
    where: { id },
    data: { contenido: body.contenido },
    select: { id: true, updatedAt: true },
  });
  return NextResponse.json({ prompt });
}
