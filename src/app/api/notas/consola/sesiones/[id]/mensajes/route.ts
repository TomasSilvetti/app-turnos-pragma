import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveConsola, sesionDelDevice, sinPin } from "@/lib/notas/consola";
import { noEncontrado } from "@/lib/notas/trabajo";

// POST: mandás un prompt. No se ejecuta acá —esto corre en Vercel— sino que la
// sesión queda en "pendiente" y el carril de consola, que corre en la máquina,
// lo toma en su próxima vuelta.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const deviceId = await resolveConsola(request);
  if (!deviceId) return sinPin();
  const { id } = await ctx.params;

  const sesion = await sesionDelDevice(id, deviceId);
  if (!sesion) return noEncontrado();

  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) return NextResponse.json({ error: "Falta el texto" }, { status: 400 });

  const mensaje = await prisma.consolaMensaje.create({
    data: { sesionId: id, rol: "usuario", texto },
  });

  await prisma.consolaSesion.update({
    where: { id },
    data: {
      estado: "pendiente",
      error: null,
      // La primera línea de lo que escribiste sirve de título hasta que le
      // pongas otro: "Sin título" en una lista de diez no ayuda a nadie.
      ...(sesion.titulo ? {} : { titulo: texto.slice(0, 60) }),
    },
  });

  return NextResponse.json({ mensaje }, { status: 201 });
}
