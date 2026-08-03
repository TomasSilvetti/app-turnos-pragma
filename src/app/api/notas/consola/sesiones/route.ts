import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { DIRECTORIO_POR_DEFECTO, resolveConsola, sinPin } from "@/lib/notas/consola";

// GET: las conversaciones, para el selector de sesiones (el equivalente a
// /resume, pero pudiendo elegir con el título y la fecha a la vista).
export async function GET(request: NextRequest) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();

  const archivadas = request.nextUrl.searchParams.get("archivadas") === "1";
  const sesiones = await prisma.consolaSesion.findMany({
    where: { deviceId, archivada: archivadas },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { _count: { select: { mensajes: true } } },
  });
  return NextResponse.json({ sesiones });
}

// POST: sesión nueva (el equivalente a /clear).
//
// El `sessionId` lo genera la app y no el CLI: es lo que permite encontrar el
// archivo de historial dentro de cualquier carpeta de cuenta, que es como el
// cambio de cuenta conserva la conversación.
export async function POST(request: NextRequest) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();

  const body = await request.json().catch(() => ({}));
  const directorio = typeof body?.directorio === "string" && body.directorio ? body.directorio : DIRECTORIO_POR_DEFECTO;
  const cuenta = typeof body?.cuenta === "string" ? body.cuenta : null;

  const sesion = await prisma.consolaSesion.create({
    data: { deviceId, sessionId: randomUUID(), directorio, cuenta, titulo: "" },
  });
  return NextResponse.json({ sesion }, { status: 201 });
}
