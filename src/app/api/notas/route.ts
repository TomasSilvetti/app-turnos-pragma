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

// POST: crea una nota vacía y la devuelve.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const nota = await prisma.nota.create({
    data: { deviceId, title: "", content: DOC_VACIO },
    select: { id: true, title: true, content: true, updatedAt: true },
  });
  return NextResponse.json({ nota }, { status: 201 });
}
