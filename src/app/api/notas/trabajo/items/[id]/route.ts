import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import {
  ESTADOS,
  borrarImagenesDeItem,
  itemDelDevice,
  noAutorizado,
  noEncontrado,
  type EstadoItem,
} from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// GET: el ítem completo — prompts y log con sus imágenes. Es lo que se pide al
// desplegar el párrafo padre.
export async function GET(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const item = await prisma.trabajoItem.findUnique({
    where: { id },
    include: {
      prompts: {
        orderBy: { createdAt: "asc" },
        include: { imagenes: { select: { id: true, url: true, ancho: true, alto: true } } },
      },
      logs: {
        orderBy: { createdAt: "asc" },
        include: { imagenes: { select: { id: true, url: true, ancho: true, alto: true } } },
      },
    },
  });
  if (!item || item.deviceId !== deviceId) return noEncontrado();

  return NextResponse.json({ item });
}

// PATCH: título, proyecto, orden y movimientos de estado hechos a mano (tildar
// el checkbox, reabrir algo completado).
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;
  const actual = await itemDelDevice(id, deviceId);
  if (!actual) return noEncontrado();
  const estadoPrevio = actual.estado;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Prisma.TrabajoItemUpdateInput = {};
  if (typeof body.titulo === "string") data.titulo = body.titulo;
  if (typeof body.proyecto === "string") data.proyecto = body.proyecto;
  if (typeof body.orden === "number") data.orden = body.orden;
  if (typeof body.estado === "string" && ESTADOS.includes(body.estado as EstadoItem)) {
    data.estado = body.estado;
    // Tildar el checkbox cierra la tarea; destildarla la devuelve a la cola y
    // limpia la marca de completado, o el ítem quedaría con fecha de cierre y
    // trabajo por hacer al mismo tiempo.
    data.completadoEn = body.estado === "completado" ? new Date() : null;
    if (body.estado === "pendiente") {
      data.motivoBloqueo = null;
      data.sesionInicio = null;
      // Sacar a mano una tarea de bloqueados es decir "intentala de nuevo": sin
      // reiniciar los intentos, la cola la volvería a bloquear en la primera
      // vuelta y el botón no serviría para nada.
      if (estadoPrevio === "bloqueado") data.intentos = 0;
    }
    // Pausar no es fracasar, y por eso además de no sumar intentos hay que
    // DEVOLVER el que ya cobró la bajada de la sesión que estaba corriendo. Si
    // no, pausar y reanudar tres veces bloquea sola una tarea que nunca falló:
    // el mismo agujero por el que se fueron 17 ítems el 03/08, con otra puerta.
    if (body.estado === "pausada") {
      data.sesionInicio = null;
      if (estadoPrevio === "en_curso") {
        const previo = await prisma.trabajoItem.findUnique({ where: { id }, select: { intentos: true } });
        data.intentos = Math.max(0, (previo?.intentos ?? 1) - 1);
      }
    }
  }

  const item = await prisma.trabajoItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

// DELETE: borra el ítem con su log, sus prompts y sus capturas del store.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;
  if (!(await itemDelDevice(id, deviceId))) return noEncontrado();

  const borradas = await borrarImagenesDeItem(id);
  await prisma.trabajoItem.delete({ where: { id } });
  return NextResponse.json({ ok: true, imagenesBorradas: borradas });
}
