import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esCarril, noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Cuántos se guardan. Es un log de operación, no un histórico: lo que importa es
// "qué pasó recién", y una tabla que crece sin techo termina siendo un costo.
const TOPE = 60;

// GET: los últimos eventos, para el panel.
export async function GET(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const eventos = await prisma.harnessEvento.findMany({
    where: { deviceId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({ eventos });
}

// POST: lo escriben el runner y el vigía desde la máquina.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => ({}));
  const carril = esCarril(body?.carril) ? body.carril : "trabajo";
  const tipo = ["arranque", "apagado", "cuota", "error", "info"].includes(body?.tipo) ? body.tipo : "info";
  const texto = typeof body?.texto === "string" ? body.texto.slice(0, 400) : "";

  const evento = await prisma.harnessEvento.create({ data: { deviceId, carril, tipo, texto } });

  // Podar los viejos en la misma pasada: sin un cron, éste es el único momento
  // en que alguien mira esta tabla.
  const viejos = await prisma.harnessEvento.findMany({
    where: { deviceId },
    orderBy: { createdAt: "desc" },
    skip: TOPE,
    select: { id: true },
  });
  if (viejos.length > 0) {
    await prisma.harnessEvento.deleteMany({ where: { id: { in: viejos.map((v) => v.id) } } });
  }

  return NextResponse.json({ evento }, { status: 201 });
}
