import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// POST: los informes que quedaron tomados vuelven a estar disponibles.
//
// Lo llama el runner al arrancar. Un carril que muere entre el "bajar" y el fin
// de la sesión —el vigía lo dio por colgado, se cortó la luz— deja su pedido en
// "analizando", y sin esto hay que esperar los 70 minutos del vencimiento
// aunque el carril ya esté de vuelta en pie diez segundos después.
//
// Es el mismo remedio que `cola/recuperar` para los ítems de trabajo, por el
// mismo motivo.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const tomados = await prisma.trabajoPedidoArchivo.findMany({
    where: { deviceId, estado: "analizando" },
    select: { id: true, nombre: true },
  });
  if (tomados.length === 0) return NextResponse.json({ recuperados: 0, nombres: [] });

  await prisma.trabajoPedidoArchivo.updateMany({
    where: { id: { in: tomados.map((t) => t.id) } },
    data: { estado: "pendiente" },
  });

  return NextResponse.json({ recuperados: tomados.length, nombres: tomados.map((t) => t.nombre) });
}
