import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveConsola, sinPin, terminalVigente } from "@/lib/notas/consola";
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

// Teclas sueltas que se pueden mandar en vez de texto. Es una lista blanca y no
// un passthrough: el agente las traduce a virtual-key codes, y aceptar cualquier
// nombre sería dejar que el navegador elija qué teclear.
const TECLAS = ["esc"];

// POST: encolar algo para que el agente lo mande a esa consola. O un prompt
// ({ texto }), o una tecla suelta ({ tecla: "esc" }) para interrumpir.
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
  if (!terminalVigente(terminal)) {
    return NextResponse.json({ error: "Esa terminal ya no está abierta" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));

  if (body?.tecla) {
    const tecla = String(body.tecla).toLowerCase();
    if (!TECLAS.includes(tecla)) {
      return NextResponse.json({ error: `Tecla no permitida: ${tecla}` }, { status: 400 });
    }
    // Interrumpir es urgente por definición: si quedaron prompts esperando en la
    // cola, mandarlos después del Esc es justo lo contrario de lo que se pidió.
    // Van a "cancelado" y no a "error" para no encender la alarma de la UI, que
    // significa "algo se rompió" y no "esto ya no hacía falta".
    await prisma.consolaEnvio.updateMany({
      where: { terminalId: id, estado: "pendiente" },
      data: { estado: "cancelado", enviadoEn: new Date() },
    });
    const envio = await prisma.consolaEnvio.create({ data: { terminalId: id, texto: "", tecla } });
    return NextResponse.json({ envio });
  }

  const texto = String(body?.texto ?? "")
    .replace(/\s*\r?\n\s*/g, " ")
    .trim();
  if (!texto) return NextResponse.json({ error: "Texto vacío" }, { status: 400 });

  const envio = await prisma.consolaEnvio.create({
    data: { terminalId: id, texto },
  });
  return NextResponse.json({ envio });
}
