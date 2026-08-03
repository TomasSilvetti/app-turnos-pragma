import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esCarril, estadoHarness, noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// GET: lo que pinta el panel de la sección Trabajo (navegador).
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  return NextResponse.json(await estadoHarness(deviceId));
}

type CuentaEntrante = {
  nombre?: unknown;
  email?: unknown;
  estado?: unknown;
  tokensVentana?: unknown;
  techoObservado?: unknown;
  resetAt?: unknown;
  ventanaInicio?: unknown;
  ultimaSesionAt?: unknown;
};

function fecha(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// PUT: el latido del runner. Es también la única forma de enterarse de que la
// máquina se apagó: si deja de llegar, la UI muestra el harness detenido.
export async function PUT(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => ({}));
  const estado = ["detenido", "ocioso", "trabajando"].includes(body?.estado) ? body.estado : "ocioso";
  const carril = esCarril(body?.carril) ? body.carril : "trabajo";

  const datos = {
    estado,
    itemEnCursoId: typeof body?.itemEnCursoId === "string" ? body.itemEnCursoId : null,
    sesionInicio: fecha(body?.sesionInicio),
    cuentaActual: typeof body?.cuentaActual === "string" ? body.cuentaActual : null,
    limiteSesionMin: typeof body?.limiteSesionMin === "number" ? Math.trunc(body.limiteSesionMin) : 90,
    actualizadoAt: new Date(),
  };

  await prisma.harnessEstado.upsert({
    where: { deviceId_carril: { deviceId, carril } },
    create: { deviceId, carril, ...datos },
    update: datos,
  });

  const cuentas: CuentaEntrante[] = Array.isArray(body?.cuentas) ? body.cuentas : [];
  for (const c of cuentas) {
    if (typeof c.nombre !== "string" || !c.nombre) continue;
    // `habilitada` y `carril` NO se tocan acá: los maneja la app (el interruptor
    // del panel y la reserva). Si el latido los pisara, desactivar una cuenta
    // duraría hasta el próximo latido, cinco segundos después.
    const valores = {
      ...(typeof c.email === "string" && c.email ? { email: c.email } : {}),
      estado: typeof c.estado === "string" ? c.estado : "activa",
      tokensVentana: typeof c.tokensVentana === "number" ? Math.trunc(c.tokensVentana) : 0,
      techoObservado: typeof c.techoObservado === "number" ? Math.trunc(c.techoObservado) : null,
      resetAt: fecha(c.resetAt),
      ventanaInicio: fecha(c.ventanaInicio),
      ultimaSesionAt: fecha(c.ultimaSesionAt),
    };
    await prisma.harnessCuenta.upsert({
      where: { deviceId_nombre: { deviceId, nombre: c.nombre } },
      create: { deviceId, nombre: c.nombre, ...valores },
      update: valores,
    });
  }

  return NextResponse.json({ ok: true });
}
