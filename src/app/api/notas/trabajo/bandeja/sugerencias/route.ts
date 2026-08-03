import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, noEncontrado, resolveHarness } from "@/lib/notas/trabajo";
import { bidDe, bloquesDe, tituloTentativo, type DocTiptap } from "@/lib/notas/bandeja";

type SugerenciaEntrante = { titulo?: unknown; desde?: unknown; hasta?: unknown; proyecto?: unknown };

// POST: el puente sube lo que devolvió la sesión que itemizó.
//
// Se valida que cada bid exista de verdad en el crudo: un rango inventado
// dibujaría una ventana sobre la nada, y es un error que el modelo puede cometer
// (repetir un bid, escribir b12 donde el último es b9).
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const bandeja = await prisma.trabajoBandeja.findUnique({ where: { deviceId } });
  if (!bandeja) return noEncontrado();

  const body = await request.json().catch(() => null);

  if (typeof body?.error === "string" && body.error) {
    await prisma.trabajoBandeja.update({
      where: { id: bandeja.id },
      data: { estado: "error", error: body.error.slice(0, 500) },
    });
    return NextResponse.json({ ok: true, creadas: 0 });
  }

  const entrantes: SugerenciaEntrante[] = Array.isArray(body?.sugerencias) ? body.sugerencias : [];
  const doc = bandeja.contenido as DocTiptap;
  const bids = new Set(bloquesDe(doc).map(bidDe).filter(Boolean) as string[]);

  const validas = entrantes.filter(
    (s) => typeof s.desde === "string" && typeof s.hasta === "string" && bids.has(s.desde) && bids.has(s.hasta)
  );

  await prisma.trabajoSugerencia.deleteMany({ where: { bandejaId: bandeja.id } });

  for (const [i, s] of validas.entries()) {
    const desdeBid = s.desde as string;
    const hastaBid = s.hasta as string;
    await prisma.trabajoSugerencia.create({
      data: {
        bandejaId: bandeja.id,
        titulo: typeof s.titulo === "string" && s.titulo.trim() ? s.titulo.trim() : tituloTentativo(doc, desdeBid, hastaBid),
        proyecto: typeof s.proyecto === "string" ? s.proyecto : "",
        desdeBid,
        hastaBid,
        orden: i,
      },
    });
  }

  await prisma.trabajoBandeja.update({
    where: { id: bandeja.id },
    data: {
      estado: validas.length > 0 ? "lista" : "error",
      error: validas.length > 0 ? null : "El análisis no devolvió ninguna sugerencia usable.",
    },
  });

  return NextResponse.json({ ok: true, creadas: validas.length, descartadas: entrantes.length - validas.length });
}
