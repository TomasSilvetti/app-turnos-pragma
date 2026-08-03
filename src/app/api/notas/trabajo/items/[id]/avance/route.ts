import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ESTADOS, noAutorizado, noEncontrado, resolveHarness, type EstadoItem } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// PATCH: el puente cierra o bloquea la tarea al terminar la sesión. El progreso
// intermedio no pasa por acá — viaja con el log.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const actual = await prisma.trabajoItem.findUnique({ where: { id }, select: { deviceId: true } });
  if (!actual || actual.deviceId !== deviceId) return noEncontrado();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Prisma.TrabajoItemUpdateInput = {};
  if (typeof body.pasoActual === "number") data.pasoActual = Math.trunc(body.pasoActual);
  if (typeof body.pasosTotales === "number") data.pasosTotales = Math.trunc(body.pasosTotales);
  if (typeof body.cuenta === "string") data.cuenta = body.cuenta;
  if (typeof body.motivoBloqueo === "string") data.motivoBloqueo = body.motivoBloqueo;

  if (typeof body.estado === "string" && ESTADOS.includes(body.estado as EstadoItem)) {
    data.estado = body.estado;
    if (body.estado === "completado") {
      data.completadoEn = new Date();
      data.sesionInicio = null;
      // Cerrar la tarea deja la barra llena aunque la sesión no haya llegado a
      // anotar el último paso: en pantalla, un ítem tildado al 80% no se
      // entiende.
      const item = await prisma.trabajoItem.findUnique({ where: { id }, select: { pasosTotales: true } });
      if (item && item.pasosTotales > 0) data.pasoActual = item.pasosTotales;
    }
    if (body.estado === "bloqueado") data.sesionInicio = null;
  }

  const item = await prisma.trabajoItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}
