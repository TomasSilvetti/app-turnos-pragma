import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado, noEncontrado } from "@/lib/notas/trabajo";
import { imagenesEnRango, quitarRango, recortarRango, type DocTiptap } from "@/lib/notas/bandeja";

type Ctx = { params: Promise<{ id: string }> };

// POST: la sugerencia se vuelve un ítem pendiente.
//
// Sus bloques salen del crudo. Como las demás sugerencias apuntan por bid y no
// por posición, sacarlos del medio no las corre ni las rompe: es exactamente
// para esto que se guardan ids.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const sugerencia = await prisma.trabajoSugerencia.findUnique({
    where: { id },
    include: { bandeja: true },
  });
  if (!sugerencia || sugerencia.bandeja.deviceId !== deviceId) return noEncontrado();

  const doc = sugerencia.bandeja.contenido as DocTiptap;
  const contenido = recortarRango(doc, sugerencia.desdeBid, sugerencia.hastaBid);
  if (!contenido) {
    return NextResponse.json({ error: "El rango ya no existe en la bandeja" }, { status: 409 });
  }

  const ultimo = await prisma.trabajoItem.findFirst({
    where: { deviceId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const item = await prisma.trabajoItem.create({
    data: {
      deviceId,
      titulo: sugerencia.titulo,
      proyecto: sugerencia.proyecto,
      orden: (ultimo?.orden ?? 0) + 1,
      prompts: { create: { tipo: "inicial", contenido: contenido as unknown as Prisma.InputJsonValue } },
    },
    include: { prompts: true },
  });

  // Las imágenes del rango pasan a pertenecer también al ítem. Se COPIA la fila
  // en vez de moverla: el mismo blob puede seguir referenciado desde la bandeja,
  // y `borrarImagenesDeItem` sólo borra del store lo que no le queda a nadie.
  const urls = imagenesEnRango(doc, sugerencia.desdeBid, sugerencia.hastaBid);
  if (urls.length > 0) {
    const originales = await prisma.trabajoImagen.findMany({ where: { url: { in: urls } } });
    const vistas = new Set<string>();
    for (const img of originales) {
      if (vistas.has(img.url)) continue;
      vistas.add(img.url);
      await prisma.trabajoImagen.create({
        data: {
          itemId: item.id,
          promptId: item.prompts[0]?.id ?? null,
          url: img.url,
          pathname: img.pathname,
          ancho: img.ancho,
          alto: img.alto,
          bytes: img.bytes,
        },
      });
    }
  }

  const nuevoCrudo = quitarRango(doc, sugerencia.desdeBid, sugerencia.hastaBid);
  await prisma.trabajoSugerencia.delete({ where: { id } });
  const quedan = await prisma.trabajoSugerencia.count({ where: { bandejaId: sugerencia.bandejaId } });

  await prisma.trabajoBandeja.update({
    where: { id: sugerencia.bandejaId },
    data: { contenido: nuevoCrudo as unknown as Prisma.InputJsonValue, estado: quedan > 0 ? "lista" : "vacia" },
  });

  return NextResponse.json({ item, contenido: nuevoCrudo, quedan });
}
