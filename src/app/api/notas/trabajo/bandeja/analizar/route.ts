import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado, noEncontrado } from "@/lib/notas/trabajo";
import { bloquesDe, type DocTiptap } from "@/lib/notas/bandeja";

// POST: encola el análisis. No lo hace acá — lo hace el harness con el OAuth de
// las cuentas, así que esto sólo deja el pedido y el runner lo toma en su
// próxima vuelta (30 s como mucho, o cuando vuelva la cuota).
export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();

  const bandeja = await prisma.trabajoBandeja.findUnique({ where: { deviceId } });
  if (!bandeja) return noEncontrado();

  const bloques = bloquesDe(bandeja.contenido as DocTiptap);
  const conTexto = bloques.some((b) => (b.content?.length ?? 0) > 0);
  if (!conTexto) {
    return NextResponse.json({ error: "La bandeja está vacía" }, { status: 400 });
  }

  // Las sugerencias viejas se van: el texto cambió y sus rangos apuntarían a
  // bloques que ya no significan lo mismo.
  await prisma.trabajoSugerencia.deleteMany({ where: { bandejaId: bandeja.id } });

  const actualizada = await prisma.trabajoBandeja.update({
    where: { id: bandeja.id },
    data: { estado: "pendiente", pedidoEn: new Date(), error: null },
    select: { id: true, estado: true, pedidoEn: true },
  });
  return NextResponse.json({ bandeja: actualizada });
}
