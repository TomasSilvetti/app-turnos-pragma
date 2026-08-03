import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Una sesión que quedó "pensando" y no volvió es un carril que murió a mitad.
// Pasado este rato se vuelve a ofrecer, o queda colgada para siempre.
const VENCE_MS = 15 * 60 * 1000;

// GET: el carril de consola pregunta si hay un prompt para ejecutar. Con
// ?peek=1 sólo mira.
//
// Devuelve todo lo que la máquina necesita para correrlo: el sessionId del CLI,
// la carpeta de cuenta y el directorio. Autentica con el token del harness, no
// con el PIN: el PIN es del navegador y este cliente es la propia máquina.
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const peek = request.nextUrl.searchParams.get("peek") === "1";

  const colgadas = await prisma.consolaSesion.findMany({
    where: { deviceId, estado: "pensando", updatedAt: { lt: new Date(Date.now() - VENCE_MS) } },
    select: { id: true },
  });
  if (colgadas.length > 0) {
    await prisma.consolaSesion.updateMany({
      where: { id: { in: colgadas.map((c) => c.id) } },
      data: { estado: "pendiente" },
    });
  }

  const sesion = await prisma.consolaSesion.findFirst({
    where: { deviceId, estado: "pendiente" },
    orderBy: { updatedAt: "asc" },
  });
  if (!sesion) return NextResponse.json({ pedido: null });

  if (peek) return NextResponse.json({ pedido: { id: sesion.id } });

  // Todo lo que se escribió desde la última respuesta: si mandaste tres
  // mensajes seguidos mientras no había carril, se ejecutan juntos y no se
  // pierde ninguno.
  const ultimaRespuesta = await prisma.consolaMensaje.findFirst({
    where: { sesionId: sesion.id, rol: "asistente", parcial: false },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const pendientes = await prisma.consolaMensaje.findMany({
    where: {
      sesionId: sesion.id,
      rol: "usuario",
      ...(ultimaRespuesta ? { createdAt: { gt: ultimaRespuesta.createdAt } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  await prisma.consolaSesion.update({ where: { id: sesion.id }, data: { estado: "pensando" } });

  return NextResponse.json({
    pedido: {
      id: sesion.id,
      sessionId: sesion.sessionId,
      cuenta: sesion.cuenta,
      directorio: sesion.directorio,
      // Si nunca corrió, el CLI tiene que crear la sesión en vez de retomarla.
      primera: pendientes.length > 0 && !ultimaRespuesta,
      texto: pendientes.map((m) => m.texto).join("\n\n"),
    },
  });
}
