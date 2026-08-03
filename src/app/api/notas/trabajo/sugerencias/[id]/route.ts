import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado, noEncontrado } from "@/lib/notas/trabajo";
import { bidDe, bloquesDe, type DocTiptap } from "@/lib/notas/bandeja";

type Ctx = { params: Promise<{ id: string }> };

async function sugerenciaDelDevice(id: string, deviceId: string) {
  const s = await prisma.trabajoSugerencia.findUnique({
    where: { id },
    include: { bandeja: { select: { id: true, deviceId: true, contenido: true } } },
  });
  return s && s.bandeja.deviceId === deviceId ? s : null;
}

// PATCH: título, proyecto y —lo que hace el arrastre de la ventana— los bordes
// del rango. El cliente manda el bid del bloque al que hizo snap.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const actual = await sugerenciaDelDevice(id, deviceId);
  if (!actual) return noEncontrado();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const bids = new Set(bloquesDe(actual.bandeja.contenido as DocTiptap).map(bidDe).filter(Boolean) as string[]);
  const data: Prisma.TrabajoSugerenciaUpdateInput = {};
  if (typeof body.titulo === "string") data.titulo = body.titulo;
  if (typeof body.proyecto === "string") data.proyecto = body.proyecto;
  if (typeof body.desdeBid === "string" && bids.has(body.desdeBid)) data.desdeBid = body.desdeBid;
  if (typeof body.hastaBid === "string" && bids.has(body.hastaBid)) data.hastaBid = body.hastaBid;

  const sugerencia = await prisma.trabajoSugerencia.update({ where: { id }, data });
  return NextResponse.json({ sugerencia });
}

// DELETE: descarta la ventana. El texto de la bandeja no se toca — descartar es
// decir "esto no es una tarea", no "esto no va".
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  if (!(await sugerenciaDelDevice(id, deviceId))) return noEncontrado();
  await prisma.trabajoSugerencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
