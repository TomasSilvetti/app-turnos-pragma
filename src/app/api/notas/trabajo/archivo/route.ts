import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// Un archivo de la notebook mandado a itemizar.
//
// Lo encola la CONSOLA, no el navegador: la sesión que corre en la máquina es la
// que puede resolver la mención "@carpeta\archivo.html" a una ruta de verdad y
// verificar que existe. Acá sólo queda anotado el puntero — el contenido nunca
// viaja, ni al encolar ni después.
//
// El navegador también puede llamar (para reintentar uno que falló desde el
// celular), y por eso se aceptan las dos credenciales.
async function quien(request: NextRequest): Promise<string | null> {
  return (await resolveHarness(request)) ?? (await resolveDeviceId(request));
}

// El nombre para mostrar: la ruta entera no entra en la pantalla de un celular.
function nombreDe(ruta: string): string {
  const partes = ruta.split(/[\\/]/).filter(Boolean);
  return partes[partes.length - 1] || ruta;
}

// GET: los pedidos recientes, para la pantalla de propuestos.
export async function GET(request: NextRequest) {
  const deviceId = await quien(request);
  if (!deviceId) return noAutorizado();

  const pedidos = await prisma.trabajoPedidoArchivo.findMany({
    where: { deviceId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true, ruta: true, nombre: true, alcance: true, estado: true,
      error: true, itemsCreados: true, pedidoEn: true, createdAt: true, updatedAt: true,
    },
  });
  return NextResponse.json({ pedidos });
}

// POST: encola el pedido. No lo hace acá — lo hace el harness con el OAuth de
// las cuentas, igual que la bandeja: el runner lo toma en su próxima vuelta.
export async function POST(request: NextRequest) {
  const deviceId = await quien(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  const ruta = typeof body?.ruta === "string" ? body.ruta.trim() : "";
  const alcance = typeof body?.alcance === "string" ? body.alcance.trim().slice(0, 500) : "";
  if (!ruta) return NextResponse.json({ error: "Falta la ruta del archivo" }, { status: 400 });

  // Mandar dos veces el mismo archivo mientras el primero espera no encola dos:
  // desde el celular es fácil repetir el mensaje cuando la respuesta tarda, y
  // dos pedidos iguales son dos sesiones haciendo el mismo trabajo con dos
  // cuentas distintas.
  const enCurso = await prisma.trabajoPedidoArchivo.findFirst({
    where: { deviceId, ruta, estado: { in: ["pendiente", "analizando"] } },
  });
  if (enCurso) {
    return NextResponse.json({ pedido: enCurso, repetido: true });
  }

  const pedido = await prisma.trabajoPedidoArchivo.create({
    data: { deviceId, ruta, nombre: nombreDe(ruta), alcance, estado: "pendiente" },
  });
  return NextResponse.json({ pedido }, { status: 201 });
}
