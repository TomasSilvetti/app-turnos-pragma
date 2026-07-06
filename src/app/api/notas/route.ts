import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";

const DOC_VACIO = { type: "doc", content: [{ type: "paragraph" }] };

// GET: listado de notas del device (sin el contenido completo).
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notas = await prisma.nota.findMany({
    where: { deviceId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ notas });
}

// POST: crea una nota vacía y la devuelve. Acepta `id` opcional (generado por el
// cliente) para que las notas creadas sin conexión conserven su id al sincronizar.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" && body.id ? body.id : undefined;

  const nota = await prisma.nota.create({
    data: { ...(id ? { id } : {}), deviceId, title: "", content: DOC_VACIO },
    select: { id: true, title: true, content: true, updatedAt: true },
  });
  return NextResponse.json({ nota }, { status: 201 });
}
