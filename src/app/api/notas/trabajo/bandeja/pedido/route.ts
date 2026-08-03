import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";
import { aplanarConMarcas, type DocTiptap } from "@/lib/notas/bandeja";

// Un pedido que quedó en "analizando" y no cerró es una sesión que se cortó
// (cuota, techo de tiempo, corte de luz). Pasado este rato se vuelve a ofrecer,
// o el usuario se queda mirando un cartel de "analizando" para siempre.
const VENCE_MS = 20 * 60 * 1000;

// GET: el puente pregunta si hay algo para itemizar. Con ?peek=1 sólo mira.
//
// Devuelve el crudo aplanado con marcas [bN], no el JSON del documento: la
// sesión sólo tiene que decir dónde empieza y termina cada ítem, y un árbol de
// nodos sería contexto pagado para nada.
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const peek = request.nextUrl.searchParams.get("peek") === "1";
  const bandeja = await prisma.trabajoBandeja.findUnique({ where: { deviceId } });
  if (!bandeja) return NextResponse.json({ pedido: null });

  const vencido =
    bandeja.estado === "analizando" &&
    bandeja.pedidoEn != null &&
    Date.now() - bandeja.pedidoEn.getTime() > VENCE_MS;

  if (bandeja.estado !== "pendiente" && !vencido) return NextResponse.json({ pedido: null });

  if (!peek) {
    await prisma.trabajoBandeja.update({
      where: { id: bandeja.id },
      data: { estado: "analizando", pedidoEn: new Date() },
    });
  }

  const { texto, imagenes } = aplanarConMarcas(bandeja.contenido as DocTiptap);
  return NextResponse.json({ pedido: { bandejaId: bandeja.id, texto, imagenes } });
}
