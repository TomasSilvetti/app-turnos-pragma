import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { DOC_VACIO, ESTADOS, noAutorizado, type EstadoItem } from "@/lib/notas/trabajo";

// GET: los ítems de una lista (pendiente | en_curso | bloqueado | completado).
// Sin el prompt ni el log: eso se pide al desplegar el ítem, para que abrir la
// lista no baje todas las capturas de todas las tareas.
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const pedido = request.nextUrl.searchParams.get("estado");
  // "pendiente" incluye el que está corriendo y los pausados: es la misma lista
  // en pantalla, y una tarea pausada sigue siendo trabajo por hacer.
  const estados: EstadoItem[] =
    pedido === "pendiente"
      ? ["pendiente", "en_curso", "pausada"]
      : ESTADOS.includes(pedido as EstadoItem)
        ? [pedido as EstadoItem]
        : [...ESTADOS];

  const items = await prisma.trabajoItem.findMany({
    where: { deviceId, estado: { in: estados } },
    // `en_curso` primero (alfabéticamente va antes que `pausada` y `pendiente`):
    // la que se está ejecutando tiene que estar arriba de todo hasta que cierre,
    // que es lo que uno mira cuando abre la pantalla.
    orderBy: [{ estado: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, titulo: true, estado: true, orden: true, proyecto: true,
      pasoActual: true, pasosTotales: true, intentos: true,
      sesionInicio: true, cuenta: true, motivoBloqueo: true,
      fuenteArchivo: true, fuenteAncla: true, pedidoArchivoId: true,
      fuenteCambiada: true,
      createdAt: true, updatedAt: true, completadoEn: true,
      _count: { select: { logs: true } },
    },
  });

  return NextResponse.json({ items });
}

// PATCH: mueve varios ítems de estado en una sola llamada. Lo usa el "reencolar
// todo" de bloqueados: veinte PATCH sueltos serían veinte viajes y una lista a
// medio mover si alguno falla.
export async function PATCH(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === "string") : [];
  const estado = body?.estado as EstadoItem;
  if (!ids.length || !ESTADOS.includes(estado)) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const where = { id: { in: ids }, deviceId };
  const completadoEn = estado === "completado" ? new Date() : null;

  if (estado !== "pendiente") {
    const { count } = await prisma.trabajoItem.updateMany({ where, data: { estado, completadoEn } });
    return NextResponse.json({ count });
  }

  // Volver a la cola limpia el motivo del bloqueo y la sesión colgada. Los
  // intentos se reinician sólo en los que venían bloqueados — mismo criterio
  // que el PATCH individual: sin eso la cola los vuelve a bloquear en la
  // primera vuelta y el botón no sirve de nada.
  const base = { estado, completadoEn, motivoBloqueo: null, sesionInicio: null };
  const [bloqueados, resto] = await prisma.$transaction([
    prisma.trabajoItem.updateMany({ where: { ...where, estado: "bloqueado" }, data: { ...base, intentos: 0 } }),
    prisma.trabajoItem.updateMany({ where: { ...where, estado: { not: "bloqueado" } }, data: base }),
  ]);

  return NextResponse.json({ count: bloqueados.count + resto.count });
}

// POST: crea un ítem con su prompt inicial. Acepta `contenido` (documento de
// Tiptap) para el caso "crear ítem desde un problema del log", que nace con el
// texto del problema ya adentro.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => ({}));
  const titulo = typeof body?.titulo === "string" ? body.titulo : "";
  const proyecto = typeof body?.proyecto === "string" ? body.proyecto : "";
  const contenido = body?.contenido && typeof body.contenido === "object" ? body.contenido : DOC_VACIO;

  // Al final de la cola: el orden lo decide el usuario arrastrando, pero lo
  // nuevo nunca se cuela adelante de lo que ya estaba esperando.
  const ultimo = await prisma.trabajoItem.findFirst({
    where: { deviceId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const item = await prisma.trabajoItem.create({
    data: {
      deviceId,
      titulo,
      proyecto,
      orden: (ultimo?.orden ?? 0) + 1,
      prompts: { create: { tipo: "inicial", contenido } },
    },
    include: { prompts: true },
  });

  return NextResponse.json({ item }, { status: 201 });
}
