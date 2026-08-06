import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Las fuentes de los ítems que todavía no se desarrollaron, y su veredicto.
//
// Un ítem que salió de un informe se escribió contra una versión del informe.
// El informe sigue en la notebook y se sigue editando: la app no puede verlo, y
// el puente sí. Entonces el puente pregunta acá contra qué se escribió cada
// ítem (GET), lo compara con el archivo de hoy, y devuelve el veredicto (POST).
//
// Los completados quedan afuera a propósito: ese trabajo ya está hecho y
// marcarlo "desactualizado" no cambia nada, sólo llena la pantalla de rojo.
const VIVOS = ["propuesto", "pendiente", "pausada", "en_curso", "bloqueado"];

export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const items = await prisma.trabajoItem.findMany({
    where: { deviceId, estado: { in: VIVOS }, NOT: { fuenteArchivo: null } },
    select: { id: true, titulo: true, estado: true, fuenteArchivo: true, fuenteAncla: true, fuenteHuella: true },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  const revisados = Array.isArray(body?.revisados) ? body.revisados : [];

  let cambiados = 0;
  let alDia = 0;
  for (const crudo of revisados) {
    const fila = crudo as Record<string, unknown>;
    const id = typeof fila.id === "string" ? fila.id : "";
    if (!id) continue;
    const cambiada = fila.cambiada === true;

    // La huella nueva se guarda SOLO cuando la fuente está al día. Si cambió,
    // se conserva la vieja: es contra esa que se escribió el ítem, y pisarla
    // haría que en la próxima revisión el ítem parezca sano.
    const { count } = await prisma.trabajoItem.updateMany({
      where: { id, deviceId },
      data: {
        fuenteCambiada: cambiada,
        fuenteRevisadaEn: new Date(),
        ...(cambiada ? {} : typeof fila.huella === "string" && fila.huella ? { fuenteHuella: fila.huella.slice(0, 64) } : {}),
      },
    });
    if (count === 0) continue;
    if (cambiada) cambiados++;
    else alDia++;
  }

  return NextResponse.json({ ok: true, cambiados, alDia });
}
