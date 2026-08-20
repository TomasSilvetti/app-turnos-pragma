import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// La cola de tipeo: lo que el agente local tiene que escribir en consolas
// ajenas. Va aparte de /consola/cola porque son dos clientes distintos con dos
// mecanismos distintos — aquélla lanza sesiones nuevas del CLI, ésta se cuelga
// de pestañas que ya existen.

// GET: qué falta tipear. Se entrega con el PID, que es lo único que el agente
// necesita para AttachConsole.
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const envios = await prisma.consolaEnvio.findMany({
    where: { estado: "pendiente", terminal: { deviceId, viva: true } },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: { terminal: { select: { pid: true } } },
  });

  return NextResponse.json({
    envios: envios.map((e) => ({ id: e.id, pid: e.terminal.pid, texto: e.texto })),
  });
}

// POST: el agente cuenta cómo le fue. Sin esto un envío que falló queda
// pendiente para siempre y se reintenta en cada vuelta.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const error = body?.error ? String(body.error).slice(0, 300) : null;

  const envio = await prisma.consolaEnvio.findUnique({
    where: { id },
    include: { terminal: { select: { deviceId: true } } },
  });
  if (!envio || envio.terminal.deviceId !== deviceId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.consolaEnvio.update({
    where: { id },
    data: { estado: error ? "error" : "enviado", error, enviadoEn: new Date() },
  });
  return NextResponse.json({ ok: true });
}
