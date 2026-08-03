import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Después de tres sesiones que lo toman sin cerrarlo, el ítem se bloquea en vez
// de seguir consumiendo cuota. El runner ya tenía este techo; acá queda visible
// para el usuario, con su motivo, en la lista de bloqueados.
const MAX_INTENTOS = 3;

// GET: el puente pide la próxima tarea. Con ?peek=1 sólo mira (lo usa
// `runner.ps1 -Probar`, que no debe tomar nada ni contar un intento).
//
// Un ítem que quedó en "en_curso" se devuelve antes que los pendientes: es una
// sesión que se cortó a mitad —cuota, techo de tiempo, corte de luz— y su
// trabajo está en disco. Empezar de cero sería tirarlo.
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const peek = request.nextUrl.searchParams.get("peek") === "1";
  const cuenta = request.nextUrl.searchParams.get("cuenta") ?? null;

  // "pausada" no entra: es trabajo que sacaste de circulación a mano.
  const elegir = () =>
    prisma.trabajoItem.findFirst({
      where: { deviceId, estado: { in: ["en_curso", "pendiente"] } },
      // "en_curso" antes que "pendiente" por orden alfabético inverso del estado.
      orderBy: [{ estado: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
      select: { id: true, intentos: true, estado: true },
    });

  let candidato = await elegir();

  // Saltear los que ya agotaron los intentos, bloqueándolos con su motivo.
  while (candidato && candidato.intentos >= MAX_INTENTOS) {
    await prisma.trabajoItem.update({
      where: { id: candidato.id },
      data: {
        estado: "bloqueado",
        sesionInicio: null,
        motivoBloqueo: `No cerró en ${MAX_INTENTOS} intentos. Revisá el log y escribí un prompt de desbloqueo para volver a encolarla.`,
      },
    });
    candidato = await elegir();
  }

  if (!candidato) return NextResponse.json({ item: null });

  if (!peek) {
    await prisma.trabajoItem.update({
      where: { id: candidato.id },
      data: {
        estado: "en_curso",
        intentos: { increment: 1 },
        sesionInicio: new Date(),
        ...(cuenta ? { cuenta } : {}),
      },
    });
  }

  const item = await prisma.trabajoItem.findUnique({
    where: { id: candidato.id },
    include: {
      prompts: {
        orderBy: { createdAt: "asc" },
        include: { imagenes: { select: { id: true, url: true } } },
      },
      // Sólo el final del log: le alcanza a la sesión para retomar sin volver a
      // leer horas de historia (y sin pagar esos tokens).
      logs: { orderBy: { createdAt: "desc" }, take: 15, select: { tipo: true, texto: true, paso: true, createdAt: true } },
    },
  });

  return NextResponse.json({ item });
}
