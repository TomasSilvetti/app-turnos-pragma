import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esCarril, noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// GET ?carril=&itemId=&cuenta= — el único canal por el que un botón de la app
// puede cortar una sesión que corre en la máquina del usuario.
//
// El runner lo consulta mientras espera a la sesión. Devuelve qué hacer:
//
//   { abortar: true, motivo: "pausada" }      la tarea la pausaste vos
//   { abortar: true, motivo: "cuenta" }       desactivaste la cuenta en uso
//
// No hay push ni websocket a propósito: el harness ya pregunta cada 60 segundos
// para subir el log, y colgar esto de ahí no agrega ni una conexión.
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const sp = request.nextUrl.searchParams;
  const carril = sp.get("carril");
  const itemId = sp.get("itemId");
  const cuenta = sp.get("cuenta");
  if (!esCarril(carril)) return NextResponse.json({ error: "Carril inválido" }, { status: 400 });

  if (itemId) {
    const item = await prisma.trabajoItem.findUnique({
      where: { id: itemId },
      select: { deviceId: true, estado: true },
    });
    if (item?.deviceId === deviceId && item.estado === "pausada") {
      return NextResponse.json({ abortar: true, motivo: "pausada" });
    }
  }

  if (cuenta) {
    const c = await prisma.harnessCuenta.findUnique({
      where: { deviceId_nombre: { deviceId, nombre: cuenta } },
      select: { habilitada: true },
    });
    if (c && !c.habilitada) {
      return NextResponse.json({ abortar: true, motivo: "cuenta" });
    }
  }

  return NextResponse.json({ abortar: false });
}
