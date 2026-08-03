import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esCarril, noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// POST: el carril pide qué cuenta usar.
//
// La asignación la hace la APP y no el runner. Es la única que ve las dos cosas
// a la vez: cuáles habilitaste desde el panel y cuál tiene tomada el otro
// carril. Con cada runner eligiendo por su cuenta, los dos podrían agarrar la
// misma y quemarle la cuota al doble de velocidad.
//
// Body: { carril, cuentas: [{nombre, email}], agotadas: [nombre] }
// Devuelve { cuenta: nombre } o { cuenta: null, motivo }.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => ({}));
  const carril = esCarril(body?.carril) ? body.carril : "trabajo";
  const otro = carril === "trabajo" ? "itemizacion" : "trabajo";
  const agotadas: string[] = Array.isArray(body?.agotadas) ? body.agotadas.filter((a: unknown) => typeof a === "string") : [];

  // Las cuentas que existen en disco las conoce el runner, no la app: se
  // registran acá para que el panel pueda mostrarlas aunque nunca hayan corrido.
  const entrantes: { nombre?: unknown; email?: unknown }[] = Array.isArray(body?.cuentas) ? body.cuentas : [];
  for (const c of entrantes) {
    if (typeof c.nombre !== "string" || !c.nombre) continue;
    const email = typeof c.email === "string" ? c.email : null;
    await prisma.harnessCuenta.upsert({
      where: { deviceId_nombre: { deviceId, nombre: c.nombre } },
      create: { deviceId, nombre: c.nombre, email },
      update: email ? { email } : {},
    });
  }

  // Una cuenta que cortó por cuota vuelve sola a la rotación cuando pasa la hora
  // de reset que informó el CLI. Se hace acá y no en el runner porque el runner
  // olvida todo al reiniciar: el 03/08 se reinició veinticinco veces y en cada
  // una volvió a pedir la cuenta 1 —la primera de la lista, sin cuota hasta las
  // 16:10— gastando un intento del ítem de turno en cada vuelta.
  const ahora = new Date();
  const vencidas = await prisma.harnessCuenta.findMany({
    where: { deviceId, estado: "agotada", resetAt: { not: null, lte: ahora } },
    select: { id: true },
  });
  if (vencidas.length > 0) {
    await prisma.harnessCuenta.updateMany({
      where: { id: { in: vencidas.map((c) => c.id) } },
      // Ventana nueva: los tokens de la anterior ya no cuentan. El techo
      // observado se conserva, que es justamente para lo que sirve.
      data: { estado: "activa", resetAt: null, tokensVentana: 0, ventanaInicio: ahora },
    });
  }

  const todas = await prisma.harnessCuenta.findMany({ where: { deviceId }, orderBy: { nombre: "asc" } });
  const tomadaPorElOtro = todas.find((c) => c.carril === otro)?.nombre;

  // Sin cuota hasta su reset: no alcanza con la lista que manda el runner, que
  // es lo que ESTE proceso aprendió desde que arrancó. La app se acuerda aunque
  // el runner se reinicie, y es lo que hace que la rotación llegue a la cuenta 3
  // en vez de quedarse golpeando la 1.
  const sinCuota = (c: { estado: string; resetAt: Date | null }) =>
    c.estado === "agotada" && c.resetAt !== null && c.resetAt > ahora;

  const elegible = todas.find(
    (c) =>
      c.habilitada &&
      c.estado !== "login_requerido" &&
      !sinCuota(c) &&
      !agotadas.includes(c.nombre) &&
      c.nombre !== tomadaPorElOtro
  );

  if (!elegible) {
    const habilitadas = todas.filter((c) => c.habilitada).length;
    const proxima = todas
      .filter((c) => c.habilitada && sinCuota(c))
      .map((c) => c.resetAt!.getTime())
      .sort((a, b) => a - b)[0];
    const motivo =
      habilitadas === 0
        ? "No hay ninguna cuenta habilitada. Activá una desde el panel."
        : tomadaPorElOtro
          ? `La única cuenta libre la está usando el carril de ${otro}.`
          : proxima
            ? `Todas las cuentas habilitadas están sin cuota. La primera vuelve ${new Date(proxima).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}.`
            : "Todas las cuentas habilitadas están sin cuota.";
    // Soltar la que tenía este carril: si se queda marcada, el otro tampoco
    // puede usarla y quedan los dos esperando una cuenta que nadie ocupa.
    await prisma.harnessCuenta.updateMany({ where: { deviceId, carril }, data: { carril: null } });
    return NextResponse.json({ cuenta: null, motivo });
  }

  await prisma.$transaction([
    prisma.harnessCuenta.updateMany({ where: { deviceId, carril }, data: { carril: null } }),
    prisma.harnessCuenta.update({ where: { id: elegible.id }, data: { carril } }),
  ]);

  return NextResponse.json({ cuenta: elegible.nombre, email: elegible.email });
}

// DELETE: el carril suelta su cuenta al terminar o al frenarse.
export async function DELETE(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const carril = request.nextUrl.searchParams.get("carril");
  if (!esCarril(carril)) return NextResponse.json({ error: "Carril inválido" }, { status: 400 });

  await prisma.harnessCuenta.updateMany({ where: { deviceId, carril }, data: { carril: null } });
  return NextResponse.json({ ok: true });
}
