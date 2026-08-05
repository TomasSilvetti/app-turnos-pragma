import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { borrarImagenesDeItem, noAutorizado, noEncontrado } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// POST: todos los propuestos de este informe pasan a la cola de una vez.
//
// Existe como endpoint y no como quince PATCH desde el celular porque es
// exactamente lo que uno quiere hacer después de leer la lista: quince requests
// desde un teléfono con señal mala dejan la mitad aprobada y la mitad no.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const pedido = await prisma.trabajoPedidoArchivo.findUnique({ where: { id } });
  if (!pedido || pedido.deviceId !== deviceId) return noEncontrado();

  const { count } = await prisma.trabajoItem.updateMany({
    where: { pedidoArchivoId: id, deviceId, estado: "propuesto" },
    data: { estado: "pendiente" },
  });

  return NextResponse.json({ ok: true, aprobados: count });
}

// DELETE: descartar de una vez lo que quedó sin aprobar de este informe.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const pedido = await prisma.trabajoPedidoArchivo.findUnique({ where: { id } });
  if (!pedido || pedido.deviceId !== deviceId) return noEncontrado();

  // Uno por uno y no con un deleteMany: cada ítem tiene sus capturas en el
  // store, y borrar sólo las filas dejaría los blobs sin nadie que sepa que
  // existen. `borrarImagenesDeItem` es el que sabe cuáles no le quedan a nadie.
  const propuestos = await prisma.trabajoItem.findMany({
    where: { pedidoArchivoId: id, deviceId, estado: "propuesto" },
    select: { id: true },
  });
  for (const item of propuestos) {
    await borrarImagenesDeItem(item.id);
    await prisma.trabajoItem.delete({ where: { id: item.id } });
  }

  return NextResponse.json({ ok: true, descartados: propuestos.length });
}
