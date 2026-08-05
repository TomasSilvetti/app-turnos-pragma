import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Más que el de la bandeja, y a propósito: itemizar un informe es leerlo entero
// y redactar quince prompts, no partir un pegote de diez líneas. El techo del
// runner para esta sesión es de 40 minutos; si a los 70 sigue "analizando" es
// que se cortó de verdad.
const VENCE_MS = 70 * 60 * 1000;

// GET: el puente pregunta si hay un archivo para itemizar. Con ?peek=1 sólo mira.
//
// Devuelve la RUTA, no el archivo: el puente lo lee del disco de la máquina, lo
// poda y renderiza sus capturas antes de que ninguna sesión lo mire. Mandar el
// contenido por acá sería subirlo a la nube para bajarlo al mismo disco.
export async function GET(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const peek = request.nextUrl.searchParams.get("peek") === "1";

  const vencidos = await prisma.trabajoPedidoArchivo.findMany({
    where: { deviceId, estado: "analizando", pedidoEn: { lt: new Date(Date.now() - VENCE_MS) } },
    select: { id: true },
  });
  if (vencidos.length > 0) {
    await prisma.trabajoPedidoArchivo.updateMany({
      where: { id: { in: vencidos.map((v) => v.id) } },
      data: { estado: "pendiente" },
    });
  }

  const pedido = await prisma.trabajoPedidoArchivo.findFirst({
    where: { deviceId, estado: "pendiente" },
    orderBy: { createdAt: "asc" },
    select: { id: true, ruta: true, nombre: true, alcance: true },
  });
  if (!pedido) return NextResponse.json({ pedido: null });

  if (!peek) {
    await prisma.trabajoPedidoArchivo.update({
      where: { id: pedido.id },
      data: { estado: "analizando", pedidoEn: new Date(), error: null },
    });
  }

  return NextResponse.json({ pedido });
}
