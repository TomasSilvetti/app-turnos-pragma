import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";

type Ctx = { params: Promise<{ noteId: string }> };

// PATCH: edita el color o texto de la mini nota (sin cambiar el contador).
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { noteId } = await ctx.params;

  const note = await prisma.notaProgressNote.findUnique({
    where: { id: noteId },
    select: { id: true, progress: { select: { nota: { select: { deviceId: true } } } } },
  });
  if (!note || note.progress.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, string> = {};
  if (typeof body?.dotColor === "string") data.dotColor = body.dotColor === "red" ? "red" : "green";
  if (typeof body?.text === "string") data.text = body.text.slice(0, 280);

  const updated = await prisma.notaProgressNote.update({ where: { id: noteId }, data });
  return NextResponse.json({ note: updated });
}

// DELETE: elimina la mini nota y resta el puntito (decrementa el contador).
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { noteId } = await ctx.params;

  const note = await prisma.notaProgressNote.findUnique({
    where: { id: noteId },
    select: { id: true, progressId: true, progress: { select: { count: true, nota: { select: { deviceId: true } } } } },
  });
  if (!note || note.progress.nota.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const nuevoCount = Math.max(0, note.progress.count - 1);
  const [, progress] = await prisma.$transaction([
    prisma.notaProgressNote.delete({ where: { id: noteId } }),
    prisma.notaProgress.update({ where: { id: note.progressId }, data: { count: nuevoCount } }),
  ]);

  return NextResponse.json({ progress });
}
