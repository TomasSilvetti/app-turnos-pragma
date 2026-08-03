import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TIPOS_LOG, noAutorizado, noEncontrado, resolveHarness, type TipoLog } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

type ImagenEntrante = { url?: unknown; pathname?: unknown; ancho?: unknown; alto?: unknown; bytes?: unknown };
type EntradaEntrante = {
  tipo?: unknown;
  texto?: unknown;
  paso?: unknown;
  pasosTotales?: unknown;
  cuenta?: unknown;
  requiereIntervencion?: unknown;
  imagenes?: unknown;
};

function entero(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
}

// POST: el puente sube un lote de entradas de log, con las capturas ya en Blob.
// Va por lotes y no de a una porque el puente vacía el ndjson cada 60 segundos y
// en ese rato la sesión pudo anotar varios hitos.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;

  const item = await prisma.trabajoItem.findUnique({ where: { id }, select: { deviceId: true } });
  if (!item || item.deviceId !== deviceId) return noEncontrado();

  const body = await request.json().catch(() => null);
  const entradas: EntradaEntrante[] = Array.isArray(body?.entradas) ? body.entradas : [];
  if (entradas.length === 0) return NextResponse.json({ creadas: 0 });

  let ultimoPaso: number | null = null;
  let pasosTotales: number | null = null;

  for (const e of entradas) {
    const tipo: TipoLog = TIPOS_LOG.includes(e.tipo as TipoLog) ? (e.tipo as TipoLog) : "hito";
    const paso = entero(e.paso);
    const total = entero(e.pasosTotales);
    if (paso !== null) ultimoPaso = paso;
    if (total !== null) pasosTotales = total;

    const entrada = await prisma.trabajoLogEntry.create({
      data: {
        itemId: id,
        tipo,
        texto: typeof e.texto === "string" ? e.texto : "",
        paso,
        cuenta: typeof e.cuenta === "string" ? e.cuenta : null,
        requiereIntervencion: e.requiereIntervencion === true,
      },
    });

    const imagenes: ImagenEntrante[] = Array.isArray(e.imagenes) ? e.imagenes : [];
    for (const img of imagenes) {
      if (typeof img.url !== "string" || typeof img.pathname !== "string") continue;
      await prisma.trabajoImagen.create({
        data: {
          itemId: id,
          logEntryId: entrada.id,
          url: img.url,
          pathname: img.pathname,
          ancho: entero(img.ancho) ?? 0,
          alto: entero(img.alto) ?? 0,
          bytes: entero(img.bytes) ?? 0,
        },
      });
    }
  }

  // El progreso viaja pegado al log y no en una llamada aparte: es el mismo dato
  // (`[PASO n/N]` al frente del hito) y así no puede quedar desfasado.
  if (ultimoPaso !== null || pasosTotales !== null) {
    await prisma.trabajoItem.update({
      where: { id },
      data: {
        ...(ultimoPaso !== null ? { pasoActual: ultimoPaso } : {}),
        ...(pasosTotales !== null ? { pasosTotales } : {}),
      },
    });
  }

  return NextResponse.json({ creadas: entradas.length });
}
