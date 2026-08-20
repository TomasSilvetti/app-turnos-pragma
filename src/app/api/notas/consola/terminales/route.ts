import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveConsola, sinPin } from "@/lib/notas/consola";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Pasado este rato sin censo, el agente está caído y las terminales que reporta
// ya no significan nada: se muestran apagadas en vez de mentir que están vivas.
const CENSO_VENCE_MS = 30 * 1000;

// GET: el celular pide la lista de pestañas abiertas, con su última pantalla.
export async function GET(request: NextRequest) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();

  const terminales = await prisma.consolaTerminal.findMany({
    where: { deviceId },
    orderBy: [{ viva: "desc" }, { vistoEn: "desc" }],
    include: {
      envios: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  const fresco = terminales.some((t) => Date.now() - t.vistoEn.getTime() < CENSO_VENCE_MS);
  return NextResponse.json({ terminales, agenteVivo: fresco });
}

// POST: el censo del agente local. Manda la foto completa de lo que ve, y eso
// reemplaza el estado anterior — lo que no viene en la lista está cerrado.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => ({}));
  const vistas: { pid: number; titulo?: string; pantalla?: string }[] = Array.isArray(body?.terminales)
    ? body.terminales
    : [];

  const pids = vistas.map((t) => Number(t.pid)).filter((p) => Number.isInteger(p) && p > 0);

  await prisma.$transaction([
    ...vistas.map((t) =>
      prisma.consolaTerminal.upsert({
        where: { deviceId_pid: { deviceId, pid: Number(t.pid) } },
        create: {
          deviceId,
          pid: Number(t.pid),
          titulo: String(t.titulo ?? "").slice(0, 200),
          pantalla: String(t.pantalla ?? "").slice(0, 20000),
        },
        update: {
          titulo: String(t.titulo ?? "").slice(0, 200),
          pantalla: String(t.pantalla ?? "").slice(0, 20000),
          viva: true,
          vistoEn: new Date(),
        },
      })
    ),
    prisma.consolaTerminal.updateMany({
      where: { deviceId, pid: { notIn: pids.length > 0 ? pids : [-1] } },
      data: { viva: false },
    }),
    // Una pestaña cerrada hace una semana ya no va a volver con el mismo PID:
    // conservarla sólo ensucia la lista.
    prisma.consolaTerminal.deleteMany({
      where: { deviceId, viva: false, vistoEn: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
