import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { esCarril, noAutorizado } from "@/lib/notas/trabajo";

// POST: el botón de encendido de cada carril.
//
// La app corre en Vercel y no puede lanzar un proceso en la máquina del usuario:
// lo único que hace este endpoint es dejar anotado el deseo. El vigía, que sí
// corre ahí, lo mira cada pocos segundos y arranca el carril o le pide que
// frene. Por eso el botón puede tardar unos segundos en reflejarse.
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  if (!esCarril(body?.carril) || typeof body?.encendido !== "boolean") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { carril, encendido } = body;
  await prisma.harnessEstado.upsert({
    where: { deviceId_carril: { deviceId, carril } },
    create: { deviceId, carril, encendido, estado: "detenido" },
    update: { encendido },
  });

  return NextResponse.json({ ok: true, carril, encendido });
}
