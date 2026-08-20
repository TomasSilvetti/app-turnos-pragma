import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveConsola, sinPin } from "@/lib/notas/consola";
import { noEncontrado } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

async function terminalDelDevice(id: string, deviceId: string) {
  const t = await prisma.consolaTerminal.findUnique({ where: { id } });
  return t && t.deviceId === deviceId ? t : null;
}

// PATCH: ponerle apodo. Es lo único editable — todo lo demás lo dicta la
// máquina.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;
  if (!(await terminalDelDevice(id, deviceId))) return noEncontrado();

  const body = await request.json().catch(() => ({}));
  const terminal = await prisma.consolaTerminal.update({
    where: { id },
    data: { apodo: String(body?.apodo ?? "").slice(0, 60) },
  });
  return NextResponse.json({ terminal });
}

// POST: encolar un prompt para que el agente lo tipee en esa consola.
//
// Los saltos de línea se aplastan a espacios: en la TUI de Claude Code un Enter
// manda el mensaje, así que un prompt de tres párrafos escrito tal cual se
// enviaría partido en tres.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;

  const terminal = await terminalDelDevice(id, deviceId);
  if (!terminal) return noEncontrado();
  if (!terminal.viva) {
    return NextResponse.json({ error: "Esa terminal ya no está abierta" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const texto = String(body?.texto ?? "")
    .replace(/\s*\r?\n\s*/g, " ")
    .trim();
  if (!texto) return NextResponse.json({ error: "Texto vacío" }, { status: 400 });

  const envio = await prisma.consolaEnvio.create({
    data: { terminalId: id, texto },
  });
  return NextResponse.json({ envio });
}
