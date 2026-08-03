import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveConsola, sesionDelDevice, sinPin } from "@/lib/notas/consola";
import { noEncontrado } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// GET: la conversación completa.
export async function GET(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;

  const sesion = await prisma.consolaSesion.findUnique({
    where: { id },
    include: { mensajes: { orderBy: { createdAt: "asc" } } },
  });
  if (!sesion || sesion.deviceId !== deviceId) return noEncontrado();
  return NextResponse.json({ sesion });
}

// PATCH: título, directorio, archivar y —lo que importa— cambiar de cuenta.
//
// Cambiar de cuenta acá es sólo escribir cuál: el carril copia el historial de
// la sesión a la carpeta de la cuenta nueva antes de retomarla, así la
// conversación sigue donde estaba. Eso es lo que Remote Control no puede hacer.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;
  if (!(await sesionDelDevice(id, deviceId))) return noEncontrado();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Prisma.ConsolaSesionUpdateInput = {};
  if (typeof body.titulo === "string") data.titulo = body.titulo;
  if (typeof body.directorio === "string") data.directorio = body.directorio;
  if (typeof body.cuenta === "string") data.cuenta = body.cuenta;
  if (typeof body.archivada === "boolean") data.archivada = body.archivada;
  // Destrabar a mano una sesión que quedó en "pensando" porque el carril murió.
  if (body.estado === "idle") {
    data.estado = "idle";
    data.error = null;
  }

  const sesion = await prisma.consolaSesion.update({ where: { id }, data });
  return NextResponse.json({ sesion });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;
  if (!(await sesionDelDevice(id, deviceId))) return noEncontrado();

  await prisma.consolaSesion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
