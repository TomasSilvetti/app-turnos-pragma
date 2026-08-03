import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado, noEncontrado } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// PATCH: el interruptor de activar/desactivar del panel.
//
// Desactivar una cuenta que está corriendo una sesión la corta: el runner lo ve
// en la próxima consulta de `ordenes` y mata el árbol. Lo que la sesión escribió
// en disco queda, y la tarea la retoma otra cuenta desde ahí — por eso cortar es
// barato y no hay que esperar 90 minutos a que termine.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const actual = await prisma.harnessCuenta.findUnique({ where: { id }, select: { deviceId: true } });
  if (actual?.deviceId !== deviceId) return noEncontrado();

  const body = await request.json().catch(() => null);
  if (typeof body?.habilitada !== "boolean") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const cuenta = await prisma.harnessCuenta.update({
    where: { id },
    data: {
      habilitada: body.habilitada,
      // Al desactivarla se libera enseguida: el carril que la tenía va a pedir
      // otra en cuanto se entere, y dejarla marcada la excluiría de esa vuelta.
      ...(body.habilitada ? {} : { carril: null }),
    },
  });

  return NextResponse.json({ cuenta });
}
