import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, noEncontrado, resolveHarness } from "@/lib/notas/trabajo";

// POST: el carril sube lo que la sesión va escribiendo.
//
// Va por trozos y no de una: la gracia es ver la respuesta aparecer mientras se
// escribe, como en una consola de verdad. Cada trozo se apendea al mismo
// mensaje, que queda `parcial` hasta que llega el que dice `fin`.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const body = await request.json().catch(() => null);
  const sesionId = typeof body?.sesionId === "string" ? body.sesionId : "";
  if (!sesionId) return NextResponse.json({ error: "Falta la sesión" }, { status: 400 });

  const sesion = await prisma.consolaSesion.findUnique({ where: { id: sesionId } });
  if (!sesion || sesion.deviceId !== deviceId) return noEncontrado();

  const texto = typeof body?.texto === "string" ? body.texto : "";
  const fin = body?.fin === true;
  const error = typeof body?.error === "string" ? body.error : null;
  const imagenes: string[] = Array.isArray(body?.imagenes)
    ? body.imagenes.filter((i: unknown) => typeof i === "string")
    : [];

  const abierto = await prisma.consolaMensaje.findFirst({
    where: { sesionId, rol: "asistente", parcial: true },
    orderBy: { createdAt: "desc" },
  });

  if (abierto) {
    await prisma.consolaMensaje.update({
      where: { id: abierto.id },
      data: {
        texto: abierto.texto + texto,
        parcial: !fin,
        ...(imagenes.length > 0 ? { imagenes: [...abierto.imagenes, ...imagenes] } : {}),
      },
    });
  } else if (texto || fin || imagenes.length > 0) {
    await prisma.consolaMensaje.create({
      data: { sesionId, rol: "asistente", texto, parcial: !fin, imagenes },
    });
  }

  if (fin || error) {
    await prisma.consolaSesion.update({
      where: { id: sesionId },
      data: { estado: error ? "error" : "idle", error },
    });
  }

  return NextResponse.json({ ok: true });
}
