import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { borrarImagenesDeItem, noAutorizado, noEncontrado, resolveHarness } from "@/lib/notas/trabajo";
import { docDeItem, normalizarItems } from "@/lib/notas/archivo";

// POST: el puente sube los ítems que escribió la sesión que leyó el informe.
//
// Nacen en "propuesto" y la cola no los entrega: quince ítems creados de una
// sentada arrancarían solos con el carril encendido, sin que nadie los haya
// leído. Aprobarlos es un botón por ítem, o uno para todos.
//
// Las capturas ya están en Blob cuando esto corre: las sube el puente con su
// propio token, así una noche de renders no atraviesa una función serverless.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  const pedidoId = typeof body?.pedidoId === "string" ? body.pedidoId : "";
  const pedido = pedidoId
    ? await prisma.trabajoPedidoArchivo.findUnique({ where: { id: pedidoId } })
    : null;
  if (!pedido || pedido.deviceId !== deviceId) return noEncontrado();

  if (typeof body?.error === "string" && body.error) {
    await prisma.trabajoPedidoArchivo.update({
      where: { id: pedido.id },
      data: { estado: "error", error: body.error.slice(0, 500) },
    });
    return NextResponse.json({ ok: true, creados: 0 });
  }

  const { items, descartados } = normalizarItems(body?.items);
  if (items.length === 0) {
    await prisma.trabajoPedidoArchivo.update({
      where: { id: pedido.id },
      data: { estado: "error", error: "El análisis no devolvió ningún ítem usable." },
    });
    return NextResponse.json({ ok: true, creados: 0, descartados });
  }

  // Un reintento (la primera sesión se cortó a mitad) reemplaza lo que dejó la
  // anterior. Sólo lo que sigue PROPUESTO: si ya aprobaste tres, esos son tuyos
  // y no los pisa una sesión que volvió a leer el mismo informe.
  const previos = await prisma.trabajoItem.findMany({
    where: { pedidoArchivoId: pedido.id, estado: "propuesto" },
    select: { id: true },
  });
  for (const p of previos) {
    await borrarImagenesDeItem(p.id);
    await prisma.trabajoItem.delete({ where: { id: p.id } });
  }

  const ultimo = await prisma.trabajoItem.findFirst({
    where: { deviceId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  let orden = ultimo?.orden ?? 0;

  const creados: string[] = [];
  for (const entrante of items) {
    orden++;
    const item = await prisma.trabajoItem.create({
      data: {
        deviceId,
        titulo: entrante.titulo,
        proyecto: entrante.proyecto,
        estado: "propuesto",
        orden,
        pedidoArchivoId: pedido.id,
        fuenteArchivo: entrante.fuenteArchivo || pedido.ruta,
        fuenteAncla: entrante.fuenteAncla,
        fuenteHuella: entrante.fuenteHuella || null,
        fuenteRevisadaEn: new Date(),
        prompts: {
          create: { tipo: "inicial", contenido: docDeItem(entrante) as unknown as Prisma.InputJsonValue },
        },
      },
      include: { prompts: true },
    });

    for (const img of entrante.imagenes) {
      await prisma.trabajoImagen.create({
        data: {
          itemId: item.id,
          promptId: item.prompts[0]?.id ?? null,
          url: img.url,
          pathname: img.pathname,
          ancho: img.ancho ?? 0,
          alto: img.alto ?? 0,
          bytes: img.bytes ?? 0,
        },
      });
    }
    creados.push(item.id);
  }

  await prisma.trabajoPedidoArchivo.update({
    where: { id: pedido.id },
    data: { estado: "listo", error: null, itemsCreados: creados.length },
  });

  return NextResponse.json({ ok: true, creados: creados.length, descartados });
}
