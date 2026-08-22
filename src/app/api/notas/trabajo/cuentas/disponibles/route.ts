import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

/**
 * Qué cuentas están usables, para quien NO es un carril del runner.
 *
 * Vive en `disponibles/` y no en `estado/` porque `[id]` está al lado: una ruta
 * estática le gana a la dinámica y funcionaría igual, pero "estado" se lee como
 * un id posible y esa ambigüedad no vale la pena.
 *
 * El caso concreto es pragmaMonitor: su asistente diagnostica errores con las
 * mismas cuentas de Claude, pero cada llamada dura segundos. Reservarle una
 * cuenta entera —como hace `reservar`— bloquearía al harness muchísimo más
 * tiempo del que la usa.
 *
 * Lo único que necesita saber es cuál está quemada, y eso ya lo sabe esta app:
 * es la que ve los dos carriles a la vez y la que se acuerda del reset aunque el
 * runner se reinicie. Sin esto, el monitor tendría su propia rotación en su
 * propia base y dos rotadores independientes sobre el mismo pool de tres
 * cuentas, cada uno creyendo que las tiene todas.
 *
 * No devuelve credenciales: el harness entra a las cuentas por
 * CLAUDE_CONFIG_DIR y el monitor por tokens de su entorno. Acá viaja estado, no
 * secretos.
 */
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const ahora = new Date();

  // Una cuenta cuyo reset ya pasó vuelve sola. Se hace acá además de en
  // `reservar` porque el monitor puede ser el primero en preguntar después de
  // varias horas sin que ningún carril haya pedido nada.
  const vencidas = await prisma.harnessCuenta.findMany({
    where: { deviceId, estado: "agotada", resetAt: { not: null, lte: ahora } },
    select: { id: true },
  });
  if (vencidas.length > 0) {
    await prisma.harnessCuenta.updateMany({
      where: { id: { in: vencidas.map((c) => c.id) } },
      data: { estado: "activa", resetAt: null, tokensVentana: 0, ventanaInicio: ahora },
    });
  }

  const todas = await prisma.harnessCuenta.findMany({
    where: { deviceId },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    cuentas: todas.map((c) => ({
      nombre: c.nombre,
      email: c.email,
      habilitada: c.habilitada,
      estado: c.estado,
      resetAt: c.resetAt,
      // Qué carril la tiene tomada. El monitor NO lo respeta como exclusión
      // —su llamada dura segundos— pero le sirve para preferir una libre y no
      // competir con una sesión larga que está a mitad de camino.
      carril: c.carril,
      usable: c.habilitada && c.estado !== "login_requerido" && !(c.estado === "agotada" && c.resetAt !== null && c.resetAt > ahora),
    })),
  });
}

/**
 * POST: alguien encontró que una cuenta cortó por cuota.
 *
 * El que lo reporta puede no ser un carril: si el monitor come un 429, esa
 * información le sirve al harness igual, y al revés. Es el punto de tener un
 * solo lugar donde vive el estado.
 */
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre : null;
  if (!nombre) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });

  const estado = body?.estado === "login_requerido" ? "login_requerido" : "agotada";

  // Sin reset informado se asume una hora: es el orden de magnitud de las
  // ventanas, y esperar de más solo demora trabajo que ya podría estar corriendo.
  const resetAt =
    estado === "agotada"
      ? body?.resetAt
        ? new Date(body.resetAt)
        : new Date(Date.now() + 60 * 60 * 1000)
      : null;

  const cuenta = await prisma.harnessCuenta.findUnique({
    where: { deviceId_nombre: { deviceId, nombre } },
    select: { id: true },
  });
  if (!cuenta) return NextResponse.json({ error: "Cuenta desconocida" }, { status: 404 });

  await prisma.harnessCuenta.update({
    where: { id: cuenta.id },
    data: {
      estado,
      ...(resetAt && !Number.isNaN(resetAt.getTime()) ? { resetAt } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
